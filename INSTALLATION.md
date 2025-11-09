# Noteece Installation Guide

## Quick Start (Recommended)

### One-Click Installation

Run the automated installation script that handles everything:

```bash
bash ./install.sh
```

This script will:
- ✅ Check system requirements
- ✅ Install dependencies (Node.js, Rust, pnpm)
- ✅ Download and configure the project
- ✅ Run tests
- ✅ Build for your platform
- ✅ Create installation packages
- ✅ Generate release artifacts

---

## Manual Installation

### System Requirements

#### Desktop Build
- **macOS 10.15+** (Intel or Apple Silicon)
- **Windows 10+**
- **Linux** (Ubuntu 18.04+ / Fedora 30+)

**Required Tools**:
- Node.js 18.x or higher
- Rust 1.70+
- pnpm 8.x

#### Mobile Build
- **iOS**: macOS with Xcode 14+
- **Android**: Android SDK 30+, JDK 11+

### Step 1: Clone Repository

```bash
git clone https://github.com/AmirrezaFarnamTaheri/Noteece.git
cd Noteece
```

### Step 2: Install Dependencies

```bash
# Install Node dependencies
pnpm install

# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Step 3: Build Desktop App

```bash
# macOS (Intel)
cd apps/desktop
pnpm build -- --target x86_64-apple-darwin

# macOS (Apple Silicon)
cd apps/desktop
pnpm build -- --target aarch64-apple-darwin

# Windows
cd apps/desktop
pnpm build -- --target x86_64-pc-windows-msvc

# Linux
cd apps/desktop
pnpm build -- --target x86_64-unknown-linux-gnu
```

### Step 4: Build Mobile App

```bash
# iOS (requires macOS)
cd apps/mobile
pnpm build -- --platform ios

# Android
cd apps/mobile
pnpm build -- --platform android
```

### Step 5: Run Tests

```bash
# All tests
pnpm test

# Specific test suite
pnpm test -- extractors.test.ts
pnpm test -- e2e.test.ts
pnpm test -- performance.test.ts
```

---

## Installation Packages

### Desktop Distribution Formats

After building, installation packages are available in `./dist/`:

#### macOS
- `.dmg` - Disk image for easy drag-and-drop installation
- `.app` - Direct application bundle

#### Windows
- `.msi` - Windows Installer package
- `.exe` - Portable executable

#### Linux
- `.AppImage` - Universal Linux format (no installation required)
- `.deb` - Debian package (Ubuntu, Debian)
- `.rpm` - RPM package (Fedora, Red Hat)

### Mobile Distribution Formats

#### iOS
- `.ipa` - iOS App Package (requires Apple Developer account)
- TestFlight distribution link

#### Android
- `.apk` - Android App Package (sideload)
- `.aab` - Android App Bundle (Google Play Store)

---

## Configuration

### Environment Variables

Create `.env` file in project root:

```env
# Server
NOTEECE_SERVER_PORT=8765
NOTEECE_SERVER_HOST=127.0.0.1

# Sync
NOTEECE_SYNC_PORT=8443
NOTEECE_SYNC_AUTO_INTERVAL=300

# Database
NOTEECE_DB_PATH=~/.noteece/data
NOTEECE_BACKUP_PATH=~/.noteece/backups

# Security
NOTEECE_ENABLE_HTTPS=false
NOTEECE_DEV_MODE=false
```

### Build Configuration

Edit `build.config.ts` to customize:
- Output directory
- Optimization settings
- Cache configuration
- Target platforms

---

## Verification

### Verify Installation

```bash
# Check version
noteece --version

# Run health check
noteece health-check

# Test backup functionality
noteece backup-create

# Test sync protocol
noteece sync-discover
```

### Verify Tests Pass

```bash
# Run all tests
pnpm test

# Expected output:
# PASS  src/__tests__/extractors.test.ts
# PASS  src/__tests__/e2e.test.ts
# PASS  src/__tests__/performance.test.ts
# Test Suites: 3 passed, 3 total
# Tests:       180+ passed, 180+ total
```

---

## Troubleshooting

### Common Issues

#### "Node version too old"
```bash
# Update Node.js
nvm install 18
nvm use 18
```

#### "Rust not found"
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### "pnpm not found"
```bash
# Install pnpm
npm install -g pnpm@8
```

#### Build fails on macOS
```bash
# Install Xcode command line tools
xcode-select --install

# Update Rust targets
rustup target add x86_64-apple-darwin aarch64-apple-darwin
```

#### Build fails on Windows
```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/

# Install Rust MSVC toolchain
rustup default stable-msvc
```

#### Tests fail
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Run tests with verbose output
pnpm test -- --verbose
```

---

## Development Setup

### Running Development Server

```bash
# Desktop development
cd apps/desktop
pnpm dev

# Mobile development
cd apps/mobile
pnpm dev

# Core backend
cargo run --package core-rs
```

### Hot Reload

Development servers support hot module reloading (HMR):
- Changes to React components auto-refresh
- Rust changes require rebuild
- CSS changes auto-apply

---

## Release Build

### Create Release Version

```bash
# Build all platforms
pnpm build:all

# Create GitHub release
./scripts/create-release.sh v1.0.0

# Upload to distribution servers
./scripts/upload-release.sh
```

### Version Management

Versions follow semantic versioning (MAJOR.MINOR.PATCH):

```
NOTEECE_VERSION=1.0.0
```

Update in:
- `package.json`
- `Cargo.toml`
- `ios/Noteece.xcodeproj/project.pbxproj`
- `android/app/build.gradle`

---

## Security Notes

### First Run Setup
1. Create secure vault with strong password
2. Enable device pairing for sync
3. Configure backup location
4. Set session timeout (default 24h)

### Data Privacy
- All data encrypted at rest (AES-256)
- Sync uses ECDH key exchange
- Local-first architecture (no cloud)
- Backups encrypted with vault key

### Updates
- Check for updates: `noteece --check-updates`
- Auto-update available on desktop
- Manual update required for mobile

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Search GitHub issues: https://github.com/AmirrezaFarnamTaheri/Noteece/issues
3. Report bugs with system info:
   ```bash
   noteece --system-info
   ```

---

## Next Steps

After installation:

1. **Create Account** - Register or login
2. **Create Vault** - Secure your data with a password
3. **Add Social Accounts** - Connect social media platforms
4. **Pair Devices** - Enable desktop-mobile sync
5. **Create Backups** - Regular encrypted backups
6. **Explore Features** - Notes, tasks, projects, analytics

Enjoy Noteece! 🎉
