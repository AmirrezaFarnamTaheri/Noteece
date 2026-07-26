use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt; // for collecting body
use relay_server::app;
use serde_json::{json, Value};
use tower::ServiceExt; // for one-shot

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

#[tokio::test]
async fn test_register_returns_real_token() {
    let (status, body) = register(app(), "test_device").await;
    assert_eq!(status, StatusCode::OK);
    // The token must be a real, non-empty string (regression for the null-token bug).
    let token = body.get("token").and_then(|t| t.as_str());
    assert!(token.is_some(), "token must be a string");
    assert!(!token.unwrap().is_empty(), "token must not be empty");
}

#[tokio::test]
async fn test_pending_requires_token() {
    let app = app();

    // Register to obtain a token.
    let (_s, body) = register(app.clone(), "test_device").await;
    let token = body["token"].as_str().unwrap().to_string();

    // Authorized request succeeds and reports zero pending.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/pending?device_id=test_device")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(body["count"], 0);
}

#[tokio::test]
async fn test_fetch_without_token_is_unauthorized() {
    // Draining a mailbox without presenting the device's token must be rejected.
    let app = app();
    let (_s, _b) = register(app.clone(), "victim_device").await;

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
    let (_s, _b) = register(app.clone(), "victim_device").await;

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
