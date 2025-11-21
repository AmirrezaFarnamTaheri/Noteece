// P2P Sync Implementation
// This module integrates the discovery and mobile_sync modules to provide a complete P2P sync solution.

use super::discovery::{DiscoveredDevice, DiscoveryService};
use super::mobile_sync::{DeviceInfo, SyncCategory, SyncProtocol};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use thiserror::Error;
use tokio::io::AsyncReadExt;
use tokio::net::TcpListener;

#[derive(Error, Debug)]
pub enum P2pError {
    #[error("Discovery error: {0}")]
    Discovery(String),
    #[error("Sync protocol error: {0}")]
    Sync(String),
    #[error("Network error: {0}")]
    Network(String),
}

pub struct P2pSync {
    discovery: Arc<DiscoveryService>,
    protocol: Arc<Mutex<SyncProtocol>>,
}

impl P2pSync {
    pub fn new(device_info: DeviceInfo) -> Result<Self, P2pError> {
        let discovery = DiscoveryService::new().map_err(|e| P2pError::Discovery(e.to_string()))?;
        let protocol = SyncProtocol::new(device_info);

        Ok(Self {
            discovery: Arc::new(discovery),
            protocol: Arc::new(Mutex::new(protocol)),
        })
    }

    pub async fn start_server(&self, port: u16) -> Result<(), P2pError> {
        let listener = TcpListener::bind(format!("0.0.0.0:{}", port))
            .await
            .map_err(|e| P2pError::Network(e.to_string()))?;
        log::info!("[p2p] Sync server listening on port {}", port);

        loop {
            let (mut socket, _) = listener
                .accept()
                .await
                .map_err(|e| P2pError::Network(e.to_string()))?;

            let peer_addr = socket.peer_addr().map(|a| a.to_string()).unwrap_or_else(|_| "unknown".to_string());
            log::info!("[p2p] New connection from {}", peer_addr);

            tokio::spawn(async move {
                let mut buf = [0; 1024];
                loop {
                    let n = match socket.read(&mut buf).await {
                        Ok(n) if n == 0 => return,
                        Ok(n) => n,
                        Err(e) => {
                            log::error!("[p2p] failed to read from socket; err = {:?}", e);
                            return;
                        }
                    };
                    log::info!("[p2p] received {} bytes", n);
                }
            });
        }
    }

    pub fn discover_peers(&self) -> Result<Vec<DiscoveredDevice>, P2pError> {
        self.discovery
            .discover(Duration::from_secs(5))
            .map_err(|e| P2pError::Discovery(e.to_string()))
    }

    pub async fn start_sync(&self, device_id: &str) -> Result<(), P2pError> {
        let mut protocol = self.protocol.lock().map_err(|_| P2pError::Sync("Mutex poisoned".to_string()))?;
        protocol
            .start_sync(device_id, vec![SyncCategory::Posts])
            .await
            .map_err(|e| P2pError::Sync(e.to_string()))
    }
}
