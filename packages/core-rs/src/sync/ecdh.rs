/// ECDH (Elliptic Curve Diffie-Hellman) Key Exchange
/// Enables secure key establishment between desktop and mobile devices
/// Uses X25519 (Curve25519) for security and performance
use serde::{Deserialize, Serialize};
use thiserror::Error;
use x25519_dalek::{PublicKey as X25519PublicKey, StaticSecret};

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
    /// Raw public key bytes (32 bytes for X25519)
    pub bytes: Vec<u8>,
}

/// ECDH key pair for a device
pub struct KeyPair {
    // StaticSecret is not Clone/Serialize, so we wrap it
    // We don't expose private key bytes directly
    secret: StaticSecret,
    pub public_key: PublicKey,
}

impl KeyPair {
    /// Generate new ECDH key pair using X25519
    pub fn generate() -> Result<Self, ECDHError> {
        let secret = StaticSecret::random_from_rng(rand_core::OsRng);
        let public_key_obj = X25519PublicKey::from(&secret);

        Ok(KeyPair {
            secret,
            public_key: PublicKey {
                bytes: public_key_obj.to_bytes().to_vec(),
            },
        })
    }

    /// Perform ECDH: derive shared secret from our private key and peer's public key
    pub fn shared_secret(&self, peer_public_key: &PublicKey) -> Result<Vec<u8>, ECDHError> {
        if peer_public_key.bytes.len() != 32 {
            return Err(ECDHError::InvalidPublicKey);
        }

        let mut peer_bytes = [0u8; 32];
        peer_bytes.copy_from_slice(&peer_public_key.bytes);

        let peer_point = X25519PublicKey::from(peer_bytes);
        let shared_secret = self.secret.diffie_hellman(&peer_point);

        Ok(shared_secret.to_bytes().to_vec())
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
    // We store the KeyPair struct which holds the secret
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
        if peer_public_key.bytes.len() != 32 {
            return Err(ECDHError::InvalidPublicKey);
        }
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
        assert_eq!(keypair.public_key.bytes.len(), 32);
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
        assert_eq!(secret1, secret2);
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
