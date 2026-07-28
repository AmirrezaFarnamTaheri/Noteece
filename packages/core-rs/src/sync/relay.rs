//! Blind relay implementation for encrypted store-and-forward sync.
//!
//! The relay never receives plaintext. Device registration uses an Ed25519
//! challenge-response, capability tokens are stored as hashes, submissions are
//! signed by the registered sender, and delivery uses lease/ack semantics.

use base64::Engine as _;
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use subtle::ConstantTimeEq;
use thiserror::Error;

const MAX_MESSAGE_AGE_SECS: u64 = 86_400;
const MAX_MESSAGE_SIZE: usize = 10 * 1024 * 1024;
const MAX_PENDING_PER_DEVICE: usize = 100;
const MAX_ID_LEN: usize = 256;
const MAX_TOTAL_QUEUES: usize = 10_000;
const MAX_TOTAL_PENDING_MESSAGES: usize = 10_000;
const MAX_TOTAL_PENDING_BYTES: usize = 256 * 1024 * 1024;
const MAX_REGISTERED_DEVICES: usize = 100_000;
const MAX_REGISTRATION_CHALLENGES: usize = 10_000;
const MAX_FUTURE_SKEW_SECS: u64 = 300;
const REGISTRATION_CHALLENGE_TTL_SECS: u64 = 300;
const CAPABILITY_TOKEN_TTL_SECS: u64 = 30 * 24 * 60 * 60;
const DELIVERY_LEASE_SECS: u64 = 60;
const REGISTRATION_DOMAIN: &str = "noteece-relay-registration-v1";
const ENVELOPE_DOMAIN: &[u8] = b"noteece-relay-envelope-v1\0";

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
    #[error("Duplicate message id")]
    DuplicateMessage,
    #[error("Relay at capacity")]
    AtCapacity,
    #[error("Internal relay state unavailable: {0}")]
    StateUnavailable(String),
    #[error("Network error: {0}")]
    NetworkError(String),
}

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

    pub fn validate(&self) -> Result<(), RelayError> {
        self.validate_at(now_secs())
    }

    fn validate_at(&self, now: u64) -> Result<(), RelayError> {
        self.validate_size()?;
        validate_identifier(&self.id, "message id")?;
        validate_identifier(&self.from_device, "sender device id")?;
        validate_identifier(&self.to_device, "recipient device id")?;

        if self.message_type.is_empty() || self.message_type.len() > MAX_ID_LEN {
            return Err(RelayError::InvalidEnvelope(
                "invalid message type".to_string(),
            ));
        }
        if self.ephemeral_pubkey.len() != 32 {
            return Err(RelayError::InvalidEnvelope(
                "ephemeral public key must be 32 bytes".to_string(),
            ));
        }
        if self.nonce.len() != 24 {
            return Err(RelayError::InvalidEnvelope(
                "nonce must be 24 bytes".to_string(),
            ));
        }
        if self.signature.len() != 64 {
            return Err(RelayError::InvalidEnvelope(
                "signature must be 64 bytes".to_string(),
            ));
        }
        if self.timestamp > now.saturating_add(MAX_FUTURE_SKEW_SECS) {
            return Err(RelayError::InvalidEnvelope(
                "timestamp too far in future".to_string(),
            ));
        }
        if self.is_expired_at(now) {
            return Err(RelayError::MessageExpired);
        }
        Ok(())
    }

    pub fn sign(&mut self, signing_key: &SigningKey) {
        self.signature = signing_key.sign(&self.signing_bytes()).to_bytes().to_vec();
    }

    fn verify_signature(&self, public_key: &[u8; 32]) -> Result<(), RelayError> {
        let verifying_key =
            VerifyingKey::from_bytes(public_key).map_err(|_| RelayError::InvalidSignature)?;
        let signature =
            Signature::from_slice(&self.signature).map_err(|_| RelayError::InvalidSignature)?;
        verifying_key
            .verify(&self.signing_bytes(), &signature)
            .map_err(|_| RelayError::InvalidSignature)
    }

    fn signing_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.approximate_size());
        bytes.extend_from_slice(ENVELOPE_DOMAIN);
        append_field(&mut bytes, self.id.as_bytes());
        append_field(&mut bytes, self.from_device.as_bytes());
        append_field(&mut bytes, self.to_device.as_bytes());
        append_field(&mut bytes, &self.ciphertext);
        append_field(&mut bytes, &self.ephemeral_pubkey);
        append_field(&mut bytes, &self.nonce);
        bytes.extend_from_slice(&self.timestamp.to_be_bytes());
        append_field(&mut bytes, self.message_type.as_bytes());
        bytes
    }

    fn approximate_size(&self) -> usize {
        self.id.len()
            + self.from_device.len()
            + self.to_device.len()
            + self.ciphertext.len()
            + self.ephemeral_pubkey.len()
            + self.nonce.len()
            + self.message_type.len()
            + self.signature.len()
            + 128
    }
}

#[derive(Debug, Clone)]
struct PendingMessage {
    envelope: RelayEnvelope,
    leased_until: Option<u64>,
    delivery_attempts: u32,
}

#[derive(Debug, Clone)]
struct RegistrationChallenge {
    public_key: [u8; 32],
    challenge: [u8; 32],
    expires_at: u64,
}

#[derive(Debug, Clone)]
struct CapabilityToken {
    digest: [u8; 32],
    expires_at: u64,
}

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
            let devices = self.devices.lock().map_err(state_error)?;
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

        let mut challenges = self.challenges.lock().map_err(state_error)?;
        challenges.retain(|_, existing| now < existing.expires_at);
        if !challenges.contains_key(device_id)
            && challenges.len() >= MAX_REGISTRATION_CHALLENGES
        {
            return Err(RelayError::AtCapacity);
        }
        challenges.insert(
            device_id.to_string(),
            RegistrationChallenge {
                public_key,
                challenge,
                expires_at: now.saturating_add(REGISTRATION_CHALLENGE_TTL_SECS),
            },
        );

        Ok(challenge_b64)
    }

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
        let challenge =
            decode_b64_32(challenge_b64).map_err(|_| RelayError::InvalidRegistrationChallenge)?;

        let issued = self
            .challenges
            .lock()
            .map_err(state_error)?
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
        verifying_key
            .verify(
                registration_message(device_id, challenge_b64).as_bytes(),
                &signature,
            )
            .map_err(|_| RelayError::InvalidSignature)?;

        {
            let mut devices = self.devices.lock().map_err(state_error)?;
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
        if !self.is_registered(device_id)? {
            return Err(RelayError::DeviceNotRegistered);
        }
        let mut raw = [0_u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut raw);
        let token = hex::encode(raw);
        let expires_at = now.saturating_add(CAPABILITY_TOKEN_TTL_SECS);
        self.tokens.lock().map_err(state_error)?.insert(
            device_id.to_string(),
            CapabilityToken {
                digest: token_digest(&token),
                expires_at,
            },
        );
        Ok((token, expires_at))
    }

    pub fn verify_token(&self, device_id: &str, token: &str) -> bool {
        self.verify_token_at(device_id, token, now_secs())
            .unwrap_or(false)
    }

    fn verify_token_at(&self, device_id: &str, token: &str, now: u64) -> Result<bool, RelayError> {
        if token.len() != 64 || !token.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Ok(false);
        }
        let supplied = token_digest(token);
        let tokens = self.tokens.lock().map_err(state_error)?;
        Ok(tokens.get(device_id).is_some_and(|stored| {
            now < stored.expires_at && bool::from(stored.digest.ct_eq(&supplied))
        }))
    }

    pub fn is_registered(&self, device_id: &str) -> Result<bool, RelayError> {
        Ok(self
            .devices
            .lock()
            .map_err(state_error)?
            .contains_key(device_id))
    }

    pub fn unregister_device(&self, device_id: &str) -> Result<(), RelayError> {
        self.devices.lock().map_err(state_error)?.remove(device_id);
        self.pending.lock().map_err(state_error)?.remove(device_id);
        self.challenges
            .lock()
            .map_err(state_error)?
            .remove(device_id);
        self.tokens.lock().map_err(state_error)?.remove(device_id);
        Ok(())
    }

    pub fn submit_message_authorized(
        &self,
        token: &str,
        envelope: RelayEnvelope,
    ) -> Result<String, RelayError> {
        let now = now_secs();
        if !self.verify_token_at(&envelope.from_device, token, now)? {
            return Err(RelayError::InvalidToken);
        }
        envelope.validate_at(now)?;

        let sender_key = {
            let devices = self.devices.lock().map_err(state_error)?;
            let sender_key = devices
                .get(&envelope.from_device)
                .copied()
                .ok_or(RelayError::DeviceNotRegistered)?;
            if !devices.contains_key(&envelope.to_device) {
                return Err(RelayError::DeviceNotRegistered);
            }
            sender_key
        };
        envelope.verify_signature(&sender_key)?;
        self.queue_message(envelope, now)
    }

    pub fn submit_message(&self, envelope: RelayEnvelope) -> Result<String, RelayError> {
        let now = now_secs();
        envelope.validate_at(now)?;
        let devices = self.devices.lock().map_err(state_error)?;
        if !devices.contains_key(&envelope.from_device)
            || !devices.contains_key(&envelope.to_device)
        {
            return Err(RelayError::DeviceNotRegistered);
        }
        drop(devices);
        self.queue_message(envelope, now)
    }

    fn queue_message(&self, envelope: RelayEnvelope, now: u64) -> Result<String, RelayError> {
        let message_id = envelope.id.clone();
        let message_size = envelope.approximate_size();
        let mut pending = self.pending.lock().map_err(state_error)?;
        cleanup_pending_locked(&mut pending, now);

        if pending
            .values()
            .flatten()
            .any(|message| message.envelope.id == message_id)
        {
            return Err(RelayError::DuplicateMessage);
        }
        if !pending.contains_key(&envelope.to_device) && pending.len() >= MAX_TOTAL_QUEUES {
            return Err(RelayError::AtCapacity);
        }
        let total_messages = pending.values().map(Vec::len).sum::<usize>();
        if total_messages >= MAX_TOTAL_PENDING_MESSAGES {
            return Err(RelayError::AtCapacity);
        }
        let total_bytes = pending
            .values()
            .flatten()
            .map(|message| message.envelope.approximate_size())
            .sum::<usize>();
        if total_bytes.saturating_add(message_size) > MAX_TOTAL_PENDING_BYTES {
            return Err(RelayError::AtCapacity);
        }

        let queue = pending.entry(envelope.to_device.clone()).or_default();
        if queue.len() >= MAX_PENDING_PER_DEVICE {
            return Err(RelayError::TooManyPending);
        }
        queue.push(PendingMessage {
            envelope,
            leased_until: None,
            delivery_attempts: 0,
        });
        Ok(message_id)
    }

    pub fn lease_messages(
        &self,
        device_id: &str,
        limit: usize,
    ) -> Result<Vec<RelayEnvelope>, RelayError> {
        self.lease_messages_at(device_id, limit, now_secs())
    }

    fn lease_messages_at(
        &self,
        device_id: &str,
        limit: usize,
        now: u64,
    ) -> Result<Vec<RelayEnvelope>, RelayError> {
        let mut pending = self.pending.lock().map_err(state_error)?;
        cleanup_pending_locked(&mut pending, now);
        let Some(queue) = pending.get_mut(device_id) else {
            return Ok(Vec::new());
        };

        let mut leased = Vec::new();
        for message in queue.iter_mut() {
            if leased.len() >= limit {
                break;
            }
            if message.leased_until.is_some_and(|expiry| now < expiry) {
                continue;
            }
            message.leased_until = Some(now.saturating_add(DELIVERY_LEASE_SECS));
            message.delivery_attempts = message.delivery_attempts.saturating_add(1);
            leased.push(message.envelope.clone());
        }
        Ok(leased)
    }

    /// Compatibility alias. Fetching now leases rather than deleting messages.
    pub fn fetch_messages(&self, device_id: &str, limit: usize) -> Vec<RelayEnvelope> {
        self.lease_messages(device_id, limit).unwrap_or_default()
    }

    pub fn acknowledge_messages(
        &self,
        device_id: &str,
        message_ids: &[String],
    ) -> Result<usize, RelayError> {
        if message_ids.is_empty() || message_ids.len() > MAX_PENDING_PER_DEVICE {
            return Err(RelayError::InvalidEnvelope(
                "invalid acknowledgement set".to_string(),
            ));
        }
        let ids = message_ids.iter().collect::<HashSet<_>>();
        let mut pending = self.pending.lock().map_err(state_error)?;
        let Some(queue) = pending.get_mut(device_id) else {
            return Ok(0);
        };
        let before = queue.len();
        queue.retain(|message| !ids.contains(&message.envelope.id));
        let removed = before.saturating_sub(queue.len());
        if queue.is_empty() {
            pending.remove(device_id);
        }
        Ok(removed)
    }

    pub fn pending_count(&self, device_id: &str) -> Result<usize, RelayError> {
        let now = now_secs();
        let pending = self.pending.lock().map_err(state_error)?;
        Ok(pending
            .get(device_id)
            .map(|queue| {
                queue
                    .iter()
                    .filter(|message| !message.envelope.is_expired_at(now))
                    .count()
            })
            .unwrap_or(0))
    }

    pub fn cleanup_expired(&self) -> Result<usize, RelayError> {
        let now = now_secs();
        let mut pending = self.pending.lock().map_err(state_error)?;
        let before = pending.values().map(Vec::len).sum::<usize>();
        cleanup_pending_locked(&mut pending, now);
        let after = pending.values().map(Vec::len).sum::<usize>();
        drop(pending);

        self.challenges
            .lock()
            .map_err(state_error)?
            .retain(|_, challenge| now < challenge.expires_at);
        self.tokens
            .lock()
            .map_err(state_error)?
            .retain(|_, token| now < token.expires_at);
        Ok(before.saturating_sub(after))
    }

    pub fn stats(&self) -> Result<RelayStats, RelayError> {
        let registered_devices = self.devices.lock().map_err(state_error)?.len();
        let pending = self.pending.lock().map_err(state_error)?;
        let now = now_secs();
        let messages = pending
            .values()
            .flatten()
            .filter(|message| !message.envelope.is_expired_at(now))
            .collect::<Vec<_>>();
        Ok(RelayStats {
            registered_devices,
            total_pending_messages: messages.len(),
            active_queues: pending
                .values()
                .filter(|queue| {
                    queue
                        .iter()
                        .any(|message| !message.envelope.is_expired_at(now))
                })
                .count(),
            total_pending_bytes: messages
                .iter()
                .map(|message| message.envelope.approximate_size())
                .sum(),
            active_leases: messages
                .iter()
                .filter(|message| message.leased_until.is_some_and(|expiry| now < expiry))
                .count(),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayStats {
    pub registered_devices: usize,
    pub total_pending_messages: usize,
    pub active_queues: usize,
    pub total_pending_bytes: usize,
    pub active_leases: usize,
}

pub fn registration_message(device_id: &str, challenge_b64: &str) -> String {
    format!("{REGISTRATION_DOMAIN}\0{device_id}\0{challenge_b64}")
}

pub struct RelayClient {
    device_id: String,
    relay_url: String,
    auth_token: Option<String>,
    token_expires_at: Option<u64>,
    http: reqwest::Client,
}

impl RelayClient {
    pub fn new(device_id: &str, relay_url: &str) -> Self {
        let http = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(20))
            .build()
            .unwrap_or_default();
        Self {
            device_id: device_id.to_string(),
            relay_url: relay_url.trim_end_matches('/').to_string(),
            auth_token: None,
            token_expires_at: None,
            http,
        }
    }

    pub async fn register(&mut self, signing_key: &SigningKey) -> Result<(), RelayError> {
        validate_identifier(&self.device_id, "device id")?;
        let public_key_b64 = base64::engine::general_purpose::STANDARD
            .encode(signing_key.verifying_key().to_bytes());
        let challenge_response = self
            .http
            .post(format!("{}/register/challenge", self.relay_url))
            .json(&serde_json::json!({
                "device_id": self.device_id,
                "public_key": public_key_b64,
            }))
            .send()
            .await
            .map_err(network_error)?;
        if !challenge_response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Registration challenge failed: {}",
                challenge_response.status()
            )));
        }

        let challenge_json: serde_json::Value =
            challenge_response.json().await.map_err(network_error)?;
        let challenge = challenge_json
            .get("challenge")
            .and_then(serde_json::Value::as_str)
            .ok_or_else(|| RelayError::NetworkError("Missing registration challenge".into()))?;
        let signature =
            signing_key.sign(registration_message(&self.device_id, challenge).as_bytes());
        let signature_b64 = base64::engine::general_purpose::STANDARD.encode(signature.to_bytes());

        let registration_response = self
            .http
            .post(format!("{}/register", self.relay_url))
            .json(&serde_json::json!({
                "device_id": self.device_id,
                "public_key": public_key_b64,
                "challenge": challenge,
                "signature": signature_b64,
            }))
            .send()
            .await
            .map_err(network_error)?;
        if !registration_response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Registration failed: {}",
                registration_response.status()
            )));
        }

        let result: serde_json::Value = registration_response.json().await.map_err(network_error)?;
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
        if self
            .token_expires_at
            .is_some_and(|expiry| now_secs() >= expiry)
        {
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
        let response = self
            .http
            .post(format!("{}/send", self.relay_url))
            .bearer_auth(self.required_token()?)
            .json(&envelope)
            .send()
            .await
            .map_err(network_error)?;
        if !response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Send failed: {}",
                response.status()
            )));
        }
        let result: serde_json::Value = response.json().await.map_err(network_error)?;
        result
            .get("id")
            .and_then(serde_json::Value::as_str)
            .map(str::to_string)
            .ok_or_else(|| RelayError::NetworkError("Missing relay message id".into()))
    }

    pub async fn fetch(&self, limit: usize) -> Result<Vec<RelayEnvelope>, RelayError> {
        let response = self
            .http
            .post(format!("{}/fetch", self.relay_url))
            .bearer_auth(self.required_token()?)
            .json(&serde_json::json!({
                "device_id": self.device_id,
                "limit": limit,
            }))
            .send()
            .await
            .map_err(network_error)?;
        if !response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Fetch failed: {}",
                response.status()
            )));
        }
        response.json().await.map_err(network_error)
    }

    pub async fn acknowledge(&self, message_ids: &[String]) -> Result<usize, RelayError> {
        let response = self
            .http
            .post(format!("{}/ack", self.relay_url))
            .bearer_auth(self.required_token()?)
            .json(&serde_json::json!({
                "device_id": self.device_id,
                "message_ids": message_ids,
            }))
            .send()
            .await
            .map_err(network_error)?;
        if !response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Acknowledgement failed: {}",
                response.status()
            )));
        }
        let result: serde_json::Value = response.json().await.map_err(network_error)?;
        result
            .get("acknowledged")
            .and_then(serde_json::Value::as_u64)
            .map(|value| value as usize)
            .ok_or_else(|| RelayError::NetworkError("Missing acknowledgement count".into()))
    }

    pub async fn check_pending(&self) -> Result<usize, RelayError> {
        let response = self
            .http
            .get(format!("{}/pending", self.relay_url))
            .bearer_auth(self.required_token()?)
            .query(&[("device_id", self.device_id.as_str())])
            .send()
            .await
            .map_err(network_error)?;
        if !response.status().is_success() {
            return Err(RelayError::NetworkError(format!(
                "Pending check failed: {}",
                response.status()
            )));
        }
        let result: serde_json::Value = response.json().await.map_err(network_error)?;
        result
            .get("count")
            .and_then(serde_json::Value::as_u64)
            .map(|value| value as usize)
            .ok_or_else(|| RelayError::NetworkError("Missing pending count".into()))
    }
}

fn cleanup_pending_locked(pending: &mut HashMap<String, Vec<PendingMessage>>, now: u64) {
    for queue in pending.values_mut() {
        queue.retain(|message| !message.envelope.is_expired_at(now));
    }
    pending.retain(|_, queue| !queue.is_empty());
}

fn token_digest(token: &str) -> [u8; 32] {
    Sha256::digest(token.as_bytes()).into()
}

fn append_field(output: &mut Vec<u8>, field: &[u8]) {
    output.extend_from_slice(&(field.len() as u64).to_be_bytes());
    output.extend_from_slice(field);
}

fn state_error<T>(_: std::sync::PoisonError<T>) -> RelayError {
    RelayError::StateUnavailable("mutex poisoned".to_string())
}

fn network_error(error: reqwest::Error) -> RelayError {
    RelayError::NetworkError(error.to_string())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn validate_identifier(value: &str, name: &str) -> Result<(), RelayError> {
    let valid = !value.is_empty()
        && value.len() <= MAX_ID_LEN
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'));
    if !valid {
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

    fn signed_envelope(
        sender: &str,
        recipient: &str,
        key: &SigningKey,
        timestamp: u64,
    ) -> RelayEnvelope {
        let mut envelope = RelayEnvelope::new(
            sender,
            recipient,
            vec![1, 2, 3],
            vec![4; 32],
            vec![7; 24],
            "sync_delta",
        );
        envelope.timestamp = timestamp;
        envelope.sign(key);
        envelope
    }

    #[test]
    fn registration_requires_proof_rotates_tokens_and_rejects_replay() {
        let server = BlindRelayServer::new();
        let key = signing_key(7);
        let (first_token, _, first_challenge) = register_at(&server, "device-a", &key, 1_000);
        assert!(server
            .verify_token_at("device-a", &first_token, 1_001)
            .unwrap());

        let public_key = base64::engine::general_purpose::STANDARD
            .encode(key.verifying_key().to_bytes());
        let replay_signature =
            key.sign(registration_message("device-a", &first_challenge).as_bytes());
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
        assert!(!server
            .verify_token_at("device-a", &first_token, 1_004)
            .unwrap());
        assert!(server
            .verify_token_at("device-a", &second_token, 1_004)
            .unwrap());
    }

    #[test]
    fn capability_tokens_expire_and_are_not_stored_in_plaintext() {
        let server = BlindRelayServer::new();
        let (token, expires_at, _) = register_at(&server, "device-a", &signing_key(3), 500);
        assert!(server
            .verify_token_at("device-a", &token, expires_at - 1)
            .unwrap());
        assert!(!server
            .verify_token_at("device-a", &token, expires_at)
            .unwrap());
        let stored = server.tokens.lock().unwrap();
        assert_ne!(stored["device-a"].digest.as_slice(), token.as_bytes());
    }

    #[test]
    fn relay_requires_registered_sender_recipient_signature_and_token() {
        let server = BlindRelayServer::new();
        let now = now_secs();
        let sender_key = signing_key(4);
        let (sender_token, _, _) = register_at(&server, "device-a", &sender_key, now);
        register_at(&server, "device-b", &signing_key(5), now);

        let envelope = signed_envelope("device-a", "device-b", &sender_key, now);
        let id = server
            .submit_message_authorized(&sender_token, envelope)
            .expect("authenticated sender should queue a message");
        assert!(!id.is_empty());
        assert_eq!(server.pending_count("device-b").unwrap(), 1);

        let mut forged = signed_envelope("device-a", "device-b", &signing_key(9), now);
        forged.id = "forged-message".into();
        forged.sign(&signing_key(9));
        assert!(matches!(
            server.submit_message_authorized(&sender_token, forged),
            Err(RelayError::InvalidSignature)
        ));
    }

    #[test]
    fn fetch_leases_until_ack_and_redelivers_after_timeout() {
        let server = BlindRelayServer::new();
        let now = now_secs();
        let sender_key = signing_key(4);
        let (sender_token, _, _) = register_at(&server, "device-a", &sender_key, now);
        register_at(&server, "device-b", &signing_key(5), now);
        let envelope = signed_envelope("device-a", "device-b", &sender_key, now);
        let id = envelope.id.clone();
        server
            .submit_message_authorized(&sender_token, envelope)
            .unwrap();

        let first = server.lease_messages_at("device-b", 10, now).unwrap();
        assert_eq!(first.len(), 1);
        assert!(server
            .lease_messages_at("device-b", 10, now + 1)
            .unwrap()
            .is_empty());
        let redelivered = server
            .lease_messages_at("device-b", 10, now + DELIVERY_LEASE_SECS)
            .unwrap();
        assert_eq!(redelivered.len(), 1);
        assert_eq!(server.acknowledge_messages("device-b", &[id]).unwrap(), 1);
        assert_eq!(server.pending_count("device-b").unwrap(), 0);
    }

    #[test]
    fn duplicate_message_ids_are_rejected() {
        let server = BlindRelayServer::new();
        let now = now_secs();
        let sender_key = signing_key(4);
        let (sender_token, _, _) = register_at(&server, "device-a", &sender_key, now);
        register_at(&server, "device-b", &signing_key(5), now);
        let envelope = signed_envelope("device-a", "device-b", &sender_key, now);
        server
            .submit_message_authorized(&sender_token, envelope.clone())
            .unwrap();
        assert!(matches!(
            server.submit_message_authorized(&sender_token, envelope),
            Err(RelayError::DuplicateMessage)
        ));
    }

    #[test]
    fn challenge_capacity_prunes_expired_entries() {
        let server = BlindRelayServer::new();
        let key = signing_key(1);
        let public_key = base64::engine::general_purpose::STANDARD
            .encode(key.verifying_key().to_bytes());
        {
            let mut challenges = server.challenges.lock().unwrap();
            for index in 0..MAX_REGISTRATION_CHALLENGES {
                challenges.insert(
                    format!("expired-{index}"),
                    RegistrationChallenge {
                        public_key: key.verifying_key().to_bytes(),
                        challenge: [0; 32],
                        expires_at: 10,
                    },
                );
            }
        }
        assert!(server
            .begin_registration_at("device-a", &public_key, 11)
            .is_ok());
        assert_eq!(server.challenges.lock().unwrap().len(), 1);
    }

    #[test]
    fn envelope_lengths_and_future_skew_are_enforced() {
        let key = signing_key(1);
        let mut envelope = signed_envelope("device-a", "device-b", &key, 1_000);
        envelope.ephemeral_pubkey.pop();
        assert!(matches!(
            envelope.validate_at(1_000),
            Err(RelayError::InvalidEnvelope(_))
        ));

        let mut future = signed_envelope("device-a", "device-b", &key, 1_000);
        future.timestamp = 1_000 + MAX_FUTURE_SKEW_SECS + 1;
        future.sign(&key);
        assert!(matches!(
            future.validate_at(1_000),
            Err(RelayError::InvalidEnvelope(_))
        ));
    }
}
