use mdns_sd::{ServiceDaemon, ServiceInfo, ServiceEvent};
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use std::time::Duration;
use thiserror::Error;

const SERVICE_TYPE: &str = "_noteece-sync._tcp.local.";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscoveredDevice {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
}

#[derive(Error, Debug)]
pub enum DiscoveryError {
    #[error("mDNS Daemon error: {0}")]
    DaemonError(String),
}

/// A service for discovering other Noteece devices on the local network.
pub struct DiscoveryService {
    mdns: ServiceDaemon,
}

impl DiscoveryService {
    /// Creates a new DiscoveryService.
    pub fn new() -> Result<Self, DiscoveryError> {
        let mdns = ServiceDaemon::new().map_err(|e| DiscoveryError::DaemonError(e.to_string()))?;
        Ok(Self { mdns })
    }

    /// Registers and broadcasts this device on the local network.
    pub fn register(&self, id: &str, name: &str, port: u16) -> Result<(), DiscoveryError> {
        let mut properties = HashMap::new();
        properties.insert("id".to_string(), id.to_string());
        properties.insert("name".to_string(), name.to_string());

        let service_info = ServiceInfo::new(
            SERVICE_TYPE,
            name,
            &format!("{}.{}", name, SERVICE_TYPE),
            "0.0.0.0", // Let the OS decide the IP
            port,
            Some(properties),
        ).map_err(|e| DiscoveryError::DaemonError(e.to_string()))?;

        self.mdns.register(service_info).map_err(|e| DiscoveryError::DaemonError(e.to_string()))?;
        log::info!("[discovery] Registered device '{}' on the network.", name);
        Ok(())
    }

    /// Listens for other devices on the network for a specified duration.
    pub fn discover(&self, duration: Duration) -> Result<Vec<DiscoveredDevice>, DiscoveryError> {
        let receiver = self.mdns.browse(SERVICE_TYPE).map_err(|e| DiscoveryError::DaemonError(e.to_string()))?;
        log::info!("[discovery] Browsing for other devices...");

        let mut discovered_devices = Vec::new();
        let start_time = std::time::Instant::now();

        while start_time.elapsed() < duration {
            if let Ok(event) = receiver.recv_timeout(Duration::from_secs(1)) {
                if let ServiceEvent::ServiceResolved(info) = event {
                    let id = info.get_property("id").map(|s| s.to_string()).unwrap_or_default();
                    let name = info.get_property("name").map(|s| s.to_string()).unwrap_or_default();

                    if !id.is_empty() {
                        let device = DiscoveredDevice {
                            id,
                            name,
                            address: info.get_ip().to_string(),
                            port: info.get_port(),
                        };
                        log::info!("[discovery] Found device: {:?}", device);
                        discovered_devices.push(device);
                    }
                }
            }
        }

        // Deduplicate devices
        discovered_devices.sort_by_key(|d| d.id.clone());
        discovered_devices.dedup_by_key(|d| d.id.clone());

        log::info!("[discovery] Found {} unique devices.", discovered_devices.len());
        Ok(discovered_devices)
    }
}
