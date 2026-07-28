use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use relay_server::app;
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

async fn register(app: axum::Router, device_id: &str) -> (StatusCode, Value) {
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/register")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({ "device_id": device_id, "public_key_hash": "hash123" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    (status, body)
}

fn valid_envelope(timestamp: u64) -> Value {
    json!({
        "id": "01JTESTRELAYENVELOPE00000000",
        "from_device": "sender_device",
        "to_device": "recipient_device",
        "ciphertext": [1, 2, 3],
        "ephemeral_pubkey": [4, 5, 6],
        "nonce": [7, 8, 9],
        "timestamp": timestamp,
        "message_type": "sync_delta",
        "signature": [10, 11, 12]
    })
}

async fn post_json(app: axum::Router, uri: &str, payload: Value) -> StatusCode {
    app.oneshot(
        Request::builder()
            .method("POST")
            .uri(uri)
            .header("Content-Type", "application/json")
            .body(Body::from(payload.to_string()))
            .unwrap(),
    )
    .await
    .unwrap()
    .status()
}

#[tokio::test]
async fn test_register_returns_real_token() {
    let (status, body) = register(app(), "test_device").await;
    assert_eq!(status, StatusCode::OK);

    let token = body.get("token").and_then(Value::as_str);
    assert!(token.is_some(), "token must be a string");
    assert!(!token.unwrap().is_empty(), "token must not be empty");
}

#[tokio::test]
async fn test_pending_rejects_missing_token_and_accepts_valid_token() {
    let app = app();
    let (_status, body) = register(app.clone(), "test_device").await;
    let token = body["token"].as_str().unwrap().to_string();

    let unauthorized = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/pending?device_id=test_device")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(unauthorized.status(), StatusCode::UNAUTHORIZED);

    let authorized = app
        .oneshot(
            Request::builder()
                .uri("/pending?device_id=test_device")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(authorized.status(), StatusCode::OK);

    let body = authorized.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(body["count"], 0);
}

#[tokio::test]
async fn test_fetch_without_token_is_unauthorized() {
    let app = app();
    let (_status, _body) = register(app.clone(), "victim_device").await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/fetch?device_id=victim_device")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_fetch_with_wrong_token_is_unauthorized() {
    let app = app();
    let (_status, _body) = register(app.clone(), "victim_device").await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/fetch?device_id=victim_device")
                .header("Authorization", "Bearer not-the-real-token")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_send_rejects_oversized_small_binary_fields() {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let mut envelope = valid_envelope(now);
    envelope["ephemeral_pubkey"] = json!(vec![0_u8; 4097]);

    assert_eq!(
        post_json(app(), "/send", envelope).await,
        StatusCode::BAD_REQUEST
    );
}

#[tokio::test]
async fn test_send_rejects_timestamp_beyond_allowed_clock_skew() {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let envelope = valid_envelope(now + 301);

    assert_eq!(
        post_json(app(), "/send", envelope).await,
        StatusCode::BAD_REQUEST
    );
}
