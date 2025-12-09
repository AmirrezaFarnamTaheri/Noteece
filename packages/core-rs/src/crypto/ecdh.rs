use rand::rngs::OsRng;
use x25519_dalek::{EphemeralSecret, PublicKey};

pub struct EcdhKeyPair {
    secret: EphemeralSecret,
    public: PublicKey,
}

impl EcdhKeyPair {
    pub fn generate() -> Result<Self, String> {
        let secret = EphemeralSecret::random_from_rng(OsRng);
        let public = PublicKey::from(&secret);
        Ok(Self { secret, public })
    }

    pub fn public_key_bytes(&self) -> [u8; 32] {
        *self.public.as_bytes()
    }

    pub fn diffie_hellman(self, peer_public_bytes: &[u8; 32]) -> Result<[u8; 32], String> {
        let peer_public = PublicKey::from(*peer_public_bytes);
        let shared_secret = self.secret.diffie_hellman(&peer_public);
        Ok(*shared_secret.as_bytes())
    }
}
