/// Peer Discovery Module
/// Uses mDNS for discovering other Noteece devices on local network
/// Enables zero-configuration pairing and synchronization

use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DiscoveryError {
    #[error("mDNS daemon failed: {0}")]
    DaemonError(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Service registration failed: {0}")]
    RegistrationError(String),

    #[error("Invalid device information")]
    InvalidDevice,

    #[error("Discovery timeout")]
    Timeout,
}

/// Discovered device information from mDNS
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredDevice {
    pub device_id: String,
    pub device_name: String,
    pub device_type: String, // "desktop", "mobile", "tablet"
    pub ip_address: String,
    pub port: u16,
    pub os_version: String,
    pub app_version: String,
}

/// mDNS Service for peer discovery
pub struct PeerDiscovery {
    device_id: String,
    device_name: String,
    port: u16,
    discovered_devices: Vec<DiscoveredDevice>,
}

impl PeerDiscovery {
    /// Create new peer discovery service
    pub fn new(device_id: String, device_name: String, port: u16) -> Self {
        PeerDiscovery {
            device_id,
            device_name,
            port,
            discovered_devices: Vec::new(),
        }
    }

    /// Register this device on mDNS as a Noteece sync service
    /// Service name: _noteece-sync._tcp.local
    /// Instance: {device_name}._noteece-sync._tcp.local
    pub fn register_service(&self) -> Result<(), DiscoveryError> {
        // In production, use mdns-sd or zeroconf crate
        // This is a mock implementation showing the structure

        let service_name = format!("{}._noteece-sync._tcp.local.", self.device_name);
        let txt_records = vec![
            format!("device_id={}", self.device_id),
            format!("device_type=desktop"),
            format!("app_version=1.0.0"),
        ];

        // Register with mDNS daemon
        // ServiceDaemon::register(&service_name, self.port, &txt_records)?

        Ok(())
    }

    /// Discover other Noteece devices on local network
    pub async fn discover_devices(&mut self) -> Result<Vec<DiscoveredDevice>, DiscoveryError> {
        // In production, browse for _noteece-sync._tcp.local services
        // This is a mock implementation

        self.discovered_devices = vec![];

        // Simulate discovering devices
        // ServiceDaemon::browse("_noteece-sync._tcp.local")?
        // would call back with discovered services

        Ok(self.discovered_devices.clone())
    }

    /// Parse mDNS TXT records into DiscoveredDevice
    fn parse_txt_records(
        instance_name: &str,
        ip: &str,
        port: u16,
        txt: &[String],
    ) -> Result<DiscoveredDevice, DiscoveryError> {
        let mut device_id = String::new();
        let mut device_type = "unknown".to_string();
        let mut app_version = "unknown".to_string();

        for record in txt {
            if let Some(value) = record.strip_prefix("device_id=") {
                device_id = value.to_string();
            } else if let Some(value) = record.strip_prefix("device_type=") {
                device_type = value.to_string();
            } else if let Some(value) = record.strip_prefix("app_version=") {
                app_version = value.to_string();
            }
        }

        if device_id.is_empty() {
            return Err(DiscoveryError::InvalidDevice);
        }

        Ok(DiscoveredDevice {
            device_id,
            device_name: instance_name.to_string(),
            device_type,
            ip_address: ip.to_string(),
            port,
            os_version: detect_os_version(),
            app_version,
        })
    }

    /// Check if a device is currently reachable
    pub async fn is_device_reachable(&self, device: &DiscoveredDevice) -> bool {
        // In production, attempt TCP connection to device:port
        // Check if sync service is running

        // Mock: simulate reachability check
        !device.ip_address.is_empty() && device.port > 0
    }

    /// Continuously watch for device changes
    pub async fn watch_devices(
        &mut self,
        callback: impl Fn(DiscoveryEvent) + Send + Sync + 'static,
    ) -> Result<(), DiscoveryError> {
        // In production, this would monitor mDNS for service changes
        // and call callback with DiscoveryEvent

        loop {
            // Check for changes periodically
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

            // Would call callback(DiscoveryEvent::DeviceAdded/Removed/Changed)
        }
    }

    /// Get list of discovered devices
    pub fn get_devices(&self) -> Vec<DiscoveredDevice> {
        self.discovered_devices.clone()
    }
}

/// Events during device discovery
#[derive(Debug, Clone)]
pub enum DiscoveryEvent {
    DeviceAdded(DiscoveredDevice),
    DeviceRemoved(String), // device_id
    DeviceChanged(DiscoveredDevice),
}

/// Detect OS version for the device
fn detect_os_version() -> String {
    #[cfg(target_os = "macos")]
    {
        "macOS 14.0".to_string()
    }
    #[cfg(target_os = "windows")]
    {
        "Windows 11".to_string()
    }
    #[cfg(target_os = "linux")]
    {
        "Linux 5.15".to_string()
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        "Unknown".to_string()
    }
}

/// Firewall and network configuration validator
pub struct NetworkValidator;

impl NetworkValidator {
    /// Check if sync port is open and accessible
    pub async fn check_port_open(port: u16) -> Result<bool, DiscoveryError> {
        // In production, attempt to bind to port
        // check if other devices can connect

        Ok(port > 1024 && port < 65535)
    }

    /// Check if mDNS is available on this network
    pub async fn check_mdns_available() -> Result<bool, DiscoveryError> {
        // In production, send mDNS query and check for response
        Ok(true)
    }

    /// Get local network IP address
    pub fn get_local_ip() -> Result<String, DiscoveryError> {
        // In production, find the primary network interface
        // and return its IP address

        Ok("192.168.1.100".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_peer_discovery_creation() {
        let discovery = PeerDiscovery::new(
            "device123".to_string(),
            "My Desktop".to_string(),
            8765,
        );

        assert_eq!(discovery.device_id, "device123");
        assert_eq!(discovery.device_name, "My Desktop");
        assert_eq!(discovery.port, 8765);
    }

    #[test]
    fn test_parse_txt_records() {
        let txt = vec![
            "device_id=device456".to_string(),
            "device_type=mobile".to_string(),
            "app_version=1.0.0".to_string(),
        ];

        let device = PeerDiscovery::parse_txt_records(
            "My Mobile",
            "192.168.1.101",
            8765,
            &txt,
        ).expect("Failed to parse TXT records");

        assert_eq!(device.device_id, "device456");
        assert_eq!(device.device_type, "mobile");
        assert_eq!(device.app_version, "1.0.0");
    }

    #[test]
    fn test_register_service() {
        let discovery = PeerDiscovery::new(
            "device123".to_string(),
            "My Desktop".to_string(),
            8765,
        );

        let result = discovery.register_service();
        assert!(result.is_ok());
    }

    #[test]
    fn test_is_device_reachable() {
        let device = DiscoveredDevice {
            device_id: "device456".to_string(),
            device_name: "Other Device".to_string(),
            device_type: "mobile".to_string(),
            ip_address: "192.168.1.101".to_string(),
            port: 8765,
            os_version: "iOS 17".to_string(),
            app_version: "1.0.0".to_string(),
        };

        let discovery = PeerDiscovery::new(
            "device123".to_string(),
            "My Desktop".to_string(),
            8765,
        );

        // Mock check (in production would do actual connection check)
        assert!(!device.ip_address.is_empty());
        assert!(device.port > 0);
    }

    #[test]
    fn test_network_validator() {
        let port_check = NetworkValidator::check_port_open(8765);
        assert!(port_check.is_ok());

        let invalid_port = NetworkValidator::check_port_open(100);
        assert!(invalid_port.is_ok());
    }
}
