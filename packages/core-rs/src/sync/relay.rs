//! Blind relay implementation for encrypted store-and-forward sync.
//!
//! The relay never receives plaintext. Device registration uses an Ed25519
//! challenge-response so a public key (or its hash) is never sufficient to obtain
//! a mailbox capability. Successful registration rotates an expiring bearer token.

use base64::Engine as _;
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use subtle::ConstantTimeEq;
use thiserror::Error;

/// Maximum age for pending messages (24 hours).
const MAX_MESSAGE_AGE_SECS: u64 = 86_400;
/// Maximum ciphertext size (10 MiB).
const MAX_MESSAGE_SIZE: usize = 10 * 1024 * 1024;
/// Maximum pending messages per recipient.
const MAX_PENDING_PER_DEVICE: usize = 100;
/// Maximum size for public-key, nonce, and signature envelope fields.
const MAX_SMALL_FIELD: usize = 4 * 1024;
/// Maximum length for IDs and message-type strings.
const MAX_ID_LEN: usize = 256;
/// Maximum number of distinct recipient queues.
const MAX_TOTAL_QUEUES: usize = 100_000;
/// Maximum number of registered devices.
const MAX_REGISTERED_DEVICES: usize = 100_000;
/// Maximum accepted future clock skew for an envelope.
const MAX_FUTURE_SKEW_SECS: u64 = 300;
/// Registration challenges are short-lived and single-use.
const REGISTRATION_CHALLENGE_TTL_SECS: u64 = 300;
/// Capability tokens expire after 30 days and are rotated on every registration.
const CAPABILITY_TOKEN_TTL_SECS: u64 = 30 * 24 * 60 * 60;
const REGISTRATION_DOMAIN: &str = "noteece-relay-registration-v1";

#[derive(Error, Debug)]
pub enum RelayError {
    #[error("Device not registered")]
    DeviceNotRegistered,
    #[error("Authentication required")]
    AuthenticationRequired,
    #[error("Invalid or expired capability token")]
    InvalidToken,
    #[error("Message too large (max {MAX_MESSAGE_SIZE} bytes)")]
    MessageTooLarge,
    #[error("Too many pending messages")]
    TooManyPending,
    #[error("Message expired")]
    MessageExpired,
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Invalid or expired registration challenge")]
    InvalidRegistrationChallenge,
    #[error("Invalid envelope: {0}")]
    InvalidEnvelope(String),
    #[error("Relay at capacity")]
    AtCapacity,
    #[error("Encryption error: {0}")]
    EncryptionError(String),
    #[error("Network error: {0}")]
    NetworkError(String),
}

/// Encrypted message envelope retained by the blind relay.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayEnvelope {
    pub id: String,
    pub from_device: String,
    pub to_device: String,
    pub ciphertext: Vec<u8>,
    pub ephemeral_pubkey: Vec<u8>,
    pub nonce: Vec<u8>,
    pub timestamp: u64,
    pub message_type: String,
    pub signature: Vec<u8>,
}

impl RelayEnvelope {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        from_device: &str,
        to_device: &str,
        ciphertext: Vec<u8>,
        ephemeral_pubkey: Vec<u8>,
        nonce: Vec<u8>,
        message_type: &str,
    ) -> Self {
        Self {
            id: ulid::Ulid::new().to_string(),
            from_device: from_device.to_string(),
            to_device: to_device.to_string(),
            ciphertext,
            ephemeral_pubkey,
            nonce,
            timestamp: now_secs(),
            message_type: message_type.to_string(),
            signature: Vec::new(),
        }
    }

    pub fn is_expired(&self) -> bool {
        self.is_expired_at(now_secs())
    }

    fn is_expired_at(&self, now: u64) -> bool {
        now.saturating_sub(self.timestamp) > MAX_MESSAGE_AGE_SECS
    }

    pub fn validate_size(&self) -> Result<(), RelayError> {
        if self.ciphertext.len() > MAX_MESSAGE_SIZE {
            return Err(RelayError::MessageTooLarge);
        }
        Ok(())
    }

    /// Validate every attacker-controlled field before queue insertion.
    pub fn validate(&self) -> Result<(), RelayError> {
        self.validate_at(now_secs())
    }

    fn validate_at(&self, now: u64) -> Result<(), RelayError> {
        self.validate_size()?;

        if self.ephemeral_pubkey.len() > MAX_SMALL_FIELD
            || self.nonce.len() > MAX_SMALL_FIELD
            || self.signature.len() > MAX_SMALL_FIELD
        {
            return Err(RelayError::InvalidEnvelope("binary field too large".into()));
        }

        if self.id.len() > MAX_ID_LEN
            || self.from_device.len() > MAX_ID_LEN
            || self.to_device.len() > MAX_ID_LEN
            || self.message_type.len() > MAX_ID_LEN
        {
            return Err(RelayError::InvalidEnvelope("string field too long".into()));
        }

        if self.id.is_empty()
            || self.from_device.is_empty()
            || self.to_device.is_empty()
            || self.message_type.is_empty()
        {
            return Err(RelayError::InvalidEnvelope(
                "missing id, sender, recipient, or message type".into(),
            ));
        }

        if self.timestamp > now.saturating_add(MAX_FUTURE_SKEW_SECS) {
            return Err(RelayError::InvalidEnvelope(
                "timestamp too far in future".into(),
            ));
        }

        Ok(())
    }
}

#[derive(Debug, Clone)]
struct PendingMessage {
    envelope: RelayEnvelope,
}

#[derive(Debug, Clone)]
struct RegistrationChallenge {
    public_key: [u8; 32],
    challenge: [u8; 32],
    expires_at: u64,
}

#[derive(Debug, Clone)]
struct CapabilityToken {
    value: [u8; 32],
    expires_at: u64,
}

/// In-memory relay state. Production deployments should replace the backing
/// maps with a durable, rate-limited store while preserving these invariants.
pub struct BlindRelayServer {
    pending: Arc<Mutex<HashMap<String, Vec<PendingMessage>>>>,
    devices: Arc<Mutex<HashMap<String, [u8; 32]>>>,
    challenges: Arc<Mutex<HashMap<String, RegistrationChallenge>>>,
    tokens: Arc<Mutex<HashMap<String, CapabilityToken>>>,
}

impl Default for BlindRelayServer {
    fn default() -> Self {
        Self::new()
    }
}

impl BlindRelayServer {
    pub fn new() -> Self {
        Self {
            pending: Arc::new(Mutex::new(HashMap::new())),
            devices: Arc::new(Mutex::new(HashMap::new())),
            challenges: Arc::new(Mutex::new(HashMap::new())),
            tokens: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Begin registration by issuing a single-use challenge bound to the device ID
    /// and Ed25519 public key. Existing device IDs may only use their original key.
    pub fn begin_registration(
        &self,
        device_id: &str,
        public_key_b64: &str,
    ) -> Result<String, RelayError> {
        self.begin_registration_at(device_id, public_key_b64, now_secs())
    }

    fn begin_registration_at(
        &self,
        device_id: &str,
        public_key_b64: &str,
        now: u64,
    ) -> Result<String, RelayError> {
        validate_identifier(device_id, "device id")?;
        let public_key = decode_b64_32(public_key_b64)
            .map_err(|_| RelayError::InvalidEnvelope("invalid Ed25519 public key".into()))?;
        VerifyingKey::from_bytes(&public_key).map_err(|_| RelayError::InvalidSignature)?;

        {
            let devices = self
                .devices
                .lock()
                .map_err(|_| RelayError::EncryptionError("Mutex poisoned".into()))?;
            if let Some(existing) = devices.get(device_id) {
                if !bool::from(existing.ct_eq(&public_key)) {
                    return Err(RelayError::InvalidSignature);
                }
            } else if devices.len() >= MAX_REGISTERED_DEVICES {
                return Err(RelayError::AtCapacity);
            }
        }

        let mut challenge = [0_u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut challenge);
        let challenge_b64 = base64::engine::general_purpose::STANDARD.encode(challenge);

        self.challenges
            .lock()
            .map_err(|_| RelayError::EncryptionError("Mutex poisoned".into()))?
            .insert(
                device_id.to_string(),
                RegistrationChallenge {
                    public_key,
                    challenge,
                    expires_at: now.saturating_add(REGISTRATION_CHALLENGE_TTL_SECS),
                },
            );

        Ok(challenge_b64)
    }

    /// Complete registration by verifying a signature over the server challenge.
    /// The challenge is consumed regardless of success, preventing replay. Every
    /// successful proof rotates the capability token and invalidates the old token.
    pub fn complete_registration(
        &self,
        device_id: &str,
        public_key_b64: &str,
        challenge_b64: &str,
        signature_b64: &str,
    ) -> Result<(String, u64), RelayError> {
        self.complete_registration_at(
            device_id,
            public_key_b64,
            challenge_b64,
            signature_b64,
            now_secs(),
        )
    }

    fn complete_registration_at(
        &self,
        device_id: &str,
        public_key_b64: &str,
        challenge_b64: &str,
        signature_b64: &str,
        now: u64,
    ) -> Result<(String, u64), RelayError> {
        validate_identifier(device_id, "device id")?;
        let public_key = decode_b64_32(public_key_b64)
            .map_err(|_| RelayError::InvalidEnvelope("invalid Ed25519 public key".into()))?;
        let challenge = decode_b64_32(challenge_b64)
            .map_err(|_| RelayError::InvalidRegistrationChallenge)?;

        let issued = self
            .challenges
            .lock()
            .map_err(|_| RelayError::EncryptionError("Mutex poisoned".into()))?
            .remove(device_id)
            .ok_or(RelayError::InvalidRegistrationChallenge)?;

        if now >= issued.expires_at
            || !bool::from(issued.public_key.ct_eq(&public_key))
            || !bool::from(issued.challenge.ct_eq(&challenge))
        {
            return Err(RelayError::InvalidRegistrationChallenge);
        }

        let signature_bytes = base64::engine::general_purpose::STANDARD
            .decode(signature_b64)
            .map_err(|_| RelayError::InvalidSignature)?;
        let signature =
            Signature::from_slice(&signature_bytes).map_err(|_| RelayError::InvalidSignature)?;
        let verifying_key =
            VerifyingKey::from_bytes(&public_key).map_err(|_| RelayError::InvalidSignature)?;
        let message = registration_message(device_id, challenge_b64);
        verifying_key
            .verify(message.as_bytes(), &signature)
            .map_err(|_| RelayError::InvalidSignature)?;

        {
            let mut devices = self
                .devices
                .lock()
                .map_err(|_| RelayError::EncryptionError("Mutex poisoned".into()))?;
            match devices.get(device_id) {
                Some(existing) if bool::from(existing.ct_eq(&public_key)) => {}
                Some(_) => return Err(RelayError::InvalidSignature),
                None => {
                    if devices.len() >= MAX_REGISTERED_DEVICES {
                        return Err(RelayError::AtCapacity);
                    }
                    devices.insert(device_id.to_string(), public_key);
                }
            }
        }

        self.rotate_token_at(device_id, now)
    }

    fn rotate_token_at(&self, device_id: &str, now: u64) -> Result<(String, u64), RelayError> {
        if !self.is_registered(device_id) {
            return Err(RelayError::DeviceNotRegistered);
        }

        let mut value = [0_u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut value);
        let expires_at = now.saturating_add(CAPABILITY_TOKEN_TTL_SECS);
        self.tokens
            .lock()
            .map_err(|_| RelayError::EncryptionError("Mutex poisoned".into()))?
            .insert(device_id.to_string(), CapabilityToken { value, expires_at });

        Ok((hex::encode(value), expires_at))
    }

    pub fn verify_token(&self, device_id: &str, token: &str) -> bool {
        self.verify_token_at(device_id, token, now_secs())
    }

    fn verify_token_at(&self, device_id: &str, token: &str, now: u64) -> bool {
        let supplied = match hex::decode(token) {
            Ok(bytes) if bytes.len() == 32 => {
                let mut value = [0_u8; 32];
                value.copy_from_slice(&bytes);
                value
            }
            _ => return false,
        };

        match self.tokens.lock() {
            Ok(tokens) => tokens.get(device_id).is_some_and(|stored| {
                now < stored.expires_at && bool::from(stored.value.ct_eq(&supplied))
            }),
            Err(_) => false,
        }
    }

    pub fn is_registered(&self, device_id: &str) -> bool {
        self.devices
            .lock()
            .map(|devices| devices.contains_key(device_id))
            .unwrap_or(false)
    }

    pub fn unregister_device(&self, device_id: &str) {
        if let Ok(mut devices) = self.devices.lock() {
            devices.remove(device_id);
        }
        if let Ok(mut pending) = self.pending.lock() {
            pending.remove(device_id);
        }
        if let Ok(mut challenges) = self.challenges.lock() {
            challenges.remove(device_id);
        }
        if let Ok(mut tokens) = self.tokens.lock() {
            tokens.remove(device_id);
        }
        log::info!("[relay] Unregistered device: {device_id}");
    }

    /// Submit an envelope from an authenticated sender. The token must be bound to
    /// `from_device`; both sender and recipient must already be registered.
    pub fn submit_message_authorized(
        &self,
        token: &str,
        envelope: RelayEnvelope,
    ) -> Result<String, RelayError> {
        if !self.verify_token(&envelope.from_device, token) {
            return Err(RelayError::InvalidToken);
        }
        self.submit_message(envelope)
    }

    /// Queue a validated envelope. This method is retained for trusted in-process
    /// callers; HTTP callers must use `submit_message_authorized`.
    pub fn submit_message(&self, envelope: RelayEnvelope) -> Result<String, RelayError> {
        envelope.validate()?;
        if envelope.is_expired() {
            return Err(RelayError::MessageExpired);
        }
        if !self.is_registered(&envelope.from_device)
            || !self.is_registered(&envelope.to_device)
        {
            return Err(RelayError::DeviceNotRegistered);
        }

        let msg_id = envelope.id.clone();
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| RelayError::EncryptionError("Mutex poisoned".into()))?;

        if !pending.contains_key(&envelope.to_device) && pending.len() >= MAX_TOTAL_QUEUES {
            return Err(RelayError::AtCapacity);
        }

        let queue = pending.entry(envelope.to_device.clone()).or_default();
        if queue.len() >= MAX_PENDING_PER_DEVICE {
            queue.retain(|message| !message.envelope.is_expired());
            if queue.len() >= MAX_PENDING_PER_DEVICE {
                return Err(RelayError::TooManyPending);
            }
        }

        queue.push(PendingMessage { envelope });
        log::info!("[relay] Message {msg_id} queued for delivery");
        Ok(msg_id)
    }

    pub fn fetch_messages(&self, device_id: &str, limit: usize) -> Vec<RelayEnvelope> {
        let mut pending = match self.pending.lock() {
            Ok(pending) => pending,
            Err(_) => return Vec::new(),
        };

        let Some(queue) = pending.get_mut(device_id) else {
            return Vec::new();
        };
        queue.retain(|message| !message.envelope.is_expired());
        let count = queue.len().min(limit);
        let messages = queue
            .drain(..count)
            .map(|message| message.envelope)
            .collect::<Vec<_>>();
        if queue.is_empty() {
            pending.remove(device_id);
        }
        messages
    }

    pub fn pending_count(&self, device_id: &str) -> usize {
        self.pending
            .lock()
            .ok()
            .and_then(|pending| pending.get(device_id).cloned())
            .map(|queue| {
                queue
                    .iter()
                    .filter(|message| !message.envelope.is_expired())
                    .count()
            })
            .unwrap_or(0)
    }

    /// Remove expired messages, challenges, and capability tokens.
    ///
    /// The return value remains the number of expired messages removed so existing
    /// operational logging does not change semantics.
    pub fn cleanup_expired(&self) -> usize {
        let now = now_secs();
        let mut cleaned_messages = 0;

        if let Ok(mut pending) = self.pending.lock() {
            for queue in pending.values_mut() {
                let before = queue.len();
                queue.retain(|message| !message.envelope.is_expired_at(now));
                cleaned_messages += before.saturating_sub(queue.len());
            }
            pending.retain(|_, queue| !queue.is_empty());
        }

        if let Ok(mut challenges) = self.challenges.lock() {
            challenges.retain(|_, challenge| now < challenge.expires_at);
        }
        if let Ok(mut tokens) = self.tokens.lock() {
            tokens.retain(|_, token| now < token.expires_at);
        }

        cleaned_messages
    }

    pub fn stats(&self) -> RelayStats {
        let registered_devices = self
            .devices
            .lock()
            .map(|devices| devices.len())
            .unwrap_or(0);
        let pending = match self.pending.lock() {
            Ok(pending) => pending,
            Err(_) => {
                return RelayStats {
                    registered_devices,
                    total_pending_messages: 0,
                    active_queues: 0,
                }
            }
        };
        let now = now_secs();
        let total_pending_messages = pending
            .values()
            .flat_map(|queue| queue.iter())
            .filter(|message| !message.envelope.is_expired_at(now))
            .count();
        let active_queues = pending
            .values()
            .filter(|queue| {
                queue
                    .iter()
                    .any(|message| !message.envelope.is_expired_at(now))
            })
            .count();

        RelayStats {
            registered_devices,
            total_pending_messages,
            active_queues,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayStats {
    pub registered_devices: usize,
    pub total_pending_messages: usize,
    pub active_queues: usize,
}

/// Domain-separated bytes signed during registration.
pub fn registration_message(device_id: &str, challenge_b64: &str) -> String {
    format!("{REGISTRATION_DOMAIN}\0{device_id}\0{challenge_b64}")
}

/// HTTP client for the challenge-response relay protocol.
pub struct RelayClient {
    device_id: String,
    relay_url: String,
    auth_token: Option<String>,
    token_expires_at: Option<u64>,
}

impl RelayClient {
    pub fn new(device_id: &str, relay_url: &str) -> Self {
        Self {
            device_id: device_id.to_string(),
            relay_url: relay_url.trim_end_matches('/').to_string(),
            auth_token: None,
            token_expires_at: None,
        }
    }

    /// Register or re-register using proof of possession of the device signing key.
    /// Re-registration rotates the previous capability token.
    pub async fn register(&mut self, signing_key: &SigningKey) -> Result<(), RelayError> {
        validate_identifier(&self.device_id, "device id")?;
        let public_key_b64 = base64::engine::general_purpose::STANDARD
            .encode(signing_key.verifying_key().to_bytes());
        let client = reqwest::Client::new();

        let challenge_response = client
            .post(format!("{}/register/challenge", self.relay_url))
            .json(&serde_json::json!({
                "device_id": self.device_id,
                "public_key": public_key_b64,
            }))
            .send()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;

        if !challenge_response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Registration challenge failed: {}",
                challenge_response.status()
            )));
        }

        let challenge_json: serde_json::Value = challenge_response
            .json()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;
        let challenge = challenge_json
            .get("challenge")
            .and_then(serde_json::Value::as_str)
            .ok_or_else(|| RelayError::NetworkError("Missing registration challenge".into()))?;
        let signature = signing_key.sign(registration_message(&self.device_id, challenge).as_bytes());
        let signature_b64 =
            base64::engine::general_purpose::STANDARD.encode(signature.to_bytes());

        let registration_response = client
            .post(format!("{}/register", self.relay_url))
            .json(&serde_json::json!({
                "device_id": self.device_id,
                "public_key": public_key_b64,
                "challenge": challenge,
                "signature": signature_b64,
            }))
            .send()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;

        if !registration_response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Registration failed: {}",
                registration_response.status()
            )));
        }

        let result: serde_json::Value = registration_response
            .json()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;
        let token = result
            .get("token")
            .and_then(serde_json::Value::as_str)
            .filter(|token| !token.is_empty())
            .ok_or_else(|| RelayError::NetworkError("Missing capability token".into()))?;
        let expires_at = result
            .get("expires_at")
            .and_then(serde_json::Value::as_u64)
            .ok_or_else(|| RelayError::NetworkError("Missing token expiry".into()))?;

        self.auth_token = Some(token.to_string());
        self.token_expires_at = Some(expires_at);
        Ok(())
    }

    pub fn auth_token(&self) -> Option<&str> {
        self.auth_token.as_deref()
    }

    pub fn token_expires_at(&self) -> Option<u64> {
        self.token_expires_at
    }

    pub fn restore_auth_token(&mut self, token: String, expires_at: u64) {
        self.auth_token = Some(token);
        self.token_expires_at = Some(expires_at);
    }

    fn required_token(&self) -> Result<&str, RelayError> {
        let token = self
            .auth_token
            .as_deref()
            .ok_or(RelayError::AuthenticationRequired)?;
        if self.token_expires_at.is_some_and(|expiry| now_secs() >= expiry) {
            return Err(RelayError::InvalidToken);
        }
        Ok(token)
    }

    pub async fn send(&self, envelope: RelayEnvelope) -> Result<String, RelayError> {
        if envelope.from_device != self.device_id {
            return Err(RelayError::InvalidEnvelope(
                "envelope sender does not match relay client".into(),
            ));
        }
        let response = reqwest::Client::new()
            .post(format!("{}/send", self.relay_url))
            .header("Authorization", format!("Bearer {}", self.required_token()?))
            .json(&envelope)
            .send()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;

        if !response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Send failed: {}",
                response.status()
            )));
        }
        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;
        result
            .get("id")
            .and_then(serde_json::Value::as_str)
            .map(str::to_string)
            .ok_or_else(|| RelayError::NetworkError("Missing relay message id".into()))
    }

    pub async fn fetch(&self, limit: usize) -> Result<Vec<RelayEnvelope>, RelayError> {
        let response = reqwest::Client::new()
            .get(format!(
                "{}/fetch?device_id={}&limit={}",
                self.relay_url, self.device_id, limit
            ))
            .header("Authorization", format!("Bearer {}", self.required_token()?))
            .send()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;

        if !response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Fetch failed: {}",
                response.status()
            )));
        }
        response
            .json()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))
    }

    pub async fn check_pending(&self) -> Result<usize, RelayError> {
        let response = reqwest::Client::new()
            .get(format!(
                "{}/pending?device_id={}",
                self.relay_url, self.device_id
            ))
            .header("Authorization", format!("Bearer {}", self.required_token()?))
            .send()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;

        if !response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Pending check failed: {}",
                response.status()
            )));
        }
        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|error| RelayError::NetworkError(error.to_string()))?;
        Ok(result
            .get("count")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0) as usize)
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn validate_identifier(value: &str, name: &str) -> Result<(), RelayError> {
    if value.is_empty() || value.len() > MAX_ID_LEN {
        return Err(RelayError::InvalidEnvelope(format!("invalid {name}")));
    }
    Ok(())
}

fn decode_b64_32(value: &str) -> Result<[u8; 32], ()> {
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|_| ())?;
    decoded.try_into().map_err(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn signing_key(seed: u8) -> SigningKey {
        SigningKey::from_bytes(&[seed; 32])
    }

    fn register_at(
        server: &BlindRelayServer,
        device_id: &str,
        key: &SigningKey,
        now: u64,
    ) -> (String, u64, String) {
        let public_key = base64::engine::general_purpose::STANDARD
            .encode(key.verifying_key().to_bytes());
        let challenge = server
            .begin_registration_at(device_id, &public_key, now)
            .expect("challenge should be issued");
        let signature = key.sign(registration_message(device_id, &challenge).as_bytes());
        let signature = base64::engine::general_purpose::STANDARD.encode(signature.to_bytes());
        let (token, expires_at) = server
            .complete_registration_at(
                device_id,
                &public_key,
                &challenge,
                &signature,
                now,
            )
            .expect("registration proof should verify");
        (token, expires_at, challenge)
    }

    #[test]
    fn registration_requires_proof_rotates_tokens_and_rejects_replay() {
        let server = BlindRelayServer::new();
        let key = signing_key(7);
        let (first_token, _, first_challenge) = register_at(&server, "device-a", &key, 1_000);
        assert!(server.verify_token_at("device-a", &first_token, 1_001));

        let public_key = base64::engine::general_purpose::STANDARD
            .encode(key.verifying_key().to_bytes());
        let replay_signature = key.sign(
            registration_message("device-a", &first_challenge).as_bytes(),
        );
        let replay_signature =
            base64::engine::general_purpose::STANDARD.encode(replay_signature.to_bytes());
        assert!(matches!(
            server.complete_registration_at(
                "device-a",
                &public_key,
                &first_challenge,
                &replay_signature,
                1_002,
            ),
            Err(RelayError::InvalidRegistrationChallenge)
        ));

        let (second_token, _, _) = register_at(&server, "device-a", &key, 1_003);
        assert_ne!(first_token, second_token);
        assert!(!server.verify_token_at("device-a", &first_token, 1_004));
        assert!(server.verify_token_at("device-a", &second_token, 1_004));
    }

    #[test]
    fn registration_rejects_wrong_key_and_expired_challenge() {
        let server = BlindRelayServer::new();
        let first_key = signing_key(1);
        let other_key = signing_key(2);
        register_at(&server, "device-a", &first_key, 100);

        let other_public_key = base64::engine::general_purpose::STANDARD
            .encode(other_key.verifying_key().to_bytes());
        assert!(matches!(
            server.begin_registration_at("device-a", &other_public_key, 101),
            Err(RelayError::InvalidSignature)
        ));

        let public_key = base64::engine::general_purpose::STANDARD
            .encode(first_key.verifying_key().to_bytes());
        let challenge = server
            .begin_registration_at("device-a", &public_key, 200)
            .unwrap();
        let signature = first_key.sign(registration_message("device-a", &challenge).as_bytes());
        let signature = base64::engine::general_purpose::STANDARD.encode(signature.to_bytes());
        assert!(matches!(
            server.complete_registration_at(
                "device-a",
                &public_key,
                &challenge,
                &signature,
                200 + REGISTRATION_CHALLENGE_TTL_SECS,
            ),
            Err(RelayError::InvalidRegistrationChallenge)
        ));
    }

    #[test]
    fn capability_tokens_expire() {
        let server = BlindRelayServer::new();
        let (token, expires_at, _) = register_at(&server, "device-a", &signing_key(3), 500);
        assert!(server.verify_token_at("device-a", &token, expires_at - 1));
        assert!(!server.verify_token_at("device-a", &token, expires_at));
    }

    #[test]
    fn relay_requires_registered_sender_recipient_and_sender_token() {
        let server = BlindRelayServer::new();
        let (sender_token, _, _) = register_at(&server, "device-a", &signing_key(4), 1_000);
        register_at(&server, "device-b", &signing_key(5), 1_000);

        let mut envelope = RelayEnvelope::new(
            "device-a",
            "device-b",
            vec![1, 2, 3],
            vec![4, 5, 6],
            vec![7, 8, 9],
            "sync_delta",
        );
        envelope.timestamp = 1_000;
        let id = server
            .submit_message_authorized(&sender_token, envelope)
            .expect("authenticated sender should queue a message");
        assert!(!id.is_empty());
        assert_eq!(server.pending_count("device-b"), 1);

        let messages = server.fetch_messages("device-b", 10);
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].from_device, "device-a");

        let unknown_recipient = RelayEnvelope {
            to_device: "unknown".into(),
            timestamp: now_secs(),
            ..RelayEnvelope::new(
                "device-a",
                "device-b",
                vec![1],
                vec![],
                vec![],
                "sync_delta",
            )
        };
        assert!(matches!(
            server.submit_message_authorized(&sender_token, unknown_recipient),
            Err(RelayError::DeviceNotRegistered)
        ));
    }

    #[test]
    fn envelope_limits_and_future_skew_are_enforced() {
        let oversized = RelayEnvelope::new(
            "device-a",
            "device-b",
            vec![0_u8; MAX_MESSAGE_SIZE + 1],
            vec![],
            vec![],
            "sync_delta",
        );
        assert!(matches!(
            oversized.validate_size(),
            Err(RelayError::MessageTooLarge)
        ));

        let mut future = RelayEnvelope::new(
            "device-a",
            "device-b",
            vec![1],
            vec![],
            vec![],
            "sync_delta",
        );
        future.timestamp = 1_000 + MAX_FUTURE_SKEW_SECS + 1;
        assert!(matches!(
            future.validate_at(1_000),
            Err(RelayError::InvalidEnvelope(_))
        ));
    }

    #[test]
    fn stats_report_registered_devices() {
        let server = BlindRelayServer::new();
        register_at(&server, "device-a", &signing_key(6), 1_000);
        let stats = server.stats();
        assert_eq!(stats.registered_devices, 1);
        assert_eq!(stats.total_pending_messages, 0);
        assert_eq!(stats.active_queues, 0);
    }
}
