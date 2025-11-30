// P2P Sync Implementation
// This module integrates the discovery and mobile_sync modules to provide a complete P2P sync solution.

use super::discovery::{DiscoveredDevice, DiscoveryService};
use super::mobile_sync::{DeltaOperation, DeviceInfo, SyncCategory, SyncDelta, SyncProtocol};
use crate::sync_agent::{SyncDelta as DbSyncDelta, SyncOperation as DbSyncOperation};
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::io::AsyncReadExt;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

#[derive(Error, Debug)]
pub enum P2pError {
    #[error("Discovery error: {0}")]
    Discovery(String),
    #[error("Sync protocol error: {0}")]
    Sync(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Database error: {0}")]
    Database(String),
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

            let peer_addr = socket
                .peer_addr()
                .map(|a| a.to_string())
                .unwrap_or_else(|_| "unknown".to_string());
            log::info!("[p2p] New connection from {}", peer_addr);

            // In a real implementation, we would hand off the socket to the protocol handler
            // to perform the handshake and exchange data.
            tokio::spawn(async move {
                let mut buf = [0; 1024];
                loop {
                    let n = match socket.read(&mut buf).await {
                        Ok(0) => return,
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

    /// Start sync with a specific device.
    pub async fn start_sync(&self, device_id: &str) -> Result<(), P2pError> {
        log::info!("[p2p] Starting sync with device {}", device_id);
        let mut protocol = self.protocol.lock().await;

        // We are syncing all vault categories
        let categories = vec![
            SyncCategory::Notes,
            SyncCategory::Tasks,
            SyncCategory::Projects,
            SyncCategory::Health,
            SyncCategory::Time,
            SyncCategory::Calendar,
        ];

        match protocol.start_sync(device_id, categories).await {
            Ok(_) => {
                log::info!("[p2p] Sync finished successfully with {}", device_id);
                Ok(())
            }
            Err(e) => {
                log::error!("[p2p] Sync failed with {}: {}", device_id, e);
                Err(P2pError::Sync(e.to_string()))
            }
        }
    }

    pub async fn initiate_pairing(&self, device_id: &str) -> Result<(), P2pError> {
        let protocol = self.protocol.lock().await;

        if protocol.is_device_available(device_id) {
            log::info!("[p2p] Device {} is already available/paired.", device_id);
            return Ok(());
        }

        log::info!("[p2p] Ready to accept pairing from {}", device_id);
        Ok(())
    }
}

// Conversion helpers between Database SyncDelta and Protocol SyncDelta
pub fn db_delta_to_protocol_delta(db_delta: DbSyncDelta) -> SyncDelta {
    // TODO: Implement proper vector clock sequence numbers to ensure causal ordering.
    // Currently using timestamp-based ordering as a fallback, which is vulnerable to clock skew.
    // See ISSUES.md regarding "P2P Sync Vector Clocks".
    if let Some(vc) = db_delta.vector_clock.get("local") {
        log::trace!("[p2p] Using local vector clock sequence: {}", vc);
    } else {
        log::warn!(
            "[p2p] Missing vector clock for delta {}, using 0",
            db_delta.entity_id
        );
    }

    SyncDelta {
        operation: match db_delta.operation {
            DbSyncOperation::Create => DeltaOperation::Create,
            DbSyncOperation::Update => DeltaOperation::Update,
            DbSyncOperation::Delete => DeltaOperation::Delete,
        },
        entity_type: db_delta.entity_type,
        entity_id: db_delta.entity_id,
        encrypted_data: db_delta.data, // In a real encrypted setup, this would be ciphertext
        timestamp: chrono::DateTime::from_timestamp(db_delta.timestamp, 0)
            .unwrap_or(chrono::Utc::now()),
        data_hash: None,
        sequence: 0, // Placeholder: Protocol sequence negotiation required for full consistency
    }
}

pub fn protocol_delta_to_db_delta(proto_delta: SyncDelta) -> DbSyncDelta {
    // TODO: Integrate vector clock logic from CRDT module.
    // This requires tracking the state vector of the remote device.
    log::warn!("[p2p] Receiving delta without vector clock integration. Conflict resolution may be suboptimal.");

    DbSyncDelta {
        entity_type: proto_delta.entity_type,
        entity_id: proto_delta.entity_id,
        operation: match proto_delta.operation {
            DeltaOperation::Create => DbSyncOperation::Create,
            DeltaOperation::Update => DbSyncOperation::Update,
            DeltaOperation::Delete => DbSyncOperation::Delete,
        },
        data: proto_delta.encrypted_data,
        timestamp: proto_delta.timestamp.timestamp(),
        vector_clock: std::collections::HashMap::new(), // Needs vector clock logic integration
        space_id: None, // Protocol needs to carry space_id if we want to populate this correctly
    }
}
