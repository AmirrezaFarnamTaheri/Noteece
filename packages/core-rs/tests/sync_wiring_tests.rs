#[cfg(test)]
mod tests {
    use core_rs::sync::mobile_sync::{
        DeviceInfo as ProtocolDeviceInfo, PairingRequest, SyncProtocol,
    };
    use core_rs::sync_agent::{DeviceInfo, DeviceType, SyncAgent, SyncDelta, SyncOperation};
    use rusqlite::Connection;
    use ulid::Ulid;

    use chrono::Utc;

    // Helper to create an in-memory DB with sync tables initialized
    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        core_rs::sync_agent::init_sync_tables(&conn).unwrap();
        // Need tables for deltas too (notes, tasks, etc.)
        // Adjusted schema to match expected V1 table names
        conn.execute("CREATE TABLE note (id TEXT PRIMARY KEY, space_id TEXT, content_md TEXT, modified_at INTEGER, created_at INTEGER)", []).unwrap();
        conn.execute("CREATE TABLE task (id TEXT PRIMARY KEY, space_id TEXT, title TEXT, status TEXT, updated_at INTEGER, created_at INTEGER)", []).unwrap();
        conn
    }

    #[test]
    fn test_sync_agent_device_registration() {
        let conn = setup_db();
        let agent = SyncAgent::new("desktop-1".to_string(), "Desktop".to_string(), 8080);

        let device_info = DeviceInfo {
            device_id: "mobile-1".to_string(),
            device_name: "iPhone".to_string(),
            device_type: DeviceType::Mobile,
            last_seen: Utc::now().timestamp(),
            sync_address: "192.168.1.50".to_string(),
            sync_port: 9000,
            protocol_version: "1.0.0".to_string(),
        };

        agent
            .register_device(&conn, &device_info)
            .expect("Failed to register device");

        let devices = agent.get_devices(&conn).expect("Failed to get devices");
        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].device_id, "mobile-1");
    }

    #[test]
    fn test_sync_protocol_pairing_flow() {
        // Mock mobile device info
        let mobile_device = ProtocolDeviceInfo {
            device_id: "mobile-uuid".to_string(),
            device_name: "Mobile".to_string(),
            device_type: core_rs::sync::mobile_sync::DeviceType::Mobile,
            ip_address: "127.0.0.1".parse().unwrap(),
            sync_port: 8000,
            public_key: vec![0; 32], // Mock key
            os_version: "iOS 16".to_string(),
            last_seen: Utc::now(),
            is_active: true,
        };

        // Mock desktop
        let desktop_device = ProtocolDeviceInfo {
            device_id: "desktop-uuid".to_string(),
            device_name: "Desktop".to_string(),
            device_type: core_rs::sync::mobile_sync::DeviceType::Desktop,
            ip_address: "127.0.0.1".parse().unwrap(),
            sync_port: 8080,
            public_key: vec![0; 32],
            os_version: "macOS 14".to_string(),
            last_seen: Utc::now(),
            is_active: true,
        };

        let mut protocol = SyncProtocol::new(desktop_device);

        let request = PairingRequest {
            mobile_device: mobile_device.clone(),
            pairing_code: "123456".to_string(),
            timestamp: Utc::now(),
            public_key: vec![0; 32],
        };

        // Test pairing success
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async { protocol.pair_device(request, "123456").await });

        assert!(result.is_ok());
        assert_eq!(protocol.get_paired_devices().len(), 1);
    }

    #[test]
    fn test_delta_application() {
        let mut conn = setup_db();
        let agent = SyncAgent::new("desktop-1".to_string(), "Desktop".to_string(), 8080);

        let note_id = Ulid::new().to_string();
        let space_id = Ulid::new().to_string();
        let dek = vec![0u8; 32]; // Mock DEK

        let delta = SyncDelta {
            entity_type: "note".to_string(),
            entity_id: note_id.clone(),
            operation: SyncOperation::Create,
            data: Some(b"test data".to_vec()),
            timestamp: Utc::now().timestamp(),
            vector_clock: std::collections::HashMap::new(),
            space_id: Some(space_id.clone()),
        };

        let conflicts = agent
            .apply_deltas(&mut conn, vec![delta], &dek)
            .expect("Failed to apply deltas");
        assert!(conflicts.is_empty());

        // Verify note exists
        let count: i64 = conn
            .query_row(
                "SELECT count(*) FROM note WHERE id = ?",
                [&note_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }
}
