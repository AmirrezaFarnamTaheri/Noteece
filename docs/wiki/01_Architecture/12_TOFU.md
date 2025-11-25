# Trust On First Use (TOFU)

**Status:** ✅ Implemented (v1.1.0)  
**Module:** `packages/core-rs/src/sync/tofu.rs`

---

## Overview

TOFU (Trust On First Use) provides device authentication for P2P sync. When two devices first connect, they establish trust based on their public keys. Subsequent connections verify the device presents the same key.

## Security Model

### Trust Levels

| Level             | Description                        | Sync Allowed?   |
| ----------------- | ---------------------------------- | --------------- |
| `Unknown`         | Never seen before                  | ❌ No           |
| `TrustOnFirstUse` | First connection established trust | ✅ Yes          |
| `Verified`        | Explicitly verified by user        | ✅ Yes          |
| `KeyChanged`      | Key differs from stored            | ❌ No (warning) |
| `Revoked`         | User revoked trust                 | ❌ No           |

### Key Change Detection

```
First Connection:
Device A ──► Public Key X ──► Device B
                              └──► Store: "Device A = SHA256(X)"

Later Connection:
Device A ──► Public Key Y ──► Device B
                              └──► Compare: SHA256(Y) ≠ stored hash
                              └──► ALERT: Key Changed!
```

## Implementation

### Verification Flow

```rust
pub fn verify_device(
    conn: &Connection,
    device_id: &str,
    device_name: &str,
    public_key: &[u8],
) -> Result<(TrustLevel, Option<DeviceTrust>)>
```

**Returns:**

- `TrustOnFirstUse` - New device, trust established
- `Verified` - Known device, key matches
- `KeyChanged` - Known device, key differs (potential attack!)
- `Revoked` - Device was revoked

### Database Schema

```sql
CREATE TABLE device_trust (
    device_id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    public_key_hash TEXT NOT NULL,  -- SHA256 of public key
    trust_level TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    sync_count INTEGER DEFAULT 0,
    notes TEXT
);
```

## User Interface

### Desktop (Settings → Sync → Trusted Devices)

```
┌─────────────────────────────────────────────────────┐
│ Trusted Devices                                     │
├─────────────────────────────────────────────────────┤
│ 📱 iPhone 15 Pro                                    │
│    First seen: Nov 20, 2025                         │
│    Last sync: 2 hours ago                           │
│    Status: ✅ Verified                              │
│    [Verify] [Revoke]                                │
├─────────────────────────────────────────────────────┤
│ 💻 MacBook Pro                                      │
│    First seen: Nov 15, 2025                         │
│    Last sync: Just now                              │
│    Status: 🔒 Trust On First Use                    │
│    [Verify] [Revoke]                                │
├─────────────────────────────────────────────────────┤
│ ⚠️ Android Tablet                                   │
│    First seen: Nov 10, 2025                         │
│    Last sync: Failed                                │
│    Status: ⚠️ Key Changed                           │
│    [Re-trust with new key] [Revoke]                 │
└─────────────────────────────────────────────────────┘
```

### Key Change Warning

When a device's key changes, the user sees:

```
⚠️ Security Warning

The device "iPhone 15 Pro" is presenting a different
encryption key than previously stored.

This could indicate:
• The device was reset or reinstalled
• Someone is attempting to impersonate this device

What would you like to do?

[Trust New Key] [Block Device] [View Details]
```

## API Reference

### Check Trust Status

```typescript
// Desktop (Tauri)
const trust = await invoke("get_device_trust", { deviceId: "device-123" });
console.log(trust.trust_level); // "tofu" | "verified" | "revoked" | "key_changed"
```

### Verify Device Explicitly

```typescript
// Upgrade from TOFU to Verified (after QR code scan, etc.)
await invoke("verify_device_explicitly", { deviceId: "device-123" });
```

### Revoke Trust

```typescript
// Block a device
await invoke("revoke_device_trust", { deviceId: "device-123" });
```

### Re-trust with New Key

```typescript
// After user confirms the key change is legitimate
await invoke("retrust_device", {
  deviceId: "device-123",
  newPublicKey: base64EncodedKey,
});
```

## Verification Methods

### 1. Visual Comparison (Default)

Devices display a fingerprint derived from public keys:

```
Your Device:      Peer Device:
🔵🟢🔴🟡          🔵🟢🔴🟡
🟣🟠🔵🟢          🟣🟠🔵🟢
```

Users verbally confirm they match.

### 2. QR Code Scan

One device displays QR, other scans:

```
[QR Code containing:
  - Device ID
  - Public Key
  - Signature
]
```

### 3. NFC Tap (Mobile)

Devices tap to exchange verification data.

## Security Considerations

### Limitations

1. **First Connection Vulnerability** - TOFU trusts the first connection. A MITM attacker present during initial pairing could intercept.

2. **No Central Authority** - Unlike PKI, there's no CA to revoke compromised keys globally.

### Mitigations

1. **Physical Verification** - Encourage users to verify in person for sensitive data
2. **Key Pinning** - Once verified, the key is pinned
3. **Anomaly Detection** - Flag suspicious patterns (multiple key changes)

## Testing

```rust
#[test]
fn test_key_change_detection() {
    let conn = setup_test_db();
    let key1 = b"original_key";
    let key2 = b"different_key";

    // First connection
    TofuStore::verify_device(&conn, "device", "Test", key1).unwrap();

    // Key change
    let (level, _) = TofuStore::verify_device(&conn, "device", "Test", key2).unwrap();
    assert_eq!(level, TrustLevel::KeyChanged);
}
```

---

_See also: [Sync Architecture](10_Sync_Architecture.md) | [Security Hardening](09_Security_Hardening.md)_
