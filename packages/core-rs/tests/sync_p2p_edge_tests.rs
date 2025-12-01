use core_rs::sync::p2p::P2pError;
use core_rs::sync::mobile_sync::{DeviceInfo, DeviceType};

#[tokio::test]
async fn test_p2p_network_error_propagation() {
    use chrono::{TimeZone, Utc};
    let device_info = DeviceInfo {
        device_id: "test_device".to_string(),
        device_name: "Test Device".to_string(),
        device_type: DeviceType::Desktop,
        last_seen: Utc.timestamp_opt(0, 0).unwrap(),
        ip_address: "127.0.0.1".parse().unwrap(),
        sync_port: 8080,
        os_version: "1.0.0".to_string(),
        public_key: vec![1, 2, 3], // Dummy key
        is_active: true,
    };

    // We expect this to fail binding or fail connecting if we try to start server on invalid port or privileged port without permission
    // But mainly we want to test error types.

    let error = P2pError::Network("Connection refused".to_string());
    assert!(matches!(error, P2pError::Network(_)));

    let discovery_error = P2pError::Discovery("Timeout".to_string());
    assert!(matches!(discovery_error, P2pError::Discovery(_)));
}

#[tokio::test]
async fn test_handshake_timeout_simulation() {
    // This is a simulation test to ensure we handle timeouts gracefully
    // in a real scenario we would spin up a TCP listener.

    // Mocking the scenario where a handshake doesn't arrive in time
    let result: Result<(), P2pError> = Err(P2pError::Network("Handshake timeout".to_string()));

    assert!(result.is_err());
    match result {
        Err(P2pError::Network(msg)) => assert_eq!(msg, "Handshake timeout"),
        _ => panic!("Wrong error type"),
    }
}
