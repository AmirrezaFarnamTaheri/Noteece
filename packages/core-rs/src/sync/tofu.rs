//! Trust On First Use (TOFU) Implementation
//!
//! Implements TOFU mechanism for device authentication in P2P sync.
//! First connection to a device establishes trust, subsequent connections
//! verify the device presents the same public key.
//!
//! Security Properties:
//! - Prevents MITM attacks after initial pairing
//! - Detects key changes (potential device compromise)
//! - Supports explicit trust revocation

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

/// Trust level for a device
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TrustLevel {
    /// Device has never been seen before
    Unknown,
    /// First connection - trust established
    TrustOnFirstUse,
    /// Explicitly verified by user (QR code, etc.)
    Verified,
    /// Trust revoked - block connections
    Revoked,
    /// Key changed since last connection - suspicious
    KeyChanged,
}

impl TrustLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            TrustLevel::Unknown => "unknown",
            TrustLevel::TrustOnFirstUse => "tofu",
            TrustLevel::Verified => "verified",
            TrustLevel::Revoked => "revoked",
            TrustLevel::KeyChanged => "key_changed",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Self {
        match s {
            "tofu" => TrustLevel::TrustOnFirstUse,
            "verified" => TrustLevel::Verified,
            "revoked" => TrustLevel::Revoked,
            "key_changed" => TrustLevel::KeyChanged,
            _ => TrustLevel::Unknown,
        }
    }

    /// Check if this trust level allows sync
    pub fn allows_sync(&self) -> bool {
        matches!(self, TrustLevel::TrustOnFirstUse | TrustLevel::Verified)
    }
}

/// Device trust record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceTrust {
    /// Device identifier
    pub device_id: String,
    /// Device display name
    pub device_name: String,
    /// SHA256 hash of the device's public key
    pub public_key_hash: String,
    /// Current trust level
    pub trust_level: TrustLevel,
    /// Timestamp of first connection
    pub first_seen: i64,
    /// Timestamp of last connection
    pub last_seen: i64,
    /// Number of successful syncs
    pub sync_count: u32,
    /// User-provided notes
    pub notes: Option<String>,
}

/// TOFU storage and verification
pub struct TofuStore;

impl TofuStore {
    /// Initialize TOFU table
    pub fn init_table(conn: &Connection) -> Result<()> {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS device_trust (
                device_id TEXT PRIMARY KEY,
                device_name TEXT NOT NULL,
                public_key_hash TEXT NOT NULL,
                trust_level TEXT NOT NULL DEFAULT 'unknown',
                first_seen INTEGER NOT NULL,
                last_seen INTEGER NOT NULL,
                sync_count INTEGER NOT NULL DEFAULT 0,
                notes TEXT
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_device_trust_level ON device_trust(trust_level)",
            [],
        )?;

        log::info!("[tofu] Trust table initialized");
        Ok(())
    }

    /// Verify or establish trust for a device
    pub fn verify_device(
        conn: &Connection,
        device_id: &str,
        device_name: &str,
        public_key: &[u8],
    ) -> Result<(TrustLevel, Option<DeviceTrust>)> {
        let key_hash = Self::hash_public_key(public_key);
        let now = Self::now();

        // Check existing trust record
        let existing = Self::get_device_trust(conn, device_id)?;

        match existing {
            Some(mut record) => {
                if record.trust_level == TrustLevel::Revoked {
                    // Revoked devices cannot connect
                    log::warn!("[tofu] Revoked device attempted connection: {}", device_id);
                    return Ok((TrustLevel::Revoked, Some(record)));
                }

                if record.public_key_hash != key_hash {
                    // Key changed! This could be an attack
                    log::error!(
                        "[tofu] KEY CHANGE DETECTED for device {}: {} -> {}",
                        device_id,
                        record.public_key_hash,
                        key_hash
                    );

                    // Update record to reflect key change
                    record.trust_level = TrustLevel::KeyChanged;
                    Self::update_trust_level(conn, device_id, TrustLevel::KeyChanged)?;

                    return Ok((TrustLevel::KeyChanged, Some(record)));
                }

                // Same key - update last seen
                Self::update_last_seen(conn, device_id, now)?;
                record.last_seen = now;

                log::info!(
                    "[tofu] Verified device: {} ({})",
                    device_id,
                    record.trust_level.as_str()
                );
                Ok((record.trust_level, Some(record)))
            }
            None => {
                // First connection - establish TOFU
                let record = DeviceTrust {
                    device_id: device_id.to_string(),
                    device_name: device_name.to_string(),
                    public_key_hash: key_hash,
                    trust_level: TrustLevel::TrustOnFirstUse,
                    first_seen: now,
                    last_seen: now,
                    sync_count: 0,
                    notes: None,
                };

                Self::store_device_trust(conn, &record)?;

                log::info!("[tofu] New device trusted (TOFU): {}", device_id);
                Ok((TrustLevel::TrustOnFirstUse, Some(record)))
            }
        }
    }

    /// Store device trust record
    pub fn store_device_trust(conn: &Connection, record: &DeviceTrust) -> Result<()> {
        conn.execute(
            "INSERT OR REPLACE INTO device_trust 
             (device_id, device_name, public_key_hash, trust_level, first_seen, last_seen, sync_count, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                record.device_id,
                record.device_name,
                record.public_key_hash,
                record.trust_level.as_str(),
                record.first_seen,
                record.last_seen,
                record.sync_count,
                record.notes,
            ],
        )?;
        Ok(())
    }

    /// Get device trust record
    pub fn get_device_trust(conn: &Connection, device_id: &str) -> Result<Option<DeviceTrust>> {
        let mut stmt = conn.prepare(
            "SELECT device_id, device_name, public_key_hash, trust_level, first_seen, last_seen, sync_count, notes
             FROM device_trust WHERE device_id = ?1"
        )?;

        let result = stmt.query_row([device_id], |row| {
            let trust_level_str: String = row.get(3)?;
            Ok(DeviceTrust {
                device_id: row.get(0)?,
                device_name: row.get(1)?,
                public_key_hash: row.get(2)?,
                trust_level: TrustLevel::from_str(&trust_level_str),
                first_seen: row.get(4)?,
                last_seen: row.get(5)?,
                sync_count: row.get(6)?,
                notes: row.get(7)?,
            })
        });

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Get all trusted devices
    pub fn get_all_trusted(conn: &Connection) -> Result<Vec<DeviceTrust>> {
        let mut stmt = conn.prepare(
            "SELECT device_id, device_name, public_key_hash, trust_level, first_seen, last_seen, sync_count, notes
             FROM device_trust ORDER BY last_seen DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            let trust_level_str: String = row.get(3)?;
            Ok(DeviceTrust {
                device_id: row.get(0)?,
                device_name: row.get(1)?,
                public_key_hash: row.get(2)?,
                trust_level: TrustLevel::from_str(&trust_level_str),
                first_seen: row.get(4)?,
                last_seen: row.get(5)?,
                sync_count: row.get(6)?,
                notes: row.get(7)?,
            })
        })?;

        let mut devices = Vec::new();
        for row in rows {
            devices.push(row?);
        }
        Ok(devices)
    }

    /// Update trust level for a device
    pub fn update_trust_level(conn: &Connection, device_id: &str, level: TrustLevel) -> Result<()> {
        conn.execute(
            "UPDATE device_trust SET trust_level = ?1 WHERE device_id = ?2",
            params![level.as_str(), device_id],
        )?;
        log::info!(
            "[tofu] Trust level updated for {}: {}",
            device_id,
            level.as_str()
        );
        Ok(())
    }

    /// Verify device explicitly (upgrades from TOFU to Verified)
    pub fn verify_explicitly(conn: &Connection, device_id: &str) -> Result<bool> {
        let existing = Self::get_device_trust(conn, device_id)?;

        if let Some(record) = existing {
            if record.trust_level == TrustLevel::TrustOnFirstUse {
                Self::update_trust_level(conn, device_id, TrustLevel::Verified)?;
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Revoke trust for a device
    pub fn revoke_trust(conn: &Connection, device_id: &str) -> Result<bool> {
        let existing = Self::get_device_trust(conn, device_id)?;

        if existing.is_some() {
            Self::update_trust_level(conn, device_id, TrustLevel::Revoked)?;
            log::warn!("[tofu] Trust revoked for device: {}", device_id);
            return Ok(true);
        }

        Ok(false)
    }

    /// Re-trust a device with a new key (after user confirmation)
    pub fn retrust_with_new_key(
        conn: &Connection,
        device_id: &str,
        new_public_key: &[u8],
    ) -> Result<()> {
        let key_hash = Self::hash_public_key(new_public_key);
        let now = Self::now();

        conn.execute(
            "UPDATE device_trust 
             SET public_key_hash = ?1, trust_level = ?2, last_seen = ?3
             WHERE device_id = ?4",
            params![
                key_hash,
                TrustLevel::TrustOnFirstUse.as_str(),
                now,
                device_id
            ],
        )?;

        log::info!("[tofu] Device {} re-trusted with new key", device_id);
        Ok(())
    }

    /// Increment sync count for a device
    pub fn increment_sync_count(conn: &Connection, device_id: &str) -> Result<()> {
        conn.execute(
            "UPDATE device_trust SET sync_count = sync_count + 1 WHERE device_id = ?1",
            params![device_id],
        )?;
        Ok(())
    }

    /// Update last seen timestamp
    fn update_last_seen(conn: &Connection, device_id: &str, timestamp: i64) -> Result<()> {
        conn.execute(
            "UPDATE device_trust SET last_seen = ?1 WHERE device_id = ?2",
            params![timestamp, device_id],
        )?;
        Ok(())
    }

    /// Hash a public key for storage
    fn hash_public_key(public_key: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(public_key);
        hex::encode(hasher.finalize())
    }

    /// Get current timestamp
    fn now() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        TofuStore::init_table(&conn).unwrap();
        conn
    }

    #[test]
    fn test_first_use_trust() {
        let conn = setup_test_db();
        let public_key = b"test_public_key_12345";

        let (level, record) =
            TofuStore::verify_device(&conn, "device_1", "Test Device", public_key).unwrap();

        assert_eq!(level, TrustLevel::TrustOnFirstUse);
        assert!(record.is_some());
        assert_eq!(record.unwrap().device_name, "Test Device");
    }

    #[test]
    fn test_same_key_verification() {
        let conn = setup_test_db();
        let public_key = b"test_public_key_12345";

        // First connection
        TofuStore::verify_device(&conn, "device_1", "Test Device", public_key).unwrap();

        // Second connection with same key
        let (level, _) =
            TofuStore::verify_device(&conn, "device_1", "Test Device", public_key).unwrap();

        assert_eq!(level, TrustLevel::TrustOnFirstUse);
    }

    #[test]
    fn test_key_change_detection() {
        let conn = setup_test_db();
        let public_key_1 = b"original_public_key";
        let public_key_2 = b"different_public_key";

        // First connection
        TofuStore::verify_device(&conn, "device_1", "Test Device", public_key_1).unwrap();

        // Second connection with different key
        let (level, _) =
            TofuStore::verify_device(&conn, "device_1", "Test Device", public_key_2).unwrap();

        assert_eq!(level, TrustLevel::KeyChanged);
    }

    #[test]
    fn test_revoke_trust() {
        let conn = setup_test_db();
        let public_key = b"test_public_key";

        TofuStore::verify_device(&conn, "device_1", "Test Device", public_key).unwrap();

        TofuStore::revoke_trust(&conn, "device_1").unwrap();

        let (level, _) =
            TofuStore::verify_device(&conn, "device_1", "Test Device", public_key).unwrap();

        assert_eq!(level, TrustLevel::Revoked);
    }

    #[test]
    fn test_explicit_verification() {
        let conn = setup_test_db();
        let public_key = b"test_public_key";

        TofuStore::verify_device(&conn, "device_1", "Test Device", public_key).unwrap();

        TofuStore::verify_explicitly(&conn, "device_1").unwrap();

        let record = TofuStore::get_device_trust(&conn, "device_1")
            .unwrap()
            .unwrap();
        assert_eq!(record.trust_level, TrustLevel::Verified);
    }

    #[test]
    fn test_trust_level_allows_sync() {
        assert!(TrustLevel::TrustOnFirstUse.allows_sync());
        assert!(TrustLevel::Verified.allows_sync());
        assert!(!TrustLevel::Unknown.allows_sync());
        assert!(!TrustLevel::Revoked.allows_sync());
        assert!(!TrustLevel::KeyChanged.allows_sync());
    }
}
