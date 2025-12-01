// P2P Sync Implementation
// This module integrates the discovery and mobile_sync modules to provide a complete P2P sync solution.

use super::discovery::{DiscoveredDevice, DiscoveryService};
use super::mobile_sync::{DeltaOperation, DeviceInfo, SyncCategory, SyncDelta, SyncProtocol};
use crate::sync_agent::{SyncDelta as DbSyncDelta, SyncOperation as DbSyncOperation};
use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio_tungstenite::accept_async;

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
    pub discovery: Arc<DiscoveryService>,
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

        // Get server public key for handshake
        let server_pubkey_b64 = {
            let proto = self.protocol.lock().await;
            base64::encode(&proto.device_info.public_key)
        };
        let server_pubkey_b64 = Arc::new(server_pubkey_b64);

        loop {
            let (stream, _) = listener
                .accept()
                .await
                .map_err(|e| P2pError::Network(e.to_string()))?;

            let peer_addr = stream
                .peer_addr()
                .map(|a| a.to_string())
                .unwrap_or_default();
            log::info!("[p2p] New connection from {}", peer_addr);

            let server_pubkey = server_pubkey_b64.clone();

            tokio::spawn(async move {
                // Upgrade to WebSocket
                if let Ok(ws_stream) = accept_async(stream).await {
                    let (mut writer, mut reader) = ws_stream.split();
                    // Wait for handshake message from client
                    if let Some(Ok(msg)) = reader.next().await {
                        if msg.is_text() {
                            if let Ok(req) =
                                serde_json::from_str::<serde_json::Value>(&msg.to_text().unwrap())
                            {
                                if req.get("type")
                                    == Some(&serde_json::Value::String("handshake".to_string()))
                                {
                                    // Send handshake_response with this device's public key
                                    let response = serde_json::json!({
                                        "type": "handshake_response",
                                        "publicKey": *server_pubkey
                                    });
                                    let _ = writer
                                        .send(tokio_tungstenite::tungstenite::Message::Text(
                                            response.to_string(),
                                        ))
                                        .await;
                                }
                            }
                        }
                    }
                    // After handshake, invoke SyncProtocol to handle sync exchange
                    // TODO: Implement full delta sync exchange via self.protocol here.
                } else {
                    log::error!("[p2p] WebSocket upgrade failed for {}", peer_addr);
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
    // Use vector clock sequence number for causal ordering if available, otherwise fallback to 0.
    if let Some(vc) = db_delta.vector_clock.get("local") {
        log::trace!("[p2p] Using local vector clock sequence: {}", vc);
    } else {
        log::warn!(
            "[p2p] Missing vector clock for delta {}, using 0",
            db_delta.entity_id
        );
    }
    let seq = db_delta.vector_clock.get("local").cloned().unwrap_or(0);
    let mut vc = db_delta.vector_clock.clone();
    vc.insert("local".to_string(), seq);

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
        sequence: seq as u64, // Use vector clock sequence for consistency
        vector_clock: vc,
    }
}

pub fn protocol_delta_to_db_delta(proto_delta: SyncDelta) -> DbSyncDelta {
    // Integrate vector clock from remote delta to improve conflict resolution.
    let mut vc_map = std::collections::HashMap::new();
    for (dev, counter) in proto_delta.vector_clock.iter() {
        vc_map.insert(dev.clone(), *counter);
    }
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
        vector_clock: vc_map,
        space_id: None, // Protocol needs to carry space_id if we want to populate this correctly
    }
}
