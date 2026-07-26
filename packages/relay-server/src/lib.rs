use axum::{
    extract::{DefaultBodyLimit, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use core_rs::sync::relay::{BlindRelayServer, RelayEnvelope};
use serde::Deserialize;
use std::sync::Arc;

/// Hard ceiling on how many messages a single fetch may drain.
const MAX_FETCH_LIMIT: usize = 100;

/// Maximum accepted request body (12 MB): the 10 MB ciphertext ceiling plus
/// JSON/base64 overhead. Prevents unbounded-body memory pressure.
const MAX_BODY_BYTES: usize = 12 * 1024 * 1024;

pub fn app() -> Router {
    let state = Arc::new(BlindRelayServer::new());
    app_with_state(state)
}

/// Build the router around an existing server handle (lets `main` also drive the
/// background expiry-cleanup task against the same state).
pub fn app_with_state(state: Arc<BlindRelayServer>) -> Router {
    Router::new()
        .route("/register", post(register))
        .route("/send", post(send_message))
        .route("/fetch", get(fetch_messages))
        .route("/pending", get(check_pending))
        .route("/stats", get(get_stats))
        .layer(DefaultBodyLimit::max(MAX_BODY_BYTES))
        .with_state(state)
}

#[derive(Deserialize)]
struct RegisterPayload {
    device_id: String,
    public_key_hash: String,
}

async fn register(
    State(state): State<Arc<BlindRelayServer>>,
    Json(payload): Json<RegisterPayload>,
) -> impl IntoResponse {
    // Register, then mint a real capability token bound to the device. The token
    // must be presented to read that device's mailbox (see fetch/pending).
    match state.register_device(&payload.device_id, &payload.public_key_hash) {
        Ok(()) => match state.issue_token(&payload.device_id) {
            Ok(token) => (StatusCode::OK, Json(serde_json::json!({ "token": token }))),
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            ),
        },
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// Extract a bearer token from the `Authorization: Bearer <token>` header.
fn bearer_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim_start_matches("Bearer ").trim().to_string())
        .filter(|s| !s.is_empty())
}

async fn send_message(
    State(state): State<Arc<BlindRelayServer>>,
    Json(envelope): Json<RelayEnvelope>,
) -> impl IntoResponse {
    match state.submit_message(envelope) {
        Ok(id) => (StatusCode::OK, Json(serde_json::json!({ "id": id }))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

#[derive(Deserialize)]
struct FetchQuery {
    device_id: String,
    limit: Option<usize>,
}

async fn fetch_messages(
    State(state): State<Arc<BlindRelayServer>>,
    headers: HeaderMap,
    Query(query): Query<FetchQuery>,
) -> impl IntoResponse {
    // Require a valid capability token for this device before draining its mailbox.
    // Without this, any caller could steal and delete another device's messages.
    match bearer_token(&headers) {
        Some(token) if state.verify_token(&query.device_id, &token) => {
            let limit = query.limit.unwrap_or(10).min(MAX_FETCH_LIMIT);
            let messages = state.fetch_messages(&query.device_id, limit);
            (StatusCode::OK, Json(serde_json::json!(messages)))
        }
        _ => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "invalid or missing token" })),
        ),
    }
}

#[derive(Deserialize)]
struct PendingQuery {
    device_id: String,
}

async fn check_pending(
    State(state): State<Arc<BlindRelayServer>>,
    headers: HeaderMap,
    Query(query): Query<PendingQuery>,
) -> impl IntoResponse {
    match bearer_token(&headers) {
        Some(token) if state.verify_token(&query.device_id, &token) => {
            let count = state.pending_count(&query.device_id);
            (StatusCode::OK, Json(serde_json::json!({ "count": count })))
        }
        _ => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "invalid or missing token" })),
        ),
    }
}

async fn get_stats(State(state): State<Arc<BlindRelayServer>>) -> impl IntoResponse {
    let stats = state.stats();
    Json(stats)
}
