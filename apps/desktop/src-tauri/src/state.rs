use crate::db_pool::EncryptedConnectionManager;
use core_rs::sync::p2p::P2pSync;
use r2d2::Pool;
use std::sync::{Arc, Mutex};
use zeroize::Zeroizing;

pub struct SecureDek(Zeroizing<Vec<u8>>);

impl SecureDek {
    pub fn new(key: Vec<u8>) -> Self {
        Self(Zeroizing::new(key))
    }

    pub fn as_slice(&self) -> &[u8] {
        self.0.as_slice()
    }
}

pub struct DbConnection {
    // Replaced single connection with a Pool
    pub pool: Mutex<Option<Pool<EncryptedConnectionManager>>>,
    pub dek: Mutex<Option<SecureDek>>,
    pub p2p_sync: Mutex<Option<Arc<P2pSync>>>,
}
