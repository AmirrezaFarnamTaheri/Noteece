use super::types::*;
use crate::sync::models::SyncProgress;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Arc;

/// Sync protocol handler
pub struct SyncProtocol {
    /// This device's info
    pub device_info: Arc<DeviceInfo>,

    /// Paired devices
    pub(crate) paired_devices: Vec<DeviceInfo>,

    /// Current sync state
    pub(crate) sync_state: SyncState,

    /// ID of the peer currently being synced with
    pub(crate) active_peer_id: Option<String>,

    /// Last sync timestamp
    last_sync: Option<DateTime<Utc>>,

    /// Active shared secrets for paired devices (device_id -> shared_secret)
    shared_secrets: HashMap<String, [u8; 32]>,

    /// Active sync progress
    pub(crate) progress: Option<SyncProgress>,
}

impl SyncProtocol {
    /// Create new sync protocol handler
    pub fn new(device_info: DeviceInfo) -> Self {
        SyncProtocol {
            device_info: Arc::new(device_info),
            paired_devices: Vec::new(),
            sync_state: SyncState::Idle,
            active_peer_id: None,
            last_sync: None,
            shared_secrets: HashMap::new(),
            progress: None,
        }
    }

    /// Discover other devices on local network using mDNS
    /// Searches for _socialhub-sync._tcp.local services on the network
    pub async fn discover_devices(&self) -> Result<Vec<DeviceInfo>, SyncProtocolError> {
        use mdns_sd::ServiceDaemon;

        // Create mDNS service daemon
        let mdns =
            ServiceDaemon::new().map_err(|e| SyncProtocolError::DiscoveryFailed(e.to_string()))?;

        // Browse for socialhub sync services
        let receiver = mdns
            .browse("_socialhub-sync._tcp.local.")
            .map_err(|e| SyncProtocolError::DiscoveryFailed(e.to_string()))?;

        let mut discovered_devices = Vec::new();
        let mut attempts = 0;
        const MAX_DISCOVERY_ATTEMPTS: usize = 5;

        // Collect discovered services with timeout
        while attempts < MAX_DISCOVERY_ATTEMPTS {
            match receiver.recv_timeout(std::time::Duration::from_millis(200)) {
                Ok(event) => {
                    if let mdns_sd::ServiceEvent::ServiceResolved(info) = event {
                        // Extract device information from mDNS record
                        if let Some(address) = info.get_addresses().iter().next() {
                            let device = DeviceInfo {
                                device_id: info.get_fullname().to_string(),
                                device_name: info
                                    .get_properties()
                                    .get("name")
                                    .and_then(|v| {
                                        v.val()
                                            .map(|bytes| String::from_utf8_lossy(bytes).to_string())
                                    })
                                    .unwrap_or_else(|| "Unknown Device".to_string()),
                                device_type: match info.get_properties().get("type").and_then(|v| {
                                    v.val()
                                        .map(|bytes| String::from_utf8_lossy(bytes).to_string())
                                }) {
                                    Some(t) if t == "desktop" => DeviceType::Desktop,
                                    _ => DeviceType::Mobile,
                                },
                                ip_address: std::net::IpAddr::V4(*address),
                                sync_port: info.get_port(),
                                public_key: info
                                    .get_properties()
                                    .get("pubkey")
                                    .and_then(|v| v.val().map(|bytes| bytes.to_vec()))
                                    .unwrap_or_default(),
                                os_version: info
                                    .get_properties()
                                    .get("os")
                                    .and_then(|v| {
                                        v.val()
                                            .map(|bytes| String::from_utf8_lossy(bytes).to_string())
                                    })
                                    .unwrap_or_else(|| "Unknown".to_string()),
                                last_seen: chrono::Utc::now(),
                                is_active: true,
                            };
                            discovered_devices.push(device);
                        }
                    }
                }
                Err(flume::RecvTimeoutError::Timeout) => {
                    attempts += 1;
                    // Continue searching
                }
                Err(_) => break,
            }
        }

        Ok(discovered_devices)
    }

    /// Pair with a desktop device
    pub async fn pair_device(
        &mut self,
        pairing_request: PairingRequest,
        expected_pairing_code: &str,
    ) -> Result<PairingResponse, SyncProtocolError> {
        // Validate pairing code (constant-time compare)
        if !Self::constant_time_compare(
            pairing_request.pairing_code.as_bytes(),
            expected_pairing_code.as_bytes(),
        ) {
            return Err(SyncProtocolError::AuthenticationFailed);
        }

        // Check for duplicate device
        if self
            .paired_devices
            .iter()
            .any(|d| d.device_id == pairing_request.mobile_device.device_id)
        {
            return Err(SyncProtocolError::DuplicateDevice);
        }

        // SECURITY: Implement proper ECDH key exchange
        use rand::rngs::OsRng;
        use x25519_dalek::{EphemeralSecret, PublicKey};

        // 1. Generate the desktop's ephemeral key pair for this session
        let desktop_secret = EphemeralSecret::random_from_rng(OsRng);
        let desktop_public = PublicKey::from(&desktop_secret);

        // 2. Parse the client's public key from the request
        let client_public_key = PublicKey::from(
            <[u8; 32]>::try_from(pairing_request.public_key.as_slice())
                .map_err(|_| SyncProtocolError::KeyExchangeFailed)?,
        );

        // 3. Compute the shared secret. This is derived locally and NEVER transmitted.
        let shared_secret = desktop_secret.diffie_hellman(&client_public_key);

        // Store the shared secret for this device
        self.shared_secrets.insert(
            pairing_request.mobile_device.device_id.clone(),
            shared_secret.to_bytes(),
        );

        // 4. Create the response, sending the DESKTOP's public key back.
        // The client will use this to derive the same shared secret.
        let pairing_response = PairingResponse {
            desktop_device: (*self.device_info).clone(),
            success: true,
            error_message: None,
            public_key: desktop_public.as_bytes().to_vec(), // Send public key, not shared key
            timestamp: Utc::now(),
        };

        // Add to paired devices
        self.paired_devices.push(pairing_request.mobile_device);

        Ok(pairing_response)
    }

    /// Start sync with paired device
    /// Enforces valid state transitions - sync can only start from Idle or Connected states
    ///
    /// # Arguments
    /// * `device_id` - The ID of the device to sync with
    /// * `categories` - List of categories to synchronize (e.g. Posts, Accounts)
    pub async fn start_sync(
        &mut self,
        device_id: &str,
        categories: Vec<SyncCategory>,
    ) -> Result<(), SyncProtocolError> {
        log::info!("[mobile_sync] Starting sync with device: {}", device_id);

        // Verify device is paired and active
        let device = self
            .paired_devices
            .iter()
            .find(|d| d.device_id == device_id)
            .ok_or(SyncProtocolError::DeviceNotFound)?;

        if !device.is_active {
            return Err(SyncProtocolError::InvalidState(
                "Device is not currently active".to_string(),
            ));
        }

        // Enforce valid state transitions - only start sync from Idle or Connected states
        match self.sync_state {
            SyncState::Idle | SyncState::Connected => {
                // Valid starting states
            }
            _ => {
                return Err(SyncProtocolError::InvalidState(format!(
                    "Cannot start sync from state: {:?}",
                    self.sync_state
                )));
            }
        }

        self.sync_state = SyncState::Connecting;
        self.active_peer_id = Some(device_id.to_string());

        // Initialize progress
        self.progress = Some(SyncProgress {
            device_id: device_id.to_string(),
            phase: "connecting".to_string(),
            progress: 0.0,
            entities_pushed: 0,
            entities_pulled: 0,
            conflicts: 0,
            error_message: None,
        });

        // Establish encrypted connection with paired device
        // Verify device is reachable at its IP address and port
        log::debug!(
            "[mobile_sync] Attempting to connect to {}:{}",
            device.ip_address,
            device.sync_port
        );
        match std::net::TcpStream::connect_timeout(
            &std::net::SocketAddr::new(device.ip_address, device.sync_port),
            std::time::Duration::from_secs(5),
        ) {
            Ok(stream) => {
                // Ensure the health-check connection does not linger
                let _ = stream.set_nodelay(true);
                // Explicitly drop to close the socket immediately
                drop(stream);
            }
            Err(e) => {
                log::error!("[mobile_sync] Connection failed: {}", e);
                self.sync_state = SyncState::Idle;
                self.active_peer_id = None;
                if let Some(p) = &mut self.progress {
                    p.phase = "failed".to_string();
                    p.error_message = Some(format!("Connection failed: {}", e));
                }
                return Err(SyncProtocolError::ConnectionFailed(format!(
                    "Failed to establish connection: {}",
                    e
                )));
            }
        }

        // Create sync session with device
        // Initialize session tracking and state management
        let sync_session_id = uuid::Uuid::new_v4().to_string();
        log::info!(
            "[mobile_sync] Created sync session {} with device {} (categories: {:?})",
            sync_session_id,
            device_id,
            categories
        );

        if let Some(p) = &mut self.progress {
            p.phase = "syncing".to_string();
            p.progress = 0.1; // Started
        }

        // Begin delta transmission for selected categories
        // Here we would utilize the shared_secret stored in self.shared_secrets.get(device_id)
        // to encrypt the communication channel for the actual sync process.

        for category in categories {
            log::debug!("[sync_protocol] Syncing category: {:?}", category);
        }

        self.sync_state = SyncState::Syncing;

        // Simulate progress for the stub
        if let Some(p) = &mut self.progress {
            p.progress = 1.0;
            p.phase = "complete".to_string();
        }

        Ok(())
    }

    /// Complete sync and update last_sync timestamp
    pub fn complete_sync(&mut self) -> Result<(), SyncProtocolError> {
        self.sync_state = SyncState::SyncComplete;
        // Do not clear active_peer_id here so we know who completed the sync
        self.last_sync = Some(Utc::now());
        if let Some(p) = &mut self.progress {
            p.phase = "complete".to_string();
            p.progress = 1.0;
        }
        Ok(())
    }

    /// Get current sync progress
    pub fn get_progress(&self) -> Option<SyncProgress> {
        self.progress.clone()
    }

    /// Get current sync state
    pub fn get_sync_state(&self) -> SyncState {
        self.sync_state
    }

    /// Get current active peer ID
    pub fn get_active_peer_id(&self) -> Option<String> {
        self.active_peer_id.clone()
    }

    /// Get list of paired devices
    pub fn get_paired_devices(&self) -> Vec<DeviceInfo> {
        self.paired_devices.clone()
    }

    /// Remove paired device
    pub fn remove_paired_device(&mut self, device_id: &str) -> Result<(), SyncProtocolError> {
        let initial_len = self.paired_devices.len();
        self.paired_devices.retain(|d| d.device_id != device_id);
        self.shared_secrets.remove(device_id); // Also remove the secret

        if self.paired_devices.len() == initial_len {
            return Err(SyncProtocolError::DeviceNotFound);
        }

        Ok(())
    }

    /// Get time since last successful sync
    pub fn get_last_sync_time(&self) -> Option<DateTime<Utc>> {
        self.last_sync
    }

    /// Check if device is paired and active
    pub fn is_device_available(&self, device_id: &str) -> bool {
        self.paired_devices
            .iter()
            .any(|d| d.device_id == device_id && d.is_active)
    }

    /// Handle an incoming sync delta
    pub async fn handle_delta(&mut self, delta: SyncDelta) -> Result<SyncDelta, SyncProtocolError> {
        log::debug!("[mobile_sync] Received delta: {:?}", delta);
        // For now, we just acknowledge by returning the same delta.
        // In a real implementation, this would apply the delta to the local database
        // and potentially return a confirmation or conflict resolution.
        Ok(delta)
    }

    /// Constant-time comparison to prevent timing attacks
    /// Returns true only if both slices have equal length AND equal contents
    fn constant_time_compare(a: &[u8], b: &[u8]) -> bool {
        use subtle::ConstantTimeEq;

        // First check lengths in constant time (if available)
        // If lengths differ, the comparison should fail without leaking info
        if a.len() != b.len() {
            return false;
        }

        // Compare contents in constant time
        a.ct_eq(b).into()
    }
}
