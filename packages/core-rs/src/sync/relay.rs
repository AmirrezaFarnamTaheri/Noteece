//! Blind Relay Server Implementation
//!
//! Provides encrypted store-and-forward sync for devices outside the LAN.
//! The relay server never has access to plaintext - all data is end-to-end encrypted.
//!
//! Architecture:
//! ```text
//! Device A -> [Encrypted Blob] -> Relay Server -> [Encrypted Blob] -> Device B
//!                                      |
//!                                 (No access to
//!                                  plaintext)
//! ```

use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

/// Maximum age for pending messages (24 hours)
const MAX_MESSAGE_AGE_SECS: u64 = 86400;

/// Maximum message size (10 MB)
const MAX_MESSAGE_SIZE: usize = 10 * 1024 * 1024;

/// Maximum pending messages per device
const MAX_PENDING_PER_DEVICE: usize = 100;

/// Maximum size for the small binary envelope fields (pubkey/nonce/signature).
const MAX_SMALL_FIELD: usize = 4 * 1024;

/// Maximum length for envelope string fields (ids, device ids, message type).
const MAX_ID_LEN: usize = 256;

/// Maximum number of distinct recipient queues held in memory (DoS ceiling).
const MAX_TOTAL_QUEUES: usize = 100_000;

/// Maximum number of registered devices (DoS ceiling).
const MAX_REGISTERED_DEVICES: usize = 100_000;

/// Reject client timestamps more than this far in the future (clock-skew ceiling)
/// so a far-future timestamp cannot defeat message expiry.
const MAX_FUTURE_SKEW_SECS: u64 = 300;

#[derive(Error, Debug)]
pub enum RelayError {
    #[error("Device not registered")]
    DeviceNotRegistered,
    #[error("Message too large (max {MAX_MESSAGE_SIZE} bytes)")]
    MessageTooLarge,
    #[error("Too many pending messages")]
    TooManyPending,
    #[error("Message expired")]
    MessageExpired,
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Invalid envelope: {0}")]
    InvalidEnvelope(String),
    #[error("Relay at capacity")]
    AtCapacity,
    #[error("Encryption error: {0}")]
    EncryptionError(String),
    #[error("Network error: {0}")]
    NetworkError(String),
}

/// Encrypted message envelope for relay
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayEnvelope {
    /// Unique message ID
    pub id: String,
    /// Sender device ID (anonymous hash)
    pub from_device: String,
    /// Recipient device ID (anonymous hash)
    pub to_device: String,
    /// Encrypted payload (opaque to relay)
    pub ciphertext: Vec<u8>,
    /// Ephemeral public key for decryption
    pub ephemeral_pubkey: Vec<u8>,
    /// Nonce used for encryption
    pub nonce: Vec<u8>,
    /// Timestamp (for expiry)
    pub timestamp: u64,
    /// Message type hint (sync_manifest, sync_delta, etc.)
    pub message_type: String,
    /// Signature for authenticity
    pub signature: Vec<u8>,
}

impl RelayEnvelope {
    /// Create a new relay envelope
    pub fn new(
        from_device: &str,
        to_device: &str,
        ciphertext: Vec<u8>,
        ephemeral_pubkey: Vec<u8>,
        nonce: Vec<u8>,
        message_type: &str,
    ) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(std::time::Duration::from_secs(0))
            .as_secs();

        Self {
            id: ulid::Ulid::new().to_string(),
            from_device: from_device.to_string(),
            to_device: to_device.to_string(),
            ciphertext,
            ephemeral_pubkey,
            nonce,
            timestamp,
            message_type: message_type.to_string(),
            signature: Vec::new(), // Filled by sign()
        }
    }

    /// Check if message has expired
    pub fn is_expired(&self) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(std::time::Duration::from_secs(0))
            .as_secs();
        now.saturating_sub(self.timestamp) > MAX_MESSAGE_AGE_SECS
    }

    /// Validate envelope size
    pub fn validate_size(&self) -> Result<(), RelayError> {
        if self.ciphertext.len() > MAX_MESSAGE_SIZE {
            return Err(RelayError::MessageTooLarge);
        }
        Ok(())
    }

    /// Validate all attacker-controlled fields, not just the ciphertext. Bounds the
    /// small binary fields and string fields so a small ciphertext cannot smuggle a
    /// multi-megabyte nonce/pubkey/signature or an unbounded device-id map key.
    pub fn validate(&self) -> Result<(), RelayError> {
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
        if self.id.is_empty() || self.to_device.is_empty() {
            return Err(RelayError::InvalidEnvelope("missing id or recipient".into()));
        }
        // Reject far-future timestamps so client-supplied time cannot defeat expiry.
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(std::time::Duration::from_secs(0))
            .as_secs();
        if self.timestamp > now.saturating_add(MAX_FUTURE_SKEW_SECS) {
            return Err(RelayError::InvalidEnvelope("timestamp too far in future".into()));
        }
        Ok(())
    }
}

/// Pending message in relay queue
#[derive(Debug, Clone)]
struct PendingMessage {
    envelope: RelayEnvelope,
    _received_at: u64,
}

/// In-memory relay server (for development/testing)
/// Production would use a distributed store (Redis, etc.)
pub struct BlindRelayServer {
    /// Pending messages per device
    pending: Arc<Mutex<HashMap<String, Vec<PendingMessage>>>>,
    /// Registered devices (device_id -> public_key_hash)
    devices: Arc<Mutex<HashMap<String, String>>>,
    /// Capability tokens (device_id -> bearer token) gating mailbox access.
    tokens: Arc<Mutex<HashMap<String, String>>>,
}

impl Default for BlindRelayServer {
    fn default() -> Self {
        Self::new()
    }
}

impl BlindRelayServer {
    /// Create new relay server
    pub fn new() -> Self {
        Self {
            pending: Arc::new(Mutex::new(HashMap::new())),
            devices: Arc::new(Mutex::new(HashMap::new())),
            tokens: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Issue (or return the existing) capability token for a registered device.
    /// The token must be presented to fetch/inspect that device's mailbox, closing
    /// the unauthenticated-drain hole where any caller could read a queue by id.
    pub fn issue_token(&self, device_id: &str) -> Result<String, RelayError> {
        let mut tokens = self
            .tokens
            .lock()
            .map_err(|_| RelayError::EncryptionError("Mutex poisoned".to_string()))?;
        if let Some(existing) = tokens.get(device_id) {
            return Ok(existing.clone());
        }
        let mut raw = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut raw);
        let token = hex::encode(raw);
        tokens.insert(device_id.to_string(), token.clone());
        Ok(token)
    }

    /// Constant-time-ish check that a token authorizes access to a device mailbox.
    pub fn verify_token(&self, device_id: &str, token: &str) -> bool {
        match self.tokens.lock() {
            Ok(tokens) => tokens.get(device_id).map(|t| t.as_str()) == Some(token),
            Err(_) => false,
        }
    }

    /// Register a device with the relay
    pub fn register_device(
        &self,
        device_id: &str,
        public_key_hash: &str,
    ) -> Result<(), RelayError> {
        if device_id.is_empty()
            || device_id.len() > MAX_ID_LEN
            || public_key_hash.is_empty()
            || public_key_hash.len() > MAX_ID_LEN
        {
            return Err(RelayError::InvalidEnvelope("invalid registration".into()));
        }
        let mut devices = self
            .devices
            .lock()
            .map_err(|_| RelayError::EncryptionError("Mutex poisoned".to_string()))?;

        match devices.get(device_id) {
            // Re-registration with the same key is idempotent and allowed.
            Some(existing) if existing == public_key_hash => {}
            // Reject silently overwriting an existing device's key (TOFU): a mismatch
            // would let anyone hijack a registered device id's identity mapping.
            Some(_) => {
                return Err(RelayError::InvalidEnvelope(
                    "device id already registered with a different key".into(),
                ));
            }
            None => {
                if devices.len() >= MAX_REGISTERED_DEVICES {
                    return Err(RelayError::AtCapacity);
                }
                devices.insert(device_id.to_string(), public_key_hash.to_string());
            }
        }
        log::info!("[relay] Registered device: {}", device_id);
        Ok(())
    }

    /// Unregister a device
    pub fn unregister_device(&self, device_id: &str) {
        if let Ok(mut devices) = self.devices.lock() {
            devices.remove(device_id);
        }

        // Also clear pending messages
        if let Ok(mut pending) = self.pending.lock() {
            pending.remove(device_id);
        }

        // Revoke the mailbox capability token.
        if let Ok(mut tokens) = self.tokens.lock() {
            tokens.remove(device_id);
        }

        log::info!("[relay] Unregistered device: {}", device_id);
    }

    /// Submit a message for relay
    pub fn submit_message(&self, envelope: RelayEnvelope) -> Result<String, RelayError> {
        // Validate all attacker-controlled fields (size, small fields, ids, skew).
        envelope.validate()?;

        if envelope.is_expired() {
            return Err(RelayError::MessageExpired);
        }

        // Add to pending queue
        let msg_id = envelope.id.clone();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(std::time::Duration::from_secs(0))
            .as_secs();

        {
            let mut pending = self
                .pending
                .lock()
                .map_err(|_| RelayError::EncryptionError("Mutex poisoned".to_string()))?;

            // Cap the number of distinct recipient queues so an attacker cannot
            // exhaust memory by sending to unlimited random device ids.
            if !pending.contains_key(&envelope.to_device) && pending.len() >= MAX_TOTAL_QUEUES {
                return Err(RelayError::AtCapacity);
            }

            let queue = pending.entry(envelope.to_device.clone()).or_default();

            // Check limits
            if queue.len() >= MAX_PENDING_PER_DEVICE {
                // Prune expired messages first
                queue.retain(|m| !m.envelope.is_expired());

                if queue.len() >= MAX_PENDING_PER_DEVICE {
                    return Err(RelayError::TooManyPending);
                }
            }

            queue.push(PendingMessage {
                envelope,
                _received_at: now,
            });
        }

        log::info!("[relay] Message {} queued for delivery", msg_id);
        Ok(msg_id)
    }

    /// Fetch pending messages for a device
    pub fn fetch_messages(&self, device_id: &str, limit: usize) -> Vec<RelayEnvelope> {
        let mut pending = match self.pending.lock() {
            Ok(g) => g,
            Err(_) => return Vec::new(),
        };

        if let Some(queue) = pending.get_mut(device_id) {
            // Remove expired messages
            queue.retain(|m| !m.envelope.is_expired());

            // Take up to limit messages
            let count = queue.len().min(limit);
            let messages: Vec<RelayEnvelope> = queue.drain(..count).map(|m| m.envelope).collect();

            log::info!(
                "[relay] Delivered {} messages to {}",
                messages.len(),
                device_id
            );
            messages
        } else {
            Vec::new()
        }
    }

    /// Get pending message count for a device
    pub fn pending_count(&self, device_id: &str) -> usize {
        let pending = match self.pending.lock() {
            Ok(g) => g,
            Err(_) => return 0,
        };
        pending.get(device_id).map(|q| q.len()).unwrap_or(0)
    }

    /// Cleanup expired messages
    pub fn cleanup_expired(&self) -> usize {
        let mut pending = match self.pending.lock() {
            Ok(g) => g,
            Err(_) => return 0,
        };
        let mut cleaned = 0;

        for queue in pending.values_mut() {
            let before = queue.len();
            queue.retain(|m| !m.envelope.is_expired());
            cleaned += before - queue.len();
        }

        // Drop now-empty queues so the queue map itself cannot grow without bound
        // from transient recipients that never fetch.
        pending.retain(|_, queue| !queue.is_empty());

        if cleaned > 0 {
            log::info!("[relay] Cleaned up {} expired messages", cleaned);
        }

        cleaned
    }

    /// Get server statistics
    pub fn stats(&self) -> RelayStats {
        let pending = match self.pending.lock() {
            Ok(g) => g,
            Err(_) => {
                return RelayStats {
                    registered_devices: 0,
                    total_pending_messages: 0,
                    active_queues: 0,
                }
            }
        };

        let devices = match self.devices.lock() {
            Ok(g) => g,
            Err(_) => {
                return RelayStats {
                    registered_devices: 0,
                    total_pending_messages: 0,
                    active_queues: 0,
                }
            }
        };

        let total_pending: usize = pending.values().map(|q| q.len()).sum();

        RelayStats {
            registered_devices: devices.len(),
            total_pending_messages: total_pending,
            active_queues: pending.len(),
        }
    }
}

/// Relay server statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayStats {
    pub registered_devices: usize,
    pub total_pending_messages: usize,
    pub active_queues: usize,
}

/// Client for connecting to a blind relay server
pub struct RelayClient {
    /// Device ID
    device_id: String,
    /// Relay server URL
    relay_url: String,
    /// Authentication token
    auth_token: Option<String>,
}

impl RelayClient {
    /// Create new relay client
    pub fn new(device_id: &str, relay_url: &str) -> Self {
        Self {
            device_id: device_id.to_string(),
            relay_url: relay_url.to_string(),
            auth_token: None,
        }
    }

    /// Register with relay server
    pub async fn register(&mut self, public_key_hash: &str) -> Result<(), RelayError> {
        let url = format!("{}/register", self.relay_url);

        let body = serde_json::json!({
            "device_id": self.device_id,
            "public_key_hash": public_key_hash,
        });

        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| RelayError::NetworkError(e.to_string()))?;

        if response.status().is_success() {
            let result: serde_json::Value = response
                .json()
                .await
                .map_err(|e| RelayError::NetworkError(e.to_string()))?;

            if let Some(token) = result.get("token").and_then(|t| t.as_str()) {
                self.auth_token = Some(token.to_string());
            }

            log::info!("[relay_client] Registered with relay server");
            Ok(())
        } else {
            Err(RelayError::NetworkError(format!(
                "Registration failed: {}",
                response.status()
            )))
        }
    }

    /// Send message via relay
    pub async fn send(&self, envelope: RelayEnvelope) -> Result<String, RelayError> {
        let url = format!("{}/send", self.relay_url);

        let client = reqwest::Client::new();
        let mut request = client.post(&url).json(&envelope);

        if let Some(ref token) = self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request
            .send()
            .await
            .map_err(|e| RelayError::NetworkError(e.to_string()))?;

        if response.status().is_success() {
            let result: serde_json::Value = response
                .json()
                .await
                .map_err(|e| RelayError::NetworkError(e.to_string()))?;

            let msg_id = result
                .get("id")
                .and_then(|id| id.as_str())
                .unwrap_or("unknown")
                .to_string();

            Ok(msg_id)
        } else {
            Err(RelayError::NetworkError(format!(
                "Send failed: {}",
                response.status()
            )))
        }
    }

    /// Fetch pending messages
    pub async fn fetch(&self, limit: usize) -> Result<Vec<RelayEnvelope>, RelayError> {
        let url = format!(
            "{}/fetch?device_id={}&limit={}",
            self.relay_url, self.device_id, limit
        );

        let client = reqwest::Client::new();
        let mut request = client.get(&url);

        if let Some(ref token) = self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request
            .send()
            .await
            .map_err(|e| RelayError::NetworkError(e.to_string()))?;

        if response.status().is_success() {
            let messages: Vec<RelayEnvelope> = response
                .json()
                .await
                .map_err(|e| RelayError::NetworkError(e.to_string()))?;

            Ok(messages)
        } else {
            Err(RelayError::NetworkError(format!(
                "Fetch failed: {}",
                response.status()
            )))
        }
    }

    /// Check for pending messages
    pub async fn check_pending(&self) -> Result<usize, RelayError> {
        let url = format!("{}/pending?device_id={}", self.relay_url, self.device_id);

        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| RelayError::NetworkError(e.to_string()))?;

        if response.status().is_success() {
            let result: serde_json::Value = response
                .json()
                .await
                .map_err(|e| RelayError::NetworkError(e.to_string()))?;

            let count = result.get("count").and_then(|c| c.as_u64()).unwrap_or(0) as usize;

            Ok(count)
        } else {
            Ok(0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_envelope_creation() {
        let envelope = RelayEnvelope::new(
            "device_a",
            "device_b",
            vec![1, 2, 3, 4],
            vec![5, 6, 7, 8],
            vec![9, 10, 11, 12],
            "sync_manifest",
        );

        assert!(!envelope.id.is_empty());
        assert_eq!(envelope.from_device, "device_a");
        assert_eq!(envelope.to_device, "device_b");
        assert!(!envelope.is_expired());
    }

    #[test]
    fn test_relay_server_basic() {
        let server = BlindRelayServer::new();

        // Register devices
        server
            .register_device("device_a", "hash_a")
            .expect("Register device_a failed");
        server
            .register_device("device_b", "hash_b")
            .expect("Register device_b failed");

        // Submit message
        let envelope = RelayEnvelope::new(
            "device_a",
            "device_b",
            vec![1, 2, 3],
            vec![4, 5, 6],
            vec![7, 8, 9],
            "test",
        );

        let msg_id = server
            .submit_message(envelope)
            .expect("Submit message failed");
        assert!(!msg_id.is_empty());

        // Check pending
        assert_eq!(server.pending_count("device_b"), 1);

        // Fetch messages
        let messages = server.fetch_messages("device_b", 10);
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].from_device, "device_a");

        // Queue should be empty now
        assert_eq!(server.pending_count("device_b"), 0);
    }

    #[test]
    fn test_message_size_limit() {
        let server = BlindRelayServer::new();
        server
            .register_device("device_a", "hash_a")
            .expect("Register device_a failed");
        server
            .register_device("device_b", "hash_b")
            .expect("Register device_b failed");

        // Create oversized message
        let large_payload = vec![0u8; MAX_MESSAGE_SIZE + 1];
        let envelope = RelayEnvelope::new(
            "device_a",
            "device_b",
            large_payload,
            vec![],
            vec![],
            "test",
        );

        let result = server.submit_message(envelope);
        assert!(matches!(result, Err(RelayError::MessageTooLarge)));
    }

    #[test]
    fn test_stats() {
        let server = BlindRelayServer::new();
        server
            .register_device("device_a", "hash_a")
            .expect("Register device_a failed");

        let stats = server.stats();
        assert_eq!(stats.registered_devices, 1);
        assert_eq!(stats.total_pending_messages, 0);
    }
}
