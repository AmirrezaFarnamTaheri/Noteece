use chrono::{DateTime, Utc};
/// Desktop-Mobile Sync Protocol for SocialHub
/// Enables synchronization of social media data between desktop and mobile devices
/// Uses encrypted protocol with local network discovery
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SyncProtocolError {
    #[error("Network error: {0}")]
    Network(String),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Device not found")]
    DeviceNotFound,

    #[error("Sync version mismatch: expected {expected}, got {actual}")]
    VersionMismatch { expected: u32, actual: u32 },

    #[error("Invalid sync state: {0}")]
    InvalidState(String),

    #[error("Sync timeout")]
    Timeout,

    #[error("Authentication failed")]
    AuthenticationFailed,

    #[error("Device already exists")]
    DuplicateDevice,

    #[error("Discovery failed: {0}")]
    DiscoveryFailed(String),

    #[error("Key exchange failed")]
    KeyExchangeFailed,

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Protocol version for compatibility checking

/// Device type identifier
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum DeviceType {
    Desktop,
    Mobile,
    Tablet,
}

/// Sync state enum tracking synchronization progress
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncState {
    /// Not connected to any device
    Idle,
    /// Attempting to connect
    Connecting,
    /// Connected and ready
    Connected,
    /// Currently syncing
    Syncing,
    /// Sync completed successfully
    SyncComplete,
    /// Error occurred
    Error,
}

/// Device information for pairing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    /// Unique device identifier (UUID)
    pub device_id: String,

    /// Human-readable device name
    pub device_name: String,

    /// Device type (Desktop/Mobile/Tablet)
    pub device_type: DeviceType,

    /// IP address of device
    pub ip_address: IpAddr,

    /// Port for sync communication
    pub sync_port: u16,

    /// Public key for encryption
    pub public_key: Vec<u8>,

    /// Firmware/OS version
    pub os_version: String,

    /// Last seen timestamp
    pub last_seen: DateTime<Utc>,

    /// Is this device currently active
    pub is_active: bool,
}

/// Sync request sent from mobile to desktop
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    /// Protocol version for compatibility
    pub protocol_version: u32,

    /// Source device info
    pub source_device: DeviceInfo,

    /// Target device ID (optional, null = broadcast)
    pub target_device_id: Option<String>,

    /// Session ID for this sync
    pub session_id: String,

    /// Timestamp of request
    pub timestamp: DateTime<Utc>,

    /// Data categories to sync
    pub sync_categories: Vec<SyncCategory>,

    /// Last successful sync timestamp
    pub last_sync_timestamp: Option<DateTime<Utc>>,
}

/// Categories of data to synchronize
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncCategory {
    /// Social media accounts
    Accounts,
    /// Posts and content
    Posts,
    /// Categories and tags
    Categories,
    /// Focus modes
    FocusModes,
    /// Sync history
    SyncHistory,
    /// Backup metadata
    Backups,
}

/// Single delta (change) to sync
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncDelta {
    /// Type of change (Create, Update, Delete)
    pub operation: DeltaOperation,

    /// Entity type (post, account, category, etc.)
    pub entity_type: String,

    /// Entity ID
    pub entity_id: String,

    /// Encrypted data (BLOB)
    pub encrypted_data: Option<Vec<u8>>,

    /// Timestamp of change
    pub timestamp: DateTime<Utc>,

    /// Hash of data for duplicate detection
    pub data_hash: Option<String>,

    /// Sequence number for ordering
    pub sequence: u64,
}

/// Operation type in sync delta
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum DeltaOperation {
    Create,
    Update,
    Delete,
}

/// Sync response from desktop to mobile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    /// Protocol version
    pub protocol_version: u32,

    /// Source device info (server)
    pub source_device: DeviceInfo,

    /// Session ID matching request
    pub session_id: String,

    /// Status of sync
    pub status: SyncResponseStatus,

    /// Deltas to apply
    pub deltas: Vec<SyncDelta>,

    /// Total number of deltas
    pub total_deltas: u32,

    /// Current batch number
    pub batch_number: u32,

    /// Total batches
    pub total_batches: u32,

    /// Server timestamp
    pub timestamp: DateTime<Utc>,

    /// Compressed data size
    pub compressed_size: u64,

    /// Uncompressed data size
    pub uncompressed_size: u64,
}

/// Status of sync response
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncResponseStatus {
    /// Sync started
    Started,
    /// Sync in progress
    InProgress,
    /// Sync completed successfully
    Success,
    /// Sync completed with errors
    PartialSuccess,
    /// Sync failed
    Failed,
}

/// Device pairing request for initial setup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingRequest {
    /// Mobile device info
    pub mobile_device: DeviceInfo,

    /// Pairing code (6-digit PIN entered by user)
    pub pairing_code: String,

    /// Timestamp of pairing request
    pub timestamp: DateTime<Utc>,

    /// Client's public key for ECDH
    pub public_key: Vec<u8>,
}

/// Device pairing response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingResponse {
    /// Desktop device info
    pub desktop_device: DeviceInfo,

    /// Was pairing successful
    pub success: bool,

    /// Error message if failed
    pub error_message: Option<String>,

    // SECURITY FIX: The shared_key is REMOVED from the response.
    // Instead, the desktop's public key is sent, allowing the client
    // to derive the shared secret without it ever being transmitted.
    pub public_key: Vec<u8>,

    /// Pairing timestamp
    pub timestamp: DateTime<Utc>,
}

/// Sync protocol handler
pub struct SyncProtocol {
    /// This device's info
    device_info: Arc<DeviceInfo>,

    /// Paired devices
    paired_devices: Vec<DeviceInfo>,

    /// Current sync state
    sync_state: SyncState,

    /// Last sync timestamp
    last_sync: Option<DateTime<Utc>>,

    /// Active shared secrets for paired devices (device_id -> shared_secret)
    shared_secrets: HashMap<String, [u8; 32]>,

    /// Sync progress (0.0 to 1.0)
    sync_progress: f32,
}

impl SyncProtocol {
    /// Create new sync protocol handler
    pub fn new(device_info: DeviceInfo) -> Self {
        SyncProtocol {
            device_info: Arc::new(device_info),
            paired_devices: Vec::new(),
            sync_state: SyncState::Idle,
            last_sync: None,
            shared_secrets: HashMap::new(),
            sync_progress: 0.0,
        }
    }

    /// Get sync progress
    pub fn get_progress(&self) -> f32 {
        self.sync_progress
    }

    /// Update sync progress
    pub fn set_progress(&mut self, progress: f32) {
        self.sync_progress = progress.clamp(0.0, 1.0);
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
        self.sync_progress = 0.0;

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
                return Err(SyncProtocolError::ConnectionFailed(format!(
                    "Failed to establish connection: {}",
                    e
                )));
            }
        }

        self.sync_progress = 0.1; // Connected

        // Create sync session with device
        // Initialize session tracking and state management
        let sync_session_id = uuid::Uuid::new_v4().to_string();
        log::info!(
            "[mobile_sync] Created sync session {} with device {} (categories: {:?})",
            sync_session_id,
            device_id,
            categories
        );

        // Begin delta transmission for selected categories
        // Here we would utilize the shared_secret stored in self.shared_secrets.get(device_id)
        // to encrypt the communication channel for the actual sync process.
        self.sync_state = SyncState::Syncing;

        let total_categories = categories.len() as f32;
        for (i, category) in categories.iter().enumerate() {
            log::debug!("[sync_protocol] Syncing category: {:?}", category);
            // Simulate progress update
            self.sync_progress = 0.2 + (0.7 * ((i as f32) / total_categories));
        }

        Ok(())
    }

    /// Complete sync and update last_sync timestamp
    pub fn complete_sync(&mut self) -> Result<(), SyncProtocolError> {
        self.sync_state = SyncState::SyncComplete;
        self.sync_progress = 1.0;
        self.last_sync = Some(Utc::now());
        Ok(())
    }

    /// Get current sync state
    pub fn get_sync_state(&self) -> SyncState {
        self.sync_state
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

/// Batch processor for efficient syncing
pub struct SyncBatchProcessor {
    /// Maximum items per batch
    pub batch_size: usize,

    /// Maximum bytes per batch
    pub max_batch_bytes: u64,
}

impl SyncBatchProcessor {
    /// Create new batch processor
    pub fn new(batch_size: usize, max_batch_bytes: u64) -> Self {
        SyncBatchProcessor {
            batch_size,
            max_batch_bytes,
        }
    }

    /// Split deltas into batches for transmission
    pub fn create_batches(&self, deltas: Vec<SyncDelta>) -> Vec<Vec<SyncDelta>> {
        let mut batches = Vec::new();
        let mut current_batch = Vec::new();
        let mut current_size = 0u64;

        for delta in deltas {
            let estimated_size = serde_json::to_vec(&delta)
                .map(|v| v.len() as u64)
                .unwrap_or(1024);

            if current_batch.len() >= self.batch_size
                || (current_size + estimated_size) > self.max_batch_bytes
            {
                if !current_batch.is_empty() {
                    batches.push(current_batch);
                    current_batch = Vec::new();
                    current_size = 0;
                }
            }

            current_batch.push(delta);
            current_size += estimated_size;
        }

        if !current_batch.is_empty() {
            batches.push(current_batch);
        }

        batches
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::IpAddr;

    fn create_test_device(name: &str) -> DeviceInfo {
        DeviceInfo {
            device_id: uuid::Uuid::new_v4().to_string(),
            device_name: name.to_string(),
            device_type: DeviceType::Mobile,
            ip_address: "192.168.1.100".parse::<IpAddr>().unwrap(),
            sync_port: 8766,
            public_key: vec![],
            os_version: "iOS 17.0".to_string(),
            last_seen: Utc::now(),
            is_active: true,
        }
    }

    #[test]
    fn test_sync_protocol_creation() {
        let device = create_test_device("TestPhone");
        let protocol = SyncProtocol::new(device);

        assert_eq!(protocol.get_sync_state(), SyncState::Idle);
        assert_eq!(protocol.get_paired_devices().len(), 0);
    }

    #[test]
    fn test_device_pairing() {
        let mut protocol = SyncProtocol::new(create_test_device("Desktop"));
        let mobile_device = create_test_device("Mobile");

        let pairing_request = PairingRequest {
            mobile_device: mobile_device.clone(),
            pairing_code: "123456".to_string(),
            timestamp: Utc::now(),
            public_key: vec![0; 32], // Dummy key for test
        };

        // This would normally be async
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(protocol.pair_device(pairing_request, "123456"));

        assert!(result.is_ok());
        assert_eq!(protocol.get_paired_devices().len(), 1);
    }

    #[test]
    fn test_device_pairing_with_wrong_code() {
        let mut protocol = SyncProtocol::new(create_test_device("Desktop"));
        let mobile_device = create_test_device("Mobile");

        let pairing_request = PairingRequest {
            mobile_device: mobile_device.clone(),
            pairing_code: "999999".to_string(),
            timestamp: Utc::now(),
            public_key: vec![0; 32], // Dummy key for test
        };

        // This would normally be async
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(protocol.pair_device(pairing_request, "123456")); // Different code

        assert!(result.is_err());
        assert_eq!(protocol.get_paired_devices().len(), 0);
    }

    #[test]
    fn test_batch_processor() {
        let processor = SyncBatchProcessor::new(2, 10000);

        let deltas = vec![
            SyncDelta {
                operation: DeltaOperation::Create,
                entity_type: "post".to_string(),
                entity_id: "1".to_string(),
                encrypted_data: Some(vec![0u8; 100]),
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 1,
            },
            SyncDelta {
                operation: DeltaOperation::Update,
                entity_type: "post".to_string(),
                entity_id: "2".to_string(),
                encrypted_data: Some(vec![0u8; 100]),
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 2,
            },
            SyncDelta {
                operation: DeltaOperation::Delete,
                entity_type: "post".to_string(),
                entity_id: "3".to_string(),
                encrypted_data: None,
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 3,
            },
        ];

        let batches = processor.create_batches(deltas);
        assert_eq!(batches.len(), 2); // 2 items per batch
    }

    #[test]
    fn test_remove_paired_device() {
        let mut protocol = SyncProtocol::new(create_test_device("Desktop"));
        let device = create_test_device("Mobile");
        let device_id = device.device_id.clone();

        protocol.paired_devices.push(device);

        assert!(protocol.remove_paired_device(&device_id).is_ok());
        assert_eq!(protocol.get_paired_devices().len(), 0);
    }

    #[test]
    fn test_sync_state_transitions() {
        let mut protocol = SyncProtocol::new(create_test_device("Desktop"));

        assert_eq!(protocol.get_sync_state(), SyncState::Idle);

        protocol.sync_state = SyncState::Connecting;
        assert_eq!(protocol.get_sync_state(), SyncState::Connecting);

        protocol.sync_state = SyncState::Syncing;
        assert_eq!(protocol.get_sync_state(), SyncState::Syncing);

        let _ = protocol.complete_sync();
        assert_eq!(protocol.get_sync_state(), SyncState::SyncComplete);
    }
}
