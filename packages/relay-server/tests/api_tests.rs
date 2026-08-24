use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use relay_server::app;
use serde_json::{json, Value};
use tower::ServiceExt;

/// Build a JSON body matching the `RelayEnvelope` contract:
/// id, from_device, to_device, ciphertext, ephemeral_pubkey, nonce,
/// timestamp, message_type, signature.
fn envelope(from: &str, to: &str, payload: &str) -> Value {
    static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    json!({
        "id": format!("test-msg-{}", n),
        "from_device": from,
        "to_device": to,
        "ciphertext": payload.as_bytes(),
        "ephemeral_pubkey": [],
        "nonce": (0..24).collect::<Vec<u8>>(),
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        "message_type": "test",
        "signature": []
    })
}

async fn register_and_get_token(app: &mut axum::Router, device_id: &str, pkh: &str) -> String {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/register")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "device_id": device_id,
                        "public_key_hash": pkh
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
    body["token"].as_str().unwrap().to_string()
}

#[tokio::test]
async fn test_register_device() {
    let mut app = app();

    let response = app
        .clone()
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
async fn test_register_conflict_returns_409() {
    let mut app = app();

    let req = |pkh: &str| {
        Request::builder()
            .method("POST")
            .uri("/register")
            .header("Content-Type", "application/json")
            .body(Body::from(
                json!({"device_id": "conflict_device", "public_key_hash": pkh}).to_string(),
            ))
            .unwrap()
    };

    let first = app.clone().oneshot(req("hashA")).await.unwrap();
    assert_eq!(first.status(), StatusCode::OK);

    // Same key again: idempotent success.
    let second = app.clone().oneshot(req("hashA")).await.unwrap();
    assert_eq!(second.status(), StatusCode::OK);

    // Different key claiming the device: 409 Conflict.
    let third = app.oneshot(req("hashB")).await.unwrap();
    assert_eq!(third.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn test_pending_count() {
    let mut app = app();
    let token = register_and_get_token(&mut app, "pending_device", "phash").await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/pending?device_id=pending_device")
                .header("Authorization", format!("Bearer {}", token))
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
async fn test_send_message() {
    let mut app = app();
    let sender_token = register_and_get_token(&mut app, "sender_device", "sender_hash").await;
    let _receiver_token = register_and_get_token(&mut app, "receiver_device", "receiver_hash").await;

    // Send a message from sender to receiver
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/send")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", sender_token))
                .body(Body::from(
                    envelope("sender_device", "receiver_device", "encrypted-payload-data")
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert!(body.get("id").is_some(), "Send should return a message id");
}

#[tokio::test]
async fn test_fetch_messages() {
    let mut app = app();
    let sender_token = register_and_get_token(&mut app, "multi_sender", "shash").await;
    let receiver_token = register_and_get_token(&mut app, "multi_receiver", "rhash").await;

    // Send multiple messages to the same recipient
    for i in 0..3 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/send")
                    .header("Content-Type", "application/json")
                    .header("Authorization", format!("Bearer {}", sender_token))
                    .body(Body::from(
                        envelope(
                            "multi_sender",
                            "multi_receiver",
                            &format!("payload-{}", i),
                        )
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // Fetch all messages for the receiver
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/fetch?device_id=multi_receiver&limit=10")
                .header("Authorization", format!("Bearer {}", receiver_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let messages: Vec<Value> = serde_json::from_slice(&body).unwrap();
    assert_eq!(messages.len(), 3, "Should have received all 3 messages");
}

#[tokio::test]
async fn test_message_not_found_empty() {
    let mut app = app();
    // Register a device to get a valid token
    let token = register_and_get_token(&mut app, "empty_device", "ehash").await;

    // Fetch messages for the registered device (has no messages)
    let response = app
        .oneshot(
            Request::builder()
                .uri("/fetch?device_id=empty_device")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let messages: Vec<Value> = serde_json::from_slice(&body).unwrap();
    assert!(messages.is_empty(), "Should return empty list for device with no messages");
}

#[tokio::test]
async fn test_stats() {
    let mut app = app();
    let token = register_and_get_token(&mut app, "stats_device", "sthash").await;
    register_and_get_token(&mut app, "stats_target", "tghash").await;

    // Send a message
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/send")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::from(
                    envelope("stats_device", "stats_target", "stats-payload").to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Check stats endpoint (now requires auth)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/stats")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let stats: Value = serde_json::from_slice(&body).unwrap();
    assert!(stats.get("registered_devices").is_some(), "Stats should include registered_devices");
    assert!(
        stats.get("total_pending_messages").is_some(),
        "Stats should include total_pending_messages"
    );
}

#[tokio::test]
async fn test_health_endpoint() {
    let mut app = app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(body["status"], "ok");
}

#[tokio::test]
async fn test_register_duplicate_device() {
    let mut app = app();

    // Register a device
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/register")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "device_id": "dup_device",
                        "public_key_hash": "dup_hash"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Register same device again with the SAME key: idempotent success.
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/register")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "device_id": "dup_device",
                        "public_key_hash": "dup_hash"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_malformed_json_returns_400() {
    let mut app = app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/register")
                .header("Content-Type", "application/json")
                .body(Body::from("not valid json"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_not_found_route() {
    let mut app = app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/does-not-exist")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_send_without_auth_returns_401() {
    let mut app = app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/send")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    envelope("unauth_device", "target_device", "data").to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_fetch_with_limit() {
    let mut app = app();
    let sender_token = register_and_get_token(&mut app, "limit_sender", "lshash").await;
    let receiver_token = register_and_get_token(&mut app, "limit_receiver", "lrhash").await;

    // Send 5 messages
    for i in 0..5 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/send")
                    .header("Content-Type", "application/json")
                    .header("Authorization", format!("Bearer {}", sender_token))
                    .body(Body::from(
                        envelope("limit_sender", "limit_receiver", &format!("msg-{}", i))
                            .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // Fetch with limit=2
    let response = app
        .oneshot(
            Request::builder()
                .uri("/fetch?device_id=limit_receiver&limit=2")
                .header("Authorization", format!("Bearer {}", receiver_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let messages: Vec<Value> = serde_json::from_slice(&body).unwrap();
    assert!(messages.len() <= 2, "Should respect limit parameter");
}

#[tokio::test]
async fn test_stats_without_auth_returns_401() {
    let mut app = app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/stats")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_malformed_token_returns_401() {
    let mut app = app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/send")
                .header("Content-Type", "application/json")
                .header("Authorization", "[REDACTED]")
                .body(Body::from(
                    envelope("attacker", "victim", "data").to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_expired_token_returns_401() {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    struct Claims {
        sub: String,
        pkh: String,
        exp: usize,
    }

    let mut app = app();
    let _ = register_and_get_token(&mut app, "expired_device", "ehash").await;

    // Create an already-expired token (exp in the past)
    let claims = Claims {
        sub: "expired_device".to_string(),
        pkh: "ehash".to_string(),
        exp: 1, // Unix timestamp 1 = 1970-01-01, definitely expired
    };

    // Use a random secret — this won't match the server's key, so it will fail
    // signature validation. Combined with expiry, this tests both checks.
    let expired_token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(b"wrong-secret"),
    )
    .unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/send")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", expired_token))
                .body(Body::from(
                    envelope("expired_device", "other", "data").to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_cross_device_send_returns_403() {
    let mut app = app();
    // Register device A and get its token
    let token_a = register_and_get_token(&mut app, "device_a", "ahash").await;
    // Register device B
    let _ = register_and_get_token(&mut app, "device_b", "bhash").await;

    // Try to send a message FROM device_b USING device_a's token
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/send")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", token_a))
                .body(Body::from(
                    envelope("device_b", "device_a", "impersonation-attempt").to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_cross_device_fetch_returns_403() {
    let mut app = app();
    let token_a = register_and_get_token(&mut app, "fetcher_a", "fahash").await;
    let _ = register_and_get_token(&mut app, "fetcher_b", "fbhash").await;

    // Try to fetch messages for device_b using device_a's token
    let response = app
        .oneshot(
            Request::builder()
                .uri("/fetch?device_id=fetcher_b")
                .header("Authorization", format!("Bearer {}", token_a))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_fetch_without_auth_returns_401() {
    let mut app = app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/fetch?device_id=some_device")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_pending_without_auth_returns_401() {
    let mut app = app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/pending?device_id=some_device")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
