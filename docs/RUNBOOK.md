# Noteece Operations Runbook

## Overview

This runbook covers operational procedures for the Noteece application, including the desktop app (Tauri), mobile app (Expo/React Native), core Rust library, and relay server.

---

## 1. Deployment

### 1.1 Desktop App

```bash
# Build for production
cd apps/desktop
pnpm build
cargo build --manifest-path src-tauri/Cargo.toml --release

# Build platform-specific installers
pnpm build:desktop:macos:x64    # macOS Intel
pnpm build:desktop:macos:arm64  # macOS Apple Silicon
pnpm build:desktop:windows       # Windows MSI
pnpm build:desktop:linux         # Linux AppImage
```

### 1.2 Mobile App

```bash
# Build for production
cd apps/mobile
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### 1.3 Relay Server

```bash
# Build relay server
cargo build --release -p relay-server

# Run relay server
RELAY_JWT_SECRET=your-secret-here ./target/release/relay-server
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `RELAY_JWT_SECRET` | Yes (production) | JWT signing secret (32+ bytes). Auto-generated if not set (tokens won't survive restart). |
| `RUST_LOG` | No | Log level (default: info). Set to `debug` for verbose logging. |

---

## 2. Monitoring

### 2.1 Health Check

```bash
# Relay server health
curl http://localhost:3000/health
# Expected: {"status":"ok","checks":{"accepting_connections":true,"in_memory_state":true},"registered_devices":0,"total_pending_messages":0,"uptime_seconds":123}
```

The health endpoint returns:

- `status`: "ok" or "degraded"
- `checks.accepting_connections`: always true if responding
- `checks.in_memory_state`: true if internal state is accessible
- `registered_devices`: current number of registered devices
- `total_pending_messages`: total messages in queue across all devices
- `uptime_seconds`: seconds since server started

**Automated monitoring:** Set up a periodic health check (every 30s) and alert if status is not "ok":

```bash
# Simple health check script for cron/supervisor
HEALTH=$(curl -sf http://localhost:3000/health | jq -r '.status')
if [ "$HEALTH" != "ok" ]; then
  echo "ALERT: Relay server health is $HEALTH" | mail -s "Relay Health Alert" ops@example.com
fi
```

### 2.2 Metrics

```bash
# Get operational metrics (no auth required)
curl http://localhost:3000/metrics
# Expected: {"total_requests_served":456,"active_device_count":3,"message_queue_depth":12,"uptime_seconds":86400}
```

The metrics endpoint returns:

- `total_requests_served`: cumulative HTTP requests since server start
- `active_device_count`: number of currently registered devices
- `message_queue_depth`: total pending messages across all devices
- `uptime_seconds`: seconds since server started

**Use with monitoring tools:** Export these metrics to Prometheus/Grafana or similar:

```bash
# Example: push metrics to a monitoring endpoint every 60s
while true; do
  METRICS=$(curl -sf http://localhost:3000/metrics)
  # Parse and forward to your monitoring system
  echo "$METRICS" | jq .
  sleep 60
done
```

### 2.3 Relay Stats (Authenticated)

```bash
# Get relay statistics (requires JWT token)
curl -H "Authorization: Bearer <token>" http://localhost:3000/stats
```

---

## 3. Database

### 3.1 Backup

```bash
# Backup SQLite database (desktop)
cp ~/.noteece/vault.db ~/.noteece/vault.db.backup.$(date +%Y%m%d)

# Backup with SQLCipher decryption (if needed)
sqlcipher ~/.noteece/vault.db
> PRAGMA key = "your-key";
> .backup decrypted_backup.db
```

### 3.2 Migration

Database migrations run automatically on app startup. The schema version is tracked in the `schema_version` table.

```sql
-- Check current schema version
SELECT MAX(version) FROM schema_version;
```

---

## 4. Sync Troubleshooting

### 4.1 Common Issues

| Issue                              | Cause                           | Solution                                                  |
| ---------------------------------- | ------------------------------- | --------------------------------------------------------- |
| Devices not discovering each other | mDNS blocked by firewall        | Ensure UDP port 5353 is open on both devices              |
| Sync conflicts appearing           | Concurrent edits on same entity | Use the Conflict Resolver UI to choose local/remote/merge |
| Relay connection refused           | Relay server not running        | Start relay server or check `RELAY_JWT_SECRET`            |
| Token expired                      | JWT token older than 24h        | Re-register device with relay server                      |

### 4.2 Force Sync Reset

```sql
-- Clear sync history (nuclear option)
DELETE FROM sync_history;
DELETE FROM sync_conflict WHERE resolved = 0;
DELETE FROM entity_sync_log;
```

---

## 5. Security

### 5.1 Key Rotation

If a vault DEK is suspected compromised:

1. Unlock the vault with the current password
2. Export all data via the backup system
3. Create a new vault with a new password
4. Import the exported data
5. Verify data integrity
6. Delete the old vault

### 5.2 Relay Server Security

- Always set `RELAY_JWT_SECRET` in production
- Deploy behind a TLS-terminating reverse proxy (Caddy recommended)
- Monitor `/stats` endpoint for unusual device registrations
- Rotate JWT secret periodically (invalidates all existing tokens)

### 5.3 JWT Secret Rotation Procedure

Rotating the JWT secret invalidates all existing device tokens. All devices must re-register.

**When to rotate:**

- Suspected secret compromise
- Scheduled rotation (e.g., every 90 days)
- After a security incident

**Procedure:**

1. **Notify users** that sync will be interrupted (optional for personal use)
2. **Generate a new secret:**
   ```bash
   # Generate a secure 32-byte hex secret
   openssl rand -hex 32
   ```
3. **Update the environment variable:**

   ```bash
   # Stop the relay server
   # Update RELAY_JWT_SECRET with the new value
   export RELAY_JWT_SECRET=<new-secret>

   # Restart the relay server
   ./relay-server
   ```

4. **Re-register all devices:** Each device must call `POST /register` again to get a new JWT token
5. **Verify:** Check `/health` returns ok and devices can send/fetch messages

**Important:** The old secret is immediately invalid. If using a process manager (systemd, supervisord), update the secret in the service file and restart.

---

## 6. Incident Response

### 6.1 Data Loss

1. Stop all sync operations immediately
2. Identify the last known good backup
3. Check `sync_history` and `entity_sync_log` for recent changes
4. Restore from backup if needed
5. Re-enable sync after verification

### 6.2 Relay Server Compromise

1. Shut down the relay server immediately
2. Rotate `RELAY_JWT_SECRET`
3. All devices will need to re-register
4. Review relay logs for suspicious activity
5. Consider the relay "untrusted" — all data is E2E encrypted, so no plaintext exposure

---

## 7. Performance Tuning

### 7.1 SQLite Optimization

```sql
-- Run periodically
PRAGMA optimize;
PRAGMA wal_checkpoint(TRUNCATE);
```

### 7.2 Argon2id Parameters

Default parameters (desktop): m=19456 (19 MiB), t=2, p=1.
For higher security on desktop: m=65536 (64 MiB), t=3, p=4.

---

## 8. Logs

### 8.1 Desktop Logs

- **macOS:** `~/Library/Logs/Noteece/`
- **Windows:** `%APPDATA%\Noteece\logs\`
- **Linux:** `~/.local/share/Noteece/logs/`

### 8.2 Relay Server Logs

Logs are written to stdout/stderr. Redirect to file for persistence:

```bash
RELAY_JWT_SECRET=secret RUST_LOG=info ./relay-server 2>&1 | tee relay.log
```
