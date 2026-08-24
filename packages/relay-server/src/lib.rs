use axum::{
    extract::{FromRequestParts, Query, State},
    http::{request::Parts, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    RequestPartsExt, Router,
};
use axum::async_trait;
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use core_rs::sync::relay::{BlindRelayServer, RelayEnvelope, RelayError};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use tower_http::cors::CorsLayer;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;
use tracing::{info, warn};

/// Start time of the server (for uptime calculation)
static START_TIME: OnceLock<Instant> = OnceLock::new();

/// Total requests served since server start
static TOTAL_REQUESTS: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub pkh: String,
    pub exp: usize,
}

struct Keys {
    encoding: EncodingKey,
    decoding: DecodingKey,
}

impl Keys {
    fn new(secret: &[u8]) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret),
            decoding: DecodingKey::from_secret(secret),
        }
    }
}

static KEYS: OnceLock<Keys> = OnceLock::new();

/// Sliding-window rate limiter keyed by an arbitrary string (device id or
/// endpoint name). Clone-safe: state lives behind an Arc, so instances can be
/// shared by value inside router layers/handlers.
#[derive(Clone)]
struct Limiter {
    inner: Arc<Mutex<HashMap<String, VecDeque<std::time::Instant>>>>,
    max_events: usize,
    window: Duration,
}

impl Limiter {
    fn new(max_events: usize, window: Duration) -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
            max_events,
            window,
        }
    }

    /// Record one event for `key`; returns false when over the window budget.
    fn check(&self, key: &str) -> bool {
        let now = std::time::Instant::now();
        let mut map = match self.inner.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };
        let queue = map.entry(key.to_string()).or_default();
        while let Some(front) = queue.front() {
            if now.duration_since(*front) > self.window {
                queue.pop_front();
            } else {
                break;
            }
        }
        if queue.len() >= self.max_events {
            false
        } else {
            queue.push_back(now);
            true
        }
    }
}

/// Registration is unauthenticated, so throttle it globally and strictly.
static REGISTER_LIMITER: OnceLock<Limiter> = OnceLock::new();
fn register_limiter() -> &'static Limiter {
    REGISTER_LIMITER.get_or_init(|| Limiter::new(60, Duration::from_secs(1)))
}

/// Authenticated device endpoints get a generous per-device budget.
static DEVICE_LIMITER: OnceLock<Limiter> = OnceLock::new();
fn device_limiter() -> &'static Limiter {
    DEVICE_LIMITER.get_or_init(|| Limiter::new(300, Duration::from_secs(1)))
}

fn get_keys() -> &'static Keys {
    KEYS.get_or_init(|| {
        match std::env::var("RELAY_JWT_SECRET") {
            Ok(secret) if !secret.trim().is_empty() => Keys::new(secret.as_bytes()),
            _ => {
                // Production deployments MUST pin the secret; a per-boot random
                // secret invalidates every token on restart and breaks multi-
                // instance deployments silently.
                if std::env::var("RELAY_ENV").as_deref() == Ok("production") {
                    panic!("RELAY_JWT_SECRET must be set when RELAY_ENV=production");
                }
                tracing::warn!(
                    "RELAY_JWT_SECRET not set; generating an ephemeral secret (dev only)"
                );
                let bytes: [u8; 32] = rand::random();
                let secret: String = bytes.iter().map(|b| format!("{:02x}", b)).collect();
                Keys::new(secret.as_bytes())
            }
        }
    })
}

#[async_trait]
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| StatusCode::UNAUTHORIZED)?;

        let token_data =
            decode::<Claims>(bearer.token(), &get_keys().decoding, &Validation::default())
                .map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(token_data.claims)
    }
}

/// Request ID header name used throughout the application
const X_REQUEST_ID: &str = "x-request-id";

/// Middleware that logs each request's method, path, status code, and duration.
/// Also increments the global request counter.
async fn request_logging_middleware(request: axum::extract::Request, next: Next) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let start = Instant::now();

    let request_id = request
        .headers()
        .get(X_REQUEST_ID)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    let response = next.run(request).await;
    let duration = start.elapsed();
    let status = response.status();

    TOTAL_REQUESTS.fetch_add(1, Ordering::Relaxed);

    info!(
        request_id = %request_id,
        method = %method,
        path = %uri,
        status = status.as_u16(),
        duration_ms = duration.as_millis() as u64,
        "request completed"
    );

    response
}

/// Attach request ID to response headers if not already present
async fn request_id_response_middleware(request: axum::extract::Request, next: Next) -> Response {
    let request_id = request.headers().get(X_REQUEST_ID).cloned();
    let mut response = next.run(request).await;
    if let Some(id) = request_id {
        response.headers_mut().insert(X_REQUEST_ID, id);
    }
    response
}

/// Build the relay router with its own fresh in-memory state (dev/test helper).
pub fn app() -> Router {
    app_with_state(Arc::new(BlindRelayServer::new()))
}

/// Build the relay router bound to a caller-owned shared state, so the binary
/// can run background maintenance tasks against the same queues.
pub fn app_with_state(state: Arc<BlindRelayServer>) -> Router {

    // Initialize start time for uptime tracking
    START_TIME.get_or_init(Instant::now);

    Router::new()
        .route("/health", get(health_check))
        .route("/register", post(register))
        .route("/send", post(send_message))
        .route("/fetch", get(fetch_messages))
        .route("/pending", get(check_pending))
        .route("/stats", get(get_stats))
        .route("/metrics", get(metrics_endpoint))
        .layer(CorsLayer::permissive())

        // Request ID middleware: generate UUID per request and propagate through headers
        .layer(SetRequestIdLayer::new(
            X_REQUEST_ID.parse().unwrap(),
            MakeRequestUuid,
        ))
        .layer(PropagateRequestIdLayer::new(X_REQUEST_ID.parse().unwrap()))
        .layer(TraceLayer::new_for_http())
        .layer(middleware::from_fn(request_logging_middleware))
        .layer(middleware::from_fn(request_id_response_middleware))
        .with_state(state)
}

async fn health_check(State(state): State<Arc<BlindRelayServer>>) -> impl IntoResponse {
    let stats = state.stats();
    let uptime_secs = START_TIME.get().map(|t| t.elapsed().as_secs()).unwrap_or(0);

    info!(component = "health", "health check passed");
    // NOTE: state is in-memory by design; persistence is tracked separately.
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "ok",
            "checks": {
                "accepting_connections": true,
                "in_memory_state": true,
            },
            "registered_devices": stats.registered_devices,
            "total_pending_messages": stats.total_pending_messages,
            "uptime_seconds": uptime_secs,
        })),
    )
}

#[derive(Deserialize)]
struct RegisterPayload {
    device_id: String,
    public_key_hash: String,
}

#[derive(Deserialize)]
struct FetchQuery {
    device_id: String,
    limit: Option<usize>,
}

#[derive(Deserialize)]
struct PendingQuery {
    device_id: String,
}

async fn register(
    State(state): State<Arc<BlindRelayServer>>,
    Json(payload): Json<RegisterPayload>,
) -> impl IntoResponse {
    // Destructure once so every match arm owns its values (no partial moves).
    let RegisterPayload {
        device_id,
        public_key_hash,
    } = payload;
    if !register_limiter().check("register") {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({ "error": "Too many registrations, slow down" })),
        );
    }
    match state.register_device(&device_id, &public_key_hash) {
        Ok(()) => {
            let exp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as usize
                + 86400;

            let claims = Claims {
                sub: device_id.clone(),
                pkh: public_key_hash,
                exp,
            };

            match encode(&Header::default(), &claims, &get_keys().encoding) {
                Ok(token) => {
                    info!(
                        device_id = %device_id,
                        "device registered successfully"
                    );
                    (StatusCode::OK, Json(serde_json::json!({ "token": token })))
                }
                Err(e) => {
                    tracing::error!(
                        device_id = %device_id,
                        error = %e,
                        "failed to generate JWT token"
                    );
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({ "error": "Failed to generate token" })),
                    )
                }
            }
        }
        Err(RelayError::DeviceConflict) => {
            warn!(
                device_id = %device_id,
                "device registration rejected: identity conflict"
            );
            (
                StatusCode::CONFLICT,
                Json(serde_json::json!({
                    "error": "Device already registered with a different key"
                })),
            )
        }
        Err(e) => {
            warn!(
                device_id = %device_id,
                error = %e,
                "device registration failed"
            );
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
        }
    }
}

async fn send_message(
    State(state): State<Arc<BlindRelayServer>>,
    claims: Claims,
    Json(envelope): Json<RelayEnvelope>,
) -> (StatusCode, Json<serde_json::Value>) {
    if !device_limiter().check(&claims.sub) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({ "error": "Rate limit exceeded" })),
        );
    }
    if claims.sub != envelope.from_device {
        warn!(
            device_id = %claims.sub,
            from_device = %envelope.from_device,
            "send rejected: token does not match sender"
        );
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "Token does not match sender" })),
        );
    }

    match state.submit_message(envelope.clone()) {
        Ok(id) => {
            info!(
                message_id = %id,
                from_device = %envelope.from_device,
                to_device = %envelope.to_device,
                "message sent successfully"
            );
            (StatusCode::OK, Json(serde_json::json!({ "id": id })))
        }
        Err(e) => {
            warn!(
                from_device = %envelope.from_device,
                to_device = %envelope.to_device,
                error = %e,
                "message send failed"
            );
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
        }
    }
}

async fn fetch_messages(
    State(state): State<Arc<BlindRelayServer>>,
    claims: Claims,
    Query(query): Query<FetchQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    if !device_limiter().check(&claims.sub) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({ "error": "Rate limit exceeded" })),
        );
    }
    if claims.sub != query.device_id {
        warn!(
            device_id = %query.device_id,
            "fetch rejected: unauthorized"
        );
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "Unauthorized" })),
        );
    }

    let limit = query.limit.unwrap_or(10);
    let messages = state.fetch_messages(&query.device_id, limit);
    let count = messages.len();
    info!(
        device_id = %query.device_id,
        message_count = count,
        "messages fetched"
    );
    (StatusCode::OK, Json(serde_json::json!(messages)))
}

async fn check_pending(
    State(state): State<Arc<BlindRelayServer>>,
    claims: Claims,
    Query(query): Query<PendingQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    if !device_limiter().check(&claims.sub) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({ "error": "Rate limit exceeded" })),
        );
    }
    if claims.sub != query.device_id {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "Unauthorized" })),
        );
    }

    let count = state.pending_count(&query.device_id);
    (StatusCode::OK, Json(serde_json::json!({ "count": count })))
}

async fn get_stats(
    _claims: Claims,
    State(state): State<Arc<BlindRelayServer>>,
) -> impl IntoResponse {
    let stats = state.stats();
    Json(stats)
}

/// Metrics endpoint exposing operational data for monitoring.
/// Requires a valid device JWT (same as /stats) to prevent unauthenticated
/// scraping of operational metadata (device counts, queue depth, uptime).
async fn metrics_endpoint(
    _claims: Claims,
    State(state): State<Arc<BlindRelayServer>>,
) -> impl IntoResponse {
    let stats = state.stats();
    let total_requests = TOTAL_REQUESTS.load(Ordering::Relaxed);
    let uptime_secs = START_TIME.get().map(|t| t.elapsed().as_secs()).unwrap_or(0);

    Json(serde_json::json!({
        "total_requests_served": total_requests,
        "active_device_count": stats.registered_devices,
        "message_queue_depth": stats.total_pending_messages,
        "uptime_seconds": uptime_secs,
    }))
}
