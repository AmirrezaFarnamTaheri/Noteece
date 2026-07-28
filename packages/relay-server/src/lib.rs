use axum::{
    extract::{DefaultBodyLimit, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use core_rs::sync::relay::{BlindRelayServer, RelayEnvelope, RelayError};
use serde::Deserialize;
use std::sync::Arc;

/// Hard ceiling on how many messages a single fetch may drain.
const MAX_FETCH_LIMIT: usize = 100;

/// Maximum accepted request body (12 MiB): the 10 MiB ciphertext ceiling plus
/// JSON/base64 overhead. Prevents unbounded-body memory pressure.
const MAX_BODY_BYTES: usize = 12 * 1024 * 1024;

pub fn app() -> Router {
    app_with_state(Arc::new(BlindRelayServer::new()))
}

/// Build the router around an existing server handle so the binary can run the
/// expiry-cleanup task against the same state.
pub fn app_with_state(state: Arc<BlindRelayServer>) -> Router {
    Router::new()
        .route("/register/challenge", post(registration_challenge))
        .route("/register", post(register))
        .route("/send", post(send_message))
        .route("/fetch", get(fetch_messages))
        .route("/pending", get(check_pending))
        .route("/stats", get(get_stats))
        .layer(DefaultBodyLimit::max(MAX_BODY_BYTES))
        .with_state(state)
}

#[derive(Deserialize)]
struct RegistrationChallengePayload {
    device_id: String,
    public_key: String,
}

async fn registration_challenge(
    State(state): State<Arc<BlindRelayServer>>,
    Json(payload): Json<RegistrationChallengePayload>,
) -> impl IntoResponse {
    match state.begin_registration(&payload.device_id, &payload.public_key) {
        Ok(challenge) => (
            StatusCode::OK,
            Json(serde_json::json!({ "challenge": challenge })),
        ),
        Err(error) => relay_error_response(error),
    }
}

#[derive(Deserialize)]
struct RegisterPayload {
    device_id: String,
    public_key: String,
    challenge: String,
    signature: String,
}

async fn register(
    State(state): State<Arc<BlindRelayServer>>,
    Json(payload): Json<RegisterPayload>,
) -> impl IntoResponse {
    match state.complete_registration(
        &payload.device_id,
        &payload.public_key,
        &payload.challenge,
        &payload.signature,
    ) {
        Ok((token, expires_at)) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "token": token,
                "expires_at": expires_at,
            })),
        ),
        Err(error) => relay_error_response(error),
    }
}

/// Extract a token only from the exact `Authorization: Bearer <token>` scheme.
fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .map(str::trim)
        .filter(|value| !value.is_empty() && !value.starts_with("Bearer "))
}

async fn send_message(
    State(state): State<Arc<BlindRelayServer>>,
    headers: HeaderMap,
    Json(envelope): Json<RelayEnvelope>,
) -> impl IntoResponse {
    let Some(token) = bearer_token(&headers) else {
        return unauthorized_response();
    };

    match state.submit_message_authorized(token, envelope) {
        Ok(id) => (StatusCode::OK, Json(serde_json::json!({ "id": id }))),
        Err(RelayError::InvalidToken | RelayError::AuthenticationRequired) => {
            unauthorized_response()
        }
        Err(error) => relay_error_response(error),
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
    match bearer_token(&headers) {
        Some(token) if state.verify_token(&query.device_id, token) => {
            let limit = query.limit.unwrap_or(10).min(MAX_FETCH_LIMIT);
            let messages = state.fetch_messages(&query.device_id, limit);
            (StatusCode::OK, Json(serde_json::json!(messages)))
        }
        _ => unauthorized_response(),
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
        Some(token) if state.verify_token(&query.device_id, token) => {
            let count = state.pending_count(&query.device_id);
            (StatusCode::OK, Json(serde_json::json!({ "count": count })))
        }
        _ => unauthorized_response(),
    }
}

async fn get_stats(State(state): State<Arc<BlindRelayServer>>) -> impl IntoResponse {
    Json(state.stats())
}

fn unauthorized_response() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::UNAUTHORIZED,
        Json(serde_json::json!({ "error": "invalid or missing token" })),
    )
}

fn relay_error_response(error: RelayError) -> (StatusCode, Json<serde_json::Value>) {
    let status = match error {
        RelayError::AuthenticationRequired | RelayError::InvalidToken => StatusCode::UNAUTHORIZED,
        RelayError::DeviceNotRegistered => StatusCode::NOT_FOUND,
        RelayError::AtCapacity | RelayError::TooManyPending => StatusCode::TOO_MANY_REQUESTS,
        RelayError::EncryptionError(_) | RelayError::NetworkError(_) => {
            StatusCode::INTERNAL_SERVER_ERROR
        }
        RelayError::MessageTooLarge
        | RelayError::MessageExpired
        | RelayError::InvalidSignature
        | RelayError::InvalidRegistrationChallenge
        | RelayError::InvalidEnvelope(_) => StatusCode::BAD_REQUEST,
    };

    (status, Json(serde_json::json!({ "error": error.to_string() })))
}
