use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
    Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use core_rs::sync::relay::{registration_message, RelayEnvelope};
use ed25519_dalek::{Signer, SigningKey};
use http_body_util::BodyExt;
use relay_server::app;
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

fn signing_key(seed: u8) -> SigningKey {
    SigningKey::from_bytes(&[seed; 32])
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be after Unix epoch")
        .as_secs()
}

async fn request_json(
    app: Router,
    method: Method,
    uri: &str,
    payload: Option<Value>,
    token: Option<&str>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(method).uri(uri);
    if payload.is_some() {
        builder = builder.header("Content-Type", "application/json");
    }
    if let Some(token) = token {
        builder = builder.header("Authorization", format!("Bearer {token}"));
    }

    let body = payload
        .map(|value| Body::from(value.to_string()))
        .unwrap_or_else(Body::empty);
    let response = app
        .oneshot(builder.body(body).expect("request should be valid"))
        .await
        .expect("router should respond");
    let status = response.status();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("response body should be readable")
        .to_bytes();
    let value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("response should be JSON")
    };
    (status, value)
}

async fn begin_registration(app: Router, device_id: &str, key: &SigningKey) -> String {
    let public_key = BASE64.encode(key.verifying_key().to_bytes());
    let (status, body) = request_json(
        app,
        Method::POST,
        "/register/challenge",
        Some(json!({
            "device_id": device_id,
            "public_key": public_key,
        })),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    body["challenge"]
        .as_str()
        .expect("challenge must be a string")
        .to_string()
}

async fn register_device(app: Router, device_id: &str, key: &SigningKey) -> String {
    let public_key = BASE64.encode(key.verifying_key().to_bytes());
    let challenge = begin_registration(app.clone(), device_id, key).await;
    let signature = key.sign(registration_message(device_id, &challenge).as_bytes());
    let (status, body) = request_json(
        app,
        Method::POST,
        "/register",
        Some(json!({
            "device_id": device_id,
            "public_key": public_key,
            "challenge": challenge,
            "signature": BASE64.encode(signature.to_bytes()),
        })),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(body["expires_at"].as_u64().is_some());
    body["token"]
        .as_str()
        .expect("token must be a string")
        .to_string()
}

fn signed_envelope(
    from_device: &str,
    to_device: &str,
    key: &SigningKey,
) -> RelayEnvelope {
    let mut envelope = RelayEnvelope::new(
        from_device,
        to_device,
        vec![1, 2, 3],
        vec![4; 32],
        vec![5; 24],
        "sync_delta",
    );
    envelope.sign(key);
    envelope
}

#[tokio::test]
async fn challenge_registration_returns_a_real_token() {
    let router = app();
    let token = register_device(router.clone(), "device-a", &signing_key(1)).await;
    assert_eq!(token.len(), 64);
    assert!(token.bytes().all(|byte| byte.is_ascii_hexdigit()));

    let (status, body) = request_json(
        router,
        Method::GET,
        "/pending?device_id=device-a",
        None,
        Some(&token),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["count"], 0);
}

#[tokio::test]
async fn registration_rejects_an_invalid_signature() {
    let router = app();
    let key = signing_key(2);
    let attacker = signing_key(3);
    let challenge = begin_registration(router.clone(), "device-a", &key).await;
    let signature = attacker.sign(registration_message("device-a", &challenge).as_bytes());

    let (status, _) = request_json(
        router,
        Method::POST,
        "/register",
        Some(json!({
            "device_id": "device-a",
            "public_key": BASE64.encode(key.verifying_key().to_bytes()),
            "challenge": challenge,
            "signature": BASE64.encode(signature.to_bytes()),
        })),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn re_registration_rotates_the_capability_token() {
    let router = app();
    let key = signing_key(4);
    let old_token = register_device(router.clone(), "device-a", &key).await;
    let new_token = register_device(router.clone(), "device-a", &key).await;
    assert_ne!(old_token, new_token);

    let (old_status, _) = request_json(
        router.clone(),
        Method::GET,
        "/pending?device_id=device-a",
        None,
        Some(&old_token),
    )
    .await;
    assert_eq!(old_status, StatusCode::UNAUTHORIZED);

    let (new_status, _) = request_json(
        router,
        Method::GET,
        "/pending?device_id=device-a",
        None,
        Some(&new_token),
    )
    .await;
    assert_eq!(new_status, StatusCode::OK);
}

#[tokio::test]
async fn mailbox_routes_reject_missing_malformed_wrong_and_cross_device_tokens() {
    let router = app();
    let token_a = register_device(router.clone(), "device-a", &signing_key(5)).await;
    let token_b = register_device(router.clone(), "device-b", &signing_key(6)).await;

    for header in [None, Some("not-a-token"), Some("Bearer repeated")].into_iter() {
        let (status, _) = request_json(
            router.clone(),
            Method::GET,
            "/pending?device_id=device-a",
            None,
            header,
        )
        .await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    let (cross_status, _) = request_json(
        router.clone(),
        Method::GET,
        "/fetch?device_id=device-a",
        None,
        Some(&token_b),
    )
    .await;
    assert_eq!(cross_status, StatusCode::UNAUTHORIZED);

    let (valid_status, _) = request_json(
        router,
        Method::GET,
        "/pending?device_id=device-a",
        None,
        Some(&token_a),
    )
    .await;
    assert_eq!(valid_status, StatusCode::OK);
}

#[tokio::test]
async fn send_requires_sender_authentication_and_rejects_duplicates() {
    let router = app();
    let sender_key = signing_key(7);
    let sender_token = register_device(router.clone(), "sender", &sender_key).await;
    register_device(router.clone(), "recipient", &signing_key(8)).await;
    let envelope = signed_envelope("sender", "recipient", &sender_key);
    let payload = serde_json::to_value(&envelope).expect("envelope should serialize");

    let (missing_status, _) = request_json(
        router.clone(),
        Method::POST,
        "/send",
        Some(payload.clone()),
        None,
    )
    .await;
    assert_eq!(missing_status, StatusCode::UNAUTHORIZED);

    let (status, body) = request_json(
        router.clone(),
        Method::POST,
        "/send",
        Some(payload.clone()),
        Some(&sender_token),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["id"], envelope.id);

    let (duplicate_status, _) = request_json(
        router,
        Method::POST,
        "/send",
        Some(payload),
        Some(&sender_token),
    )
    .await;
    assert_eq!(duplicate_status, StatusCode::CONFLICT);
}

#[tokio::test]
async fn send_fetch_lease_and_ack_complete_the_delivery_lifecycle() {
    let router = app();
    let sender_key = signing_key(9);
    let sender_token = register_device(router.clone(), "sender", &sender_key).await;
    let recipient_token = register_device(router.clone(), "recipient", &signing_key(10)).await;
    let envelope = signed_envelope("sender", "recipient", &sender_key);
    let message_id = envelope.id.clone();

    let (send_status, _) = request_json(
        router.clone(),
        Method::POST,
        "/send",
        Some(serde_json::to_value(envelope).expect("envelope should serialize")),
        Some(&sender_token),
    )
    .await;
    assert_eq!(send_status, StatusCode::OK);

    let (pending_status, pending_body) = request_json(
        router.clone(),
        Method::GET,
        "/pending?device_id=recipient",
        None,
        Some(&recipient_token),
    )
    .await;
    assert_eq!(pending_status, StatusCode::OK);
    assert_eq!(pending_body["count"], 1);

    let (fetch_status, fetch_body) = request_json(
        router.clone(),
        Method::GET,
        "/fetch?device_id=recipient&limit=10",
        None,
        Some(&recipient_token),
    )
    .await;
    assert_eq!(fetch_status, StatusCode::OK);
    assert_eq!(fetch_body.as_array().map(Vec::len), Some(1));
    assert_eq!(fetch_body[0]["id"], message_id);

    let (leased_status, leased_body) = request_json(
        router.clone(),
        Method::GET,
        "/fetch?device_id=recipient&limit=10",
        None,
        Some(&recipient_token),
    )
    .await;
    assert_eq!(leased_status, StatusCode::OK);
    assert_eq!(leased_body.as_array().map(Vec::len), Some(0));

    let (ack_status, ack_body) = request_json(
        router.clone(),
        Method::POST,
        "/ack",
        Some(json!({
            "device_id": "recipient",
            "message_ids": [message_id],
        })),
        Some(&recipient_token),
    )
    .await;
    assert_eq!(ack_status, StatusCode::OK);
    assert_eq!(ack_body["acknowledged"], 1);

    let (final_status, final_body) = request_json(
        router,
        Method::GET,
        "/pending?device_id=recipient",
        None,
        Some(&recipient_token),
    )
    .await;
    assert_eq!(final_status, StatusCode::OK);
    assert_eq!(final_body["count"], 0);
}

#[tokio::test]
async fn send_rejects_invalid_binary_lengths_and_future_timestamps() {
    let router = app();
    let sender_key = signing_key(11);
    let sender_token = register_device(router.clone(), "sender", &sender_key).await;
    register_device(router.clone(), "recipient", &signing_key(12)).await;

    let mut invalid_key = signed_envelope("sender", "recipient", &sender_key);
    invalid_key.ephemeral_pubkey = vec![0; 31];
    invalid_key.sign(&sender_key);
    let (invalid_key_status, _) = request_json(
        router.clone(),
        Method::POST,
        "/send",
        Some(serde_json::to_value(invalid_key).expect("envelope should serialize")),
        Some(&sender_token),
    )
    .await;
    assert_eq!(invalid_key_status, StatusCode::BAD_REQUEST);

    let mut future = signed_envelope("sender", "recipient", &sender_key);
    future.timestamp = now_secs() + 301;
    future.sign(&sender_key);
    let (future_status, _) = request_json(
        router,
        Method::POST,
        "/send",
        Some(serde_json::to_value(future).expect("envelope should serialize")),
        Some(&sender_token),
    )
    .await;
    assert_eq!(future_status, StatusCode::BAD_REQUEST);
}
