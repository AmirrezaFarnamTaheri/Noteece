use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use core_rs::sync::relay::{BlindRelayServer, RelayEnvelope};
use serde::Deserialize;
use std::sync::Arc;

pub fn app() -> Router {
    let state = Arc::new(BlindRelayServer::new());

    Router::new()
        .route("/register", post(register))
        .route("/send", post(send_message))
        .route("/fetch", get(fetch_messages))
        .route("/pending", get(check_pending))
        .route("/stats", get(get_stats))
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
    match state.register_device(&payload.device_id, &payload.public_key_hash) {
        Ok(token) => (StatusCode::OK, Json(serde_json::json!({ "token": token }))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

async fn send_message(
    State(state): State<Arc<BlindRelayServer>>,
    headers: HeaderMap,
    Json(envelope): Json<RelayEnvelope>,
) -> impl IntoResponse {
    if let Some(auth) = headers.get("Authorization") {
        if let Ok(token) = auth.to_str() {
            let _token = token.trim_start_matches("Bearer ");
        }
    }

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
    Query(query): Query<FetchQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(10);
    let messages = state.fetch_messages(&query.device_id, limit);
    Json(messages)
}

#[derive(Deserialize)]
struct PendingQuery {
    device_id: String,
}

async fn check_pending(
    State(state): State<Arc<BlindRelayServer>>,
    Query(query): Query<PendingQuery>,
) -> impl IntoResponse {
    let count = state.pending_count(&query.device_id);
    Json(serde_json::json!({ "count": count }))
}

async fn get_stats(State(state): State<Arc<BlindRelayServer>>) -> impl IntoResponse {
    let stats = state.stats();
    Json(stats)
}
