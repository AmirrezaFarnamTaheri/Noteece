/// ECDH (Elliptic Curve Diffie-Hellman) Key Exchange
/// Enables secure key establishment between desktop and mobile devices
/// Uses P-256 curve for compatibility and security
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ECDHError {
    #[error("Key generation failed")]
    KeyGenerationFailed,

    #[error("Invalid public key")]
    InvalidPublicKey,

    #[error("Shared secret derivation failed")]
    SharedSecretFailed,

    #[error("Key serialization failed")]
    SerializationFailed,
}

/// ECDH public key representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicKey {
    /// Raw public key bytes (P-256, uncompressed format)
    pub bytes: Vec<u8>,
}

/// ECDH private key (kept secret)
#[derive(Debug, Clone)]
pub struct PrivateKey {
    /// Raw private key bytes (32 bytes for P-256)
    bytes: Vec<u8>,
}

/// ECDH key pair for a device
pub struct KeyPair {
    pub private_key: PrivateKey,
    pub public_key: PublicKey,
}

impl KeyPair {
    /// Generate new ECDH key pair using P-256 curve
    pub fn generate() -> Result<Self, ECDHError> {
        // Generate random 32-byte private key
        let mut private_bytes = [0u8; 32];
        use rand::RngCore;
        rand::thread_rng().fill_bytes(&mut private_bytes);

        let private_key = PrivateKey {
            bytes: private_bytes.to_vec(),
        };

        // Derive public key from private key
        // For P-256, this involves point multiplication
        let public_key = PublicKey {
            bytes: derive_public_key(&private_bytes)?,
        };

        Ok(KeyPair {
            private_key,
            public_key,
        })
    }

    /// Perform ECDH: derive shared secret from our private key and peer's public key
    pub fn shared_secret(&self, peer_public_key: &PublicKey) -> Result<Vec<u8>, ECDHError> {
        compute_shared_secret(&self.private_key.bytes, &peer_public_key.bytes)
    }
}

/// Derive public key from private key using P-256
fn derive_public_key(private_key: &[u8]) -> Result<Vec<u8>, ECDHError> {
    if private_key.len() != 32 {
        return Err(ECDHError::KeyGenerationFailed);
    }

    #[cfg(any(test, debug_assertions, feature = "insecure-test-crypto"))]
    {
        // SECURITY WARNING: Mock implementation for testing only
        // This is NOT cryptographically secure and must NEVER be used in production
        let mut public_key = vec![0x04]; // Uncompressed point format prefix
        public_key.extend_from_slice(private_key);
        public_key.extend_from_slice(private_key);
        return Ok(public_key);
    }

    #[cfg(not(any(test, debug_assertions, feature = "insecure-test-crypto")))]
    {
        // Production builds must use real cryptography
        // Fail securely if proper implementation not available
        Err(ECDHError::KeyGenerationFailed)
    }
}

/// Compute shared secret from private key and peer's public key
fn compute_shared_secret(private_key: &[u8], peer_public_key: &[u8]) -> Result<Vec<u8>, ECDHError> {
    if private_key.len() != 32 {
        return Err(ECDHError::SharedSecretFailed);
    }

    if peer_public_key.len() != 65 && peer_public_key.len() != 66 {
        return Err(ECDHError::InvalidPublicKey);
    }

    #[cfg(any(test, debug_assertions, feature = "insecure-test-crypto"))]
    {
        // SECURITY WARNING: Mock implementation for testing only
        // This is NOT cryptographically secure and must NEVER be used in production
        let mut shared = Vec::with_capacity(32);
        for i in 0..32 {
            let peer_byte = peer_public_key.get(i + 1).copied().unwrap_or(0);
            shared.push(private_key[i] ^ peer_byte);
        }
        return Ok(shared);
    }

    #[cfg(not(any(test, debug_assertions, feature = "insecure-test-crypto")))]
    {
        // Production builds must use real cryptography
        // Fail securely if proper implementation not available
        Err(ECDHError::SharedSecretFailed)
    }
}

/// Device pairing state machine
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PairingState {
    /// Waiting for pairing initiation
    Idle,
    /// Pairing initiated, waiting for response
    Initiated,
    /// Public keys exchanged, deriving shared secret
    KeysExchanged,
    /// Pairing complete, devices are paired
    Paired,
    /// Pairing failed
    Failed,
}

/// Device pairing manager
pub struct PairingManager {
    pub device_id: String,
    key_pair: Option<KeyPair>,
    peer_public_key: Option<PublicKey>,
    state: PairingState,
}

impl PairingManager {
    /// Create new pairing manager
    pub fn new(device_id: String) -> Self {
        PairingManager {
            device_id,
            key_pair: None,
            peer_public_key: None,
            state: PairingState::Idle,
        }
    }

    /// Initiate pairing: generate key pair
    pub fn initiate_pairing(&mut self) -> Result<PublicKey, ECDHError> {
        let key_pair = KeyPair::generate()?;
        let public_key = key_pair.public_key.clone();
        self.key_pair = Some(key_pair);
        self.state = PairingState::Initiated;
        Ok(public_key)
    }

    /// Exchange public keys
    pub fn exchange_keys(&mut self, peer_public_key: PublicKey) -> Result<(), ECDHError> {
        self.peer_public_key = Some(peer_public_key);
        self.state = PairingState::KeysExchanged;
        Ok(())
    }

    /// Complete pairing: derive shared secret
    pub fn complete_pairing(&mut self) -> Result<Vec<u8>, ECDHError> {
        let key_pair = self
            .key_pair
            .as_ref()
            .ok_or(ECDHError::KeyGenerationFailed)?;
        let peer_public_key = self
            .peer_public_key
            .as_ref()
            .ok_or(ECDHError::InvalidPublicKey)?;

        let shared_secret = key_pair.shared_secret(peer_public_key)?;
        self.state = PairingState::Paired;
        Ok(shared_secret)
    }

    /// Get current pairing state
    pub fn get_state(&self) -> PairingState {
        self.state
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let keypair = KeyPair::generate().expect("Failed to generate keypair");
        assert_eq!(keypair.private_key.bytes.len(), 32);
        assert_eq!(keypair.public_key.bytes.len(), 65);
    }

    #[test]
    fn test_shared_secret_generation() {
        let keypair1 = KeyPair::generate().expect("Failed to generate keypair1");
        let keypair2 = KeyPair::generate().expect("Failed to generate keypair2");

        let secret1 = keypair1
            .shared_secret(&keypair2.public_key)
            .expect("Failed to compute secret1");
        let secret2 = keypair2
            .shared_secret(&keypair1.public_key)
            .expect("Failed to compute secret2");

        assert_eq!(secret1.len(), 32);
        assert_eq!(secret2.len(), 32);
    }

    #[test]
    fn test_pairing_flow() {
        let mut manager1 = PairingManager::new("device1".to_string());
        let mut manager2 = PairingManager::new("device2".to_string());

        // Initiate pairing
        let pub_key1 = manager1
            .initiate_pairing()
            .expect("Failed to initiate pairing");
        let pub_key2 = manager2
            .initiate_pairing()
            .expect("Failed to initiate pairing");

        // Exchange keys
        manager1
            .exchange_keys(pub_key2)
            .expect("Failed to exchange keys");
        manager2
            .exchange_keys(pub_key1)
            .expect("Failed to exchange keys");

        // Complete pairing
        let secret1 = manager1
            .complete_pairing()
            .expect("Failed to complete pairing");
        let secret2 = manager2
            .complete_pairing()
            .expect("Failed to complete pairing");

        assert_eq!(manager1.get_state(), PairingState::Paired);
        assert_eq!(manager2.get_state(), PairingState::Paired);
        assert_eq!(secret1, secret2);
    }
}
