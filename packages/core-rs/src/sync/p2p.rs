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

#[derive(Clone)]
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
            use base64::Engine;
            base64::engine::general_purpose::STANDARD.encode(&proto.device_info.public_key)
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
            let protocol = self.protocol.clone();

            tokio::spawn(async move {
                match accept_async(stream).await {
                    Ok(ws_stream) => {
                        let (mut writer, mut reader) = ws_stream.split();
                        // Expect a handshake JSON as the first text message
                        match reader.next().await {
                            Some(Ok(msg)) if msg.is_text() => {
                                let text = msg.to_text().unwrap_or_default();
                                match serde_json::from_str::<serde_json::Value>(text) {
                                    Ok(req) if req.get("type") == Some(&serde_json::Value::String("handshake".to_string())) => {
                                        let response = serde_json::json!({
                                            "type": "handshake_response",
                                            "publicKey": *server_pubkey
                                        });
                                        if let Err(e) = writer.send(tokio_tungstenite::tungstenite::Message::Text(response.to_string())).await {
                                            log::error!("[p2p] Failed to send handshake_response: {}", e);
                                            return;
                                        }
                                    }
                                    _ => {
                                        log::warn!("[p2p] Invalid or unexpected first message from {}", peer_addr);
                                        let _ = writer.send(tokio_tungstenite::tungstenite::Message::Close(None)).await;
                                        return;
                                    }
                                }
                            }
                            Some(Ok(other)) => {
                                log::warn!("[p2p] Non-text first frame from {}: {:?}", peer_addr, other);
                                let _ = writer.send(tokio_tungstenite::tungstenite::Message::Close(None)).await;
                                return;
                            }
                            Some(Err(e)) => {
                                log::error!("[p2p] Read error from {}: {}", peer_addr, e);
                                return;
                            }
                            None => {
                                log::warn!("[p2p] Connection closed before handshake from {}", peer_addr);
                                return;
                            }
                        }

                        // After handshake, handle the full sync data exchange
                        use tokio_tungstenite::tungstenite::Message;
                        let mut proto_guard = protocol.lock().await;
                        while let Some(Ok(msg)) = reader.next().await {
                            match msg {
                                Message::Text(text) => {
                                    // Deserialize delta from text, process it with SyncProtocol
                                    if let Ok(delta) = serde_json::from_str::<SyncDelta>(&text) {
                                        if let Ok(response_delta) = proto_guard.handle_delta(delta).await {
                                            if let Ok(response_text) = serde_json::to_string(&response_delta) {
                                                let _ = writer.send(Message::Text(response_text)).await;
                                            }
                                        }
                                    }
                                }
                                // Handle other message types (Binary, Close, etc.)
                                _ => {}
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("[p2p] WebSocket upgrade failed for {}: {}", peer_addr, e);
                    }
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
    let seq = if let Some(vc) = db_delta.vector_clock.get("local") {
        log::trace!("[p2p] Using local vector clock sequence: {}", vc);
        *vc
    } else {
        log::warn!(
            "[p2p] Missing vector clock for delta {}, using 0",
            db_delta.entity_id
        );
        0
    };

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
        vector_clock: db_delta.vector_clock,
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
