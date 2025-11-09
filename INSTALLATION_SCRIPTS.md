# Noteece Installation Scripts Guide

This document provides comprehensive instructions for using the automated installation scripts on different operating systems.

## Overview

Three installation scripts are provided for maximum platform compatibility:

| Script | Platform | Shell | Requirements |
|--------|----------|-------|--------------|
| `install.sh` | macOS, Linux | Bash | Bash 4.0+, sudo access (for package installation) |
| `install.bat` | Windows | Command Prompt (cmd.exe) | Windows 10+, Administrator privileges |
| `install.ps1` | Windows | PowerShell | PowerShell 5.0+, Administrator privileges |

## Features

All installation scripts provide:

✅ **System Requirements Verification**
- Node.js 18.0.0+
- Rust 1.70.0+
- pnpm 8.0.0+
- Git 2.0.0+

✅ **Automatic Dependency Installation**
- Detects missing dependencies
- Installs via appropriate package manager (Homebrew, apt, dnf, Chocolatey, etc.)
- Configures Rust toolchains and targets

✅ **Repository Setup**
- Installs Node.js dependencies via pnpm
- Sets up Rust workspace
- Creates environment configuration (.env)

✅ **Testing (Optional)**
- Runs comprehensive test suites
- Validates extractors, E2E flows, and performance
- Provides detailed test output

✅ **Building (Optional)**
- Builds for target platforms (macOS, Windows, Linux)
- Creates installation packages
- Generates distribution artifacts

---

## Installation on macOS/Linux

### Quick Start (Recommended)

```bash
# Make script executable
chmod +x install.sh

# Run with all features (setup, tests, build)
bash install.sh

# Or with options:
bash install.sh --skip-tests    # Skip test suite
bash install.sh --skip-build    # Skip building
bash install.sh --only-setup    # Only setup, no tests or build
```

### Step-by-Step Walkthrough

#### 1. Download the Repository
```bash
git clone https://github.com/AmirrezaFarnamTaheri/Noteece.git
cd Noteece
```

#### 2. Run the Installation Script
```bash
bash install.sh
```

#### 3. What the Script Does

**System Detection** (30 seconds)
```
Operating System: macOS (or Linux)
Architecture: arm64 (or x86_64)
```

**Dependency Checking** (30 seconds)
The script checks for:
- Node.js (required: 18+)
- Rust (required: 1.70+)
- pnpm (required: 8+)
- Git (required: 2+)

**Installation** (varies)
- If dependencies are missing, they're installed automatically
- On macOS: Uses Homebrew
- On Linux: Uses apt (Ubuntu/Debian) or dnf (Fedora/RHEL)
- Installs Rust targets for your platform

**Repository Setup** (2-3 minutes)
```
Installing Node dependencies...
Setting up Rust workspace...
Creating .env configuration...
```

**Running Tests** (5-10 minutes) - if not skipped
```
Running all tests...
PASS extractors.test.ts (90+ tests)
PASS e2e.test.ts (60+ tests)
PASS performance.test.ts (30+ tests)
Test Suites: 3 passed, 3 total
Tests: 180+ passed, 180+ total
```

**Building** (10-20 minutes) - if not skipped
```
Building desktop application...
Building macOS (Intel x86_64)...  [if on Intel Mac]
Building macOS (Apple Silicon arm64)... [if on Apple Silicon]
Building Linux (x86_64)...  [if on Linux]
Collecting build artifacts...
```

**Artifacts Generated**
```
Generated 5 artifacts in ./dist/
- Noteece.dmg (macOS)
- Noteece.AppImage (Linux)
- Noteece.deb (Linux)
- Other platform-specific packages
```

### Command Options

```bash
# Skip test execution (useful for development)
bash install.sh --skip-tests

# Skip building (useful if only setting up dev environment)
bash install.sh --skip-build

# Only run setup without tests or build
bash install.sh --only-setup
```

### Troubleshooting on macOS/Linux

#### "Node version too old"
```bash
# Update Node.js
nvm install 18
nvm use 18

# Or via Homebrew
brew install node
```

#### "Rust not found"
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

#### "pnpm not found"
```bash
# Install pnpm globally
npm install -g pnpm@8
```

#### "Permission denied" on build
```bash
# Ensure correct permissions
chmod +x install.sh

# Run with explicit bash
bash install.sh
```

#### Build fails on macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Update Rust targets
rustup target add x86_64-apple-darwin aarch64-apple-darwin
```

#### Tests fail
```bash
# Clear cache and try again
rm -rf node_modules pnpm-lock.yaml
bash install.sh
```

---

## Installation on Windows

### Two Options Available

Windows users have two options for running the installation script:

#### Option 1: PowerShell (Recommended)
PowerShell version provides better error handling and colored output.

#### Option 2: Command Prompt
Traditional batch script for compatibility.

Choose based on your preference - both accomplish the same goal.

---

## PowerShell Installation (Recommended)

### Quick Start

```powershell
# Right-click PowerShell → "Run as Administrator"

# Run the installation script
.\install.ps1

# Or with options:
.\install.ps1 -SkipTests      # Skip test suite
.\install.ps1 -SkipBuild      # Skip building
.\install.ps1 -OnlySetup      # Only setup, no tests or build
```

### First Run

The first time you run a PowerShell script, you may need to enable script execution:

```powershell
# If you get "cannot be loaded because running scripts is disabled"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run the installer
.\install.ps1
```

### Full Installation Process

#### 1. Clone Repository
```powershell
git clone https://github.com/AmirrezaFarnamTaheri/Noteece.git
cd Noteece
```

#### 2. Run as Administrator
- Right-click PowerShell
- Select "Run as Administrator"
- Paste: `.\install.ps1`

#### 3. Installation Stages

**System Detection**
```
Operating System: Windows 11 (or Windows 10)
Architecture: x86_64 (or ARM64)
Computer: YOUR-COMPUTER-NAME
```

**Dependency Checking** (1 minute)
```
[✓] Node.js 18.5.0
[✓] Rust 1.72.0
[✗] pnpm (missing)
[✓] Git 2.41.0
```

**Dependency Installation** (5-10 minutes)
- If Chocolatey not found: Installs Chocolatey
- Installs missing dependencies via Chocolatey
- Configures Rust and Visual C++ toolchain
- Refreshes environment variables

**Repository Setup** (2-3 minutes)
```
[✓] Project directory: C:\Users\YourName\Noteece
[✓] Node dependencies installed
[✓] Rust workspace ready
```

**Configuration** (30 seconds)
```
[✓] .env file created with defaults
Database path: %USERPROFILE%\.noteece\data
Backup path: %USERPROFILE%\.noteece\backups
```

**Testing** (5-10 minutes) - if not skipped
```
[*] Running Test Suite
Running all tests...
[✓] All tests passed (180+ tests)
```

**Building** (10-20 minutes) - if not skipped
```
[*] Building Noteece
Building Windows (x86_64)...
[✓] Windows build complete
[✓] Generated 3 artifacts in .\dist\
```

### PowerShell Options

```powershell
# Skip tests (faster setup)
.\install.ps1 -SkipTests

# Skip build (dev environment only)
.\install.ps1 -SkipBuild

# Only setup without tests or build
.\install.ps1 -OnlySetup
```

### Troubleshooting PowerShell

#### "Running scripts is disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### "Must run as Administrator"
```powershell
# Right-click PowerShell → "Run as Administrator"
# Then run: .\install.ps1
```

#### Chocolatey installation fails
```powershell
# Install Chocolatey manually:
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

#### Build fails - Visual C++ not found
```powershell
# Download Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/

# Select: Workloads → Desktop development with C++
# Complete installation, then re-run the script
```

---

## Batch File Installation (Command Prompt)

### Quick Start

```cmd
# Run Command Prompt as Administrator
# Navigate to the repository
cd C:\path\to\Noteece

# Run the installation script
install.bat
```

### Process Overview

The batch script follows the same steps as PowerShell:

1. **System Detection**
   - Identifies Windows version and architecture

2. **Dependency Checking**
   - Verifies Node.js, Rust, pnpm, Git availability

3. **Installation**
   - Installs Chocolatey if needed
   - Installs missing packages

4. **Setup**
   - Installs Node dependencies
   - Configures Rust

5. **Configuration**
   - Creates .env file

6. **Testing** (optional)
   - Runs test suite

7. **Building** (optional)
   - Creates Windows packages

### Batch Options

```cmd
REM Skip tests
install.bat --skip-tests

REM Skip build
install.bat --skip-build

REM Only setup
install.bat --only-setup
```

### Batch Troubleshooting

#### "Access denied"
```cmd
# Right-click Command Prompt
# Select "Run as Administrator"
# Then run: install.bat
```

#### Chocolatey installation fails
```cmd
REM Install manually from: https://chocolatey.org/install
REM Then run: install.bat
```

---

## Verification After Installation

### Check Installation Success

#### macOS/Linux
```bash
# Verify versions
node --version    # Should be 18.0.0+
rustc --version   # Should be 1.70.0+
pnpm --version    # Should be 8.0.0+

# Check project structure
ls -la apps/
# Should show: desktop, mobile directories

# Verify built artifacts
ls -la dist/
# Should show .dmg (macOS) or .AppImage (Linux)
```

#### Windows (PowerShell)
```powershell
# Verify versions
node --version    # Should be 18.0.0+
rustc --version   # Should be 1.70.0+
pnpm --version    # Should be 8.0.0+

# Check project structure
ls apps\          # Should show desktop, mobile

# Verify artifacts
ls dist\          # Should show .msi or .exe
```

### Test Installation

```bash
# All platforms: Run tests
pnpm test

# Expected output:
# PASS  src/__tests__/extractors.test.ts
# PASS  src/__tests__/e2e.test.ts
# PASS  src/__tests__/performance.test.ts
# Test Suites: 3 passed, 3 total
# Tests: 180+ passed, 180+ total
```

---

## Next Steps After Installation

### Development

```bash
# Desktop development
cd apps/desktop
pnpm dev

# Mobile development
cd apps/mobile
pnpm dev

# Backend development
cargo run --package core-rs
```

### Building Release Packages

```bash
# All platforms
pnpm build:all

# Specific platform
cd apps/desktop
pnpm build -- --target x86_64-apple-darwin  # macOS Intel
pnpm build -- --target aarch64-apple-darwin # macOS ARM
pnpm build -- --target x86_64-pc-windows-msvc # Windows
pnpm build -- --target x86_64-unknown-linux-gnu # Linux
```

### Configuration

Edit `.env` for custom settings:
```env
NOTEECE_SERVER_PORT=8765
NOTEECE_DB_PATH=~/.noteece/data
NOTEECE_ENABLE_HTTPS=false
```

---

## Environment Configuration

Both scripts create a `.env` file with sensible defaults:

```env
# Server Configuration
NOTEECE_SERVER_PORT=8765
NOTEECE_SERVER_HOST=127.0.0.1

# Sync Configuration
NOTEECE_SYNC_PORT=8443
NOTEECE_SYNC_AUTO_INTERVAL=300

# Database Configuration
NOTEECE_DB_PATH=~/.noteece/data (macOS/Linux)
NOTEECE_DB_PATH=%USERPROFILE%\.noteece\data (Windows)

# Security Configuration
NOTEECE_ENABLE_HTTPS=false
NOTEECE_DEV_MODE=true

# Build Configuration
NOTEECE_VERSION=1.0.0
```

---

## Performance Notes

### Estimated Installation Times

| Step | Duration | Notes |
|------|----------|-------|
| System Detection | 30s | Fast |
| Dependency Check | 1m | Depends on system state |
| Installation | 5-15m | Depends on missing packages |
| Node Setup | 2-3m | pnpm install |
| Rust Setup | 1-2m | Fetching dependencies |
| Configuration | 1m | Creating .env |
| Testing | 5-10m | If --skip-tests not used |
| Building | 10-20m | If --skip-build not used |
| **Total** | **30-75m** | Varies by options and system |

### Speed Tips

For faster installation:
```bash
# Skip tests (fastest setup)
bash install.sh --only-setup

# Skip build (dev environment)
bash install.sh --skip-build

# Full installation (validates everything)
bash install.sh
```

---

## Support and Troubleshooting

### Common Issues

**"Command not found"** (macOS/Linux)
```bash
# Make script executable
chmod +x install.sh

# Run with explicit bash
bash install.sh
```

**Script not found** (Windows)
```powershell
# Verify you're in the project directory
Get-Location  # Should be C:\path\to\Noteece

# Run PowerShell as Administrator
# Then: .\install.ps1
```

**Permission errors** (All platforms)
```bash
# macOS/Linux: Use sudo if needed
sudo bash install.sh

# Windows: Right-click → Run as Administrator
```

### Getting Help

1. Check error messages in installation output
2. Review relevant troubleshooting section above
3. See INSTALLATION.md for additional setup help
4. Check GitHub issues: https://github.com/AmirrezaFarnamTaheri/Noteece/issues

---

## Manual Installation (Alternative)

If you prefer not to use the automated scripts, see **INSTALLATION.md** for step-by-step manual instructions.

---

## Version Info

- **Noteece Version**: 1.0.0
- **Node.js Required**: 18.0.0+
- **Rust Required**: 1.70.0+
- **pnpm Required**: 8.0.0+
- **Git Required**: 2.0.0+

Last Updated: November 2024
