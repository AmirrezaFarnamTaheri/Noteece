use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt; // for collecting body
use relay_server::app;
use serde_json::{json, Value};
use tower::ServiceExt; // for one-shot

#[tokio::test]
async fn test_register_device() {
    let app = app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/register")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "device_id": "test_device",
                        "public_key_hash": "hash123"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert!(body.get("token").is_some());
}

#[tokio::test]
async fn test_pending_count() {
    let app = app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/pending?device_id=test_device")
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
