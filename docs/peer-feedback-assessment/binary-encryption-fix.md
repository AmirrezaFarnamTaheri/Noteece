# Binary Data Encryption Fix - Sync Agent

## Critical Issue

**Location**: `packages/core-rs/src/sync_agent.rs`

The sync agent incorrectly treats ciphertext as UTF-8 strings instead of opaque binary data. This can cause data corruption when syncing encrypted content.

## Current Problematic Code

```rust
// BEFORE (BROKEN):
let data_str = String::from_utf8_lossy(data).to_string();
let ciphertext: String = crate::crypto::encrypt_string(&data_str, dek)?;

// Problem: from_utf8_lossy() replaces invalid UTF-8 with �
// This corrupts binary data that happens to have invalid UTF-8 sequences
```

## Recommended Solution

### 1. Update Database Schema

Change TEXT columns to BLOB for encrypted data:

```sql
-- Migration script
ALTER TABLE sync_deltas RENAME TO sync_deltas_old;

CREATE TABLE sync_deltas (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'UPDATE', 'DELETE')),
    data BLOB,  -- Changed from TEXT to BLOB
    encrypted_data BLOB,  -- Changed from TEXT to BLOB
    vector_clock TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Copy data (decrypt, then re-encrypt properly)
INSERT INTO sync_deltas
SELECT id, space_id, entity_type, entity_id, operation,
       NULL as data,  -- Will re-encrypt
       NULL as encrypted_data,  -- Will re-encrypt
       vector_clock, timestamp, device_id, synced, created_at
FROM sync_deltas_old;

DROP TABLE sync_deltas_old;

-- Recreate indexes
CREATE INDEX idx_sync_deltas_space ON sync_deltas(space_id);
CREATE INDEX idx_sync_deltas_entity ON sync_deltas(entity_id);
CREATE INDEX idx_sync_deltas_timestamp ON sync_deltas(timestamp);
CREATE INDEX idx_sync_deltas_synced ON sync_deltas(synced);
```

### 2. Update Encryption Functions

```rust
// packages/core-rs/src/crypto.rs

/// Encrypt binary data (returns Vec<u8>)
pub fn encrypt_bytes(data: &[u8], dek: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if dek.len() != 32 {
        return Err(CryptoError::InvalidKeyLength);
    }

    // Generate random nonce
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);

    // Create cipher
    let key = Key::from_slice(dek);
    let cipher = XChaCha20Poly1305::new(key);
    let nonce_obj = XNonce::from_slice(&nonce);

    // Encrypt
    let ciphertext = cipher.encrypt(nonce_obj, data)
        .map_err(|_| CryptoError::EncryptionFailed)?;

    // Prepend nonce to ciphertext
    let mut result = Vec::with_capacity(24 + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// Decrypt binary data
pub fn decrypt_bytes(encrypted: &[u8], dek: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if dek.len() != 32 {
        return Err(CryptoError::InvalidKeyLength);
    }

    if encrypted.len() < 24 {
        return Err(CryptoError::InvalidCiphertext);
    }

    // Extract nonce and ciphertext
    let (nonce, ciphertext) = encrypted.split_at(24);

    // Create cipher
    let key = Key::from_slice(dek);
    let cipher = XChaCha20Poly1305::new(key);
    let nonce_obj = XNonce::from_slice(nonce);

    // Decrypt
    let plaintext = cipher.decrypt(nonce_obj, ciphertext)
        .map_err(|_| CryptoError::DecryptionFailed)?;

    Ok(plaintext)
}

// Keep string convenience functions that use bytes underneath
pub fn encrypt_string(data: &str, dek: &[u8]) -> Result<Vec<u8>, CryptoError> {
    encrypt_bytes(data.as_bytes(), dek)
}

pub fn decrypt_string(encrypted: &[u8], dek: &[u8]) -> Result<String, CryptoError> {
    let bytes = decrypt_bytes(encrypted, dek)?;
    String::from_utf8(bytes).map_err(|_| CryptoError::InvalidUtf8)
}
```

### 3. Update Sync Agent

```rust
// packages/core-rs/src/sync_agent.rs

impl SyncAgent {
    pub fn create_delta(
        &self,
        conn: &Connection,
        entity_type: &str,
        entity_id: &str,
        operation: SyncOperation,
        data: &[u8],  // Changed from &str to &[u8]
    ) -> Result<SyncDelta, SyncError> {
        let space_id = self.space_id.to_string();
        let delta_id = Ulid::new().to_string();
        let device_id = self.device_id.clone();
        let timestamp = chrono::Utc::now().timestamp();

        // Encrypt data as binary
        let encrypted_data = if !data.is_empty() {
            let dek = self.get_dek(conn)?;
            Some(crate::crypto::encrypt_bytes(data, &dek)?)
        } else {
            None
        };

        // Update vector clock
        let mut clock = self.get_vector_clock(conn, &space_id)?;
        *clock.entry(device_id.clone()).or_insert(0) += 1;
        let clock_json = serde_json::to_string(&clock)?;

        // Insert with BLOB data
        conn.execute(
            "INSERT INTO sync_deltas (
                id, space_id, entity_type, entity_id, operation,
                encrypted_data, vector_clock, timestamp, device_id
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                delta_id,
                space_id,
                entity_type,
                entity_id,
                operation.to_string(),
                encrypted_data,  // rusqlite handles Vec<u8> as BLOB
                clock_json,
                timestamp,
                device_id
            ],
        )?;

        Ok(SyncDelta {
            id: delta_id,
            space_id,
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            operation,
            data: Some(data.to_vec()),
            encrypted_data,
            vector_clock: clock,
            timestamp,
            device_id,
        })
    }

    pub fn get_pending_deltas(&self, conn: &Connection) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT id, space_id, entity_type, entity_id, operation,
                    encrypted_data, vector_clock, timestamp, device_id
             FROM sync_deltas
             WHERE space_id = ?1 AND synced = 0
             ORDER BY timestamp ASC"
        )?;

        let space_id_str = self.space_id.to_string();
        let deltas = stmt.query_map(params![space_id_str], |row| {
            let encrypted_data: Option<Vec<u8>> = row.get(5)?;  // BLOB returns Vec<u8>
            let vector_clock_json: String = row.get(6)?;
            let vector_clock: HashMap<String, i64> =
                serde_json::from_str(&vector_clock_json).unwrap_or_default();

            // Decrypt data
            let data = if let Some(ref enc) = encrypted_data {
                let dek = self.get_dek(conn)?;
                Some(crate::crypto::decrypt_bytes(enc, &dek)?)
            } else {
                None
            };

            Ok(SyncDelta {
                id: row.get(0)?,
                space_id: row.get(1)?,
                entity_type: row.get(2)?,
                entity_id: row.get(3)?,
                operation: SyncOperation::from_str(&row.get::<_, String>(4)?)?,
                data,
                encrypted_data,
                vector_clock,
                timestamp: row.get(7)?,
                device_id: row.get(8)?,
            })
        })?;

        deltas.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
}
```

### 4. Update Calling Code

```rust
// Change all callers to pass &[u8] instead of &str

// Example: Note sync
pub fn sync_note_create(&self, note: &Note) -> Result<(), SyncError> {
    let data = serde_json::to_vec(note)?;  // to_vec instead of to_string
    self.sync_agent.create_delta(
        &self.conn,
        "note",
        &note.id,
        SyncOperation::Create,
        &data,  // &[u8] instead of &str
    )?;
    Ok(())
}

// Example: Note decryption
pub fn apply_note_delta(&self, delta: &SyncDelta) -> Result<(), SyncError> {
    let data = delta.data.as_ref().ok_or(SyncError::MissingData)?;
    let note: Note = serde_json::from_slice(data)?;  // from_slice instead of from_str

    // Apply note to database
    // ...
    Ok(())
}
```

### 5. Add Tests

```rust
#[cfg(test)]
mod binary_encryption_tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_binary_data() {
        let dek = generate_dek();
        let data = vec![0u8, 255, 128, 42, 0, 0, 255];  // Binary data with nulls

        let encrypted = encrypt_bytes(&data, &dek).unwrap();
        let decrypted = decrypt_bytes(&encrypted, &dek).unwrap();

        assert_eq!(data, decrypted);
    }

    #[test]
    fn test_encrypt_invalid_utf8() {
        let dek = generate_dek();
        // Invalid UTF-8 sequence
        let data = vec![0xFF, 0xFE, 0xFD];

        let encrypted = encrypt_bytes(&data, &dek).unwrap();
        let decrypted = decrypt_bytes(&encrypted, &dek).unwrap();

        assert_eq!(data, decrypted);
        // Should NOT lose data like from_utf8_lossy would
    }

    #[test]
    fn test_sync_binary_note_content() {
        let sync_agent = create_test_sync_agent();
        let note_data = b"Note with \xFF\xFE binary content";

        let delta = sync_agent.create_delta(
            &conn,
            "note",
            "test_note_id",
            SyncOperation::Create,
            note_data,
        ).unwrap();

        // Retrieve and verify
        let retrieved = sync_agent.get_pending_deltas(&conn).unwrap();
        assert_eq!(retrieved[0].data.as_ref().unwrap(), note_data);
    }
}
```

## Migration Steps

1. **Backup Database**: Always backup before schema changes
2. **Add Migration**: Create migration script for TEXT → BLOB conversion
3. **Update Code**: Implement binary encryption functions
4. **Test Thoroughly**: Run all sync tests with binary data
5. **Deploy**: Roll out with clear migration notes

## Performance Impact

✅ **Positive:**

- Eliminates UTF-8 validation overhead
- Reduces data corruption risk
- Proper binary handling is more efficient

⚠️ **Neutral:**

- Database size unchanged (BLOB vs TEXT storage similar)
- No significant performance difference

## Security Benefits

✅ **Prevents data corruption** in encrypted sync
✅ **Proper handling of binary ciphertext**
✅ **No data loss from encoding conversion**

## Estimated Effort

- **Development**: 1-2 days
- **Testing**: 1 day
- **Migration Script**: 1 day
- **Total**: ~4 days
