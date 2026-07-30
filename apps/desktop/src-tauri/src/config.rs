// Configuration module
// Centralized desktop runtime configuration.
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub security: SecurityConfig,
    pub sync: SyncConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
    pub enable_cors: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub enable_https: bool,
    pub cert_path: Option<String>,
    pub key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    pub enabled: bool,
    pub port: u16,
    pub auto_sync_interval: u64,
}

static CONFIG: OnceLock<AppConfig> = OnceLock::new();

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                port: 8765,
                host: "127.0.0.1".to_string(),
                enable_cors: true,
            },
            security: SecurityConfig {
                enable_https: false,
                cert_path: None,
                key_path: None,
            },
            sync: SyncConfig {
                enabled: true,
                port: 8443,
                auto_sync_interval: 300,
            },
        }
    }
}

impl AppConfig {
    pub fn init() -> &'static AppConfig {
        CONFIG.get_or_init(|| {
            let mut config = AppConfig::default();

            if let Ok(port) = std::env::var("NOTEECE_SERVER_PORT") {
                if let Ok(port_num) = port.parse::<u16>() {
                    config.server.port = port_num;
                }
            }
            if let Ok(host) = std::env::var("NOTEECE_SERVER_HOST") {
                config.server.host = host;
            }
            if let Ok(sync_port) = std::env::var("NOTEECE_SYNC_PORT") {
                if let Ok(port_num) = sync_port.parse::<u16>() {
                    config.sync.port = port_num;
                }
            }
            if let Ok(enable_https) = std::env::var("NOTEECE_ENABLE_HTTPS") {
                config.security.enable_https = enable_https.eq_ignore_ascii_case("true");
            }
            if let Ok(cert_path) = std::env::var("NOTEECE_CERT_PATH") {
                config.security.cert_path = Some(cert_path);
            }
            if let Ok(key_path) = std::env::var("NOTEECE_KEY_PATH") {
                config.security.key_path = Some(key_path);
            }

            config
        })
    }

    pub fn get() -> &'static AppConfig {
        CONFIG
            .get()
            .expect("Config not initialized. Call AppConfig::init() first.")
    }

    #[allow(dead_code)]
    pub fn server_port() -> u16 {
        Self::get().server.port
    }

    pub fn sync_port() -> u16 {
        Self::get().sync.port
    }

    #[allow(dead_code)]
    pub fn server_address() -> String {
        let config = Self::get();
        format!("{}:{}", config.server.host, config.server.port)
    }

    #[allow(dead_code)]
    pub fn sync_address() -> String {
        let config = Self::get();
        format!("{}:{}", config.server.host, config.sync.port)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.server.port, 8765);
        assert_eq!(config.sync.port, 8443);
        assert_eq!(config.server.host, "127.0.0.1");
    }
}
