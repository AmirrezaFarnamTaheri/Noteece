use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use zeroize::Zeroizing;
use core_rs::sync::p2p::P2pSync;

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
    pub conn: Mutex<Option<Connection>>,
    pub dek: Mutex<Option<SecureDek>>,
    pub p2p_sync: Mutex<Option<Arc<P2pSync>>>,
}
