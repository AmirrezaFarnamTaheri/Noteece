# Development Setup Guide

Complete guide to setting up your Noteece development environment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Running the Application](#running-the-application)
4. [IDE Setup](#ide-setup)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Purpose            |
| -------- | --------------- | ------------------ |
| Node.js  | v18.0.0+        | JavaScript runtime |
| pnpm     | v8.15.0+        | Package manager    |
| Rust     | Latest stable   | Core library       |
| Git      | v2.30+          | Version control    |

### Platform-Specific Requirements

#### Linux (Debian/Ubuntu)

```bash
# Install system dependencies for Tauri
sudo apt update
sudo apt install -y \
  build-essential \
  libwebkit2gtk-4.0-dev \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  curl \
  wget \
  file

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm
```

> **Note:** On Ubuntu 24.04, `libwebkit2gtk-4.0-dev` is deprecated. Use Ubuntu 22.04 or a container for development. See [Troubleshooting](#ubuntu-2404-build-issues) for more details.

#### macOS

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node@20 rustup

# Setup Rust
rustup-init

# Install pnpm
npm install -g pnpm
```

#### Windows

1. **Install Visual Studio Build Tools:**
   - Download from [Visual Studio](https://visualstudio.microsoft.com/downloads/)
   - Select "Desktop development with C++"

2. **Install Rust:**
   - Download from [rustup.rs](https://rustup.rs/)

3. **Install Node.js:**
   - Download from [nodejs.org](https://nodejs.org/) (LTS version)

4. **Install pnpm:**
   ```powershell
   npm install -g pnpm
   ```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/AmirrezaFarnamTaheri/noteece.git
cd noteece
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This installs dependencies for:

- Root workspace
- `packages/core-rs` (Rust core)
- `apps/desktop` (Tauri desktop app)
- `apps/mobile` (Expo mobile app)
- All shared packages

### 3. Build the Rust Core (Optional)

```bash
cd packages/core-rs
cargo build
cd ../..
```

### 4. Verify Installation

```bash
# Check Rust
rustc --version
cargo --version

# Check Node
node --version
pnpm --version

# Check Tauri CLI
cd apps/desktop
pnpm tauri --version
```

---

## Running the Application

### Desktop Application (Tauri)

```bash
cd apps/desktop
pnpm dev:tauri
```

This will:

1. Start the Vite dev server (React frontend)
2. Compile the Rust core library
3. Compile the Tauri backend
4. Launch the desktop window

**First build may take 5-10 minutes** as Rust compiles all dependencies.

### Mobile Application (Expo)

```bash
cd apps/mobile
npm install --legacy-peer-deps
npm start
```

**Running on device:**

- **iOS Simulator:** Press `i`
- **Android Emulator:** Press `a`
- **Physical Device:** Scan QR code with Expo Go app

### Running Tests

```bash
# Desktop tests
cd apps/desktop
pnpm test

# Desktop tests with coverage
pnpm test:coverage

# Mobile tests
cd apps/mobile
npm test

# Rust tests
cd packages/core-rs
cargo test
```

### Linting and Formatting

```bash
# From root directory
pnpm lint
pnpm format

# Rust formatting
cd packages/core-rs
cargo fmt
cargo clippy
```

---

## IDE Setup

### Visual Studio Code (Recommended)

#### Essential Extensions

| Extension          | Purpose                       |
| ------------------ | ----------------------------- |
| `rust-analyzer`    | Rust language support         |
| `ESLint`           | JavaScript/TypeScript linting |
| `Prettier`         | Code formatting               |
| `Tauri`            | Tauri development helpers     |
| `Even Better TOML` | Cargo.toml syntax             |

#### Recommended Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "rust-analyzer.check.command": "clippy",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### JetBrains (WebStorm/IntelliJ)

1. Install the Rust plugin
2. Configure ESLint in Preferences → Languages & Frameworks
3. Enable Prettier as default formatter

---

## Troubleshooting

### Common Issues

#### Rust Compilation Errors

```bash
# Update Rust toolchain
rustup update stable

# Clean and rebuild
cd packages/core-rs
cargo clean
cargo build
```

#### Node Module Issues

```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

#### Tauri Build Failures

```bash
# Ensure system dependencies are installed (Linux)
sudo apt install libwebkit2gtk-4.0-dev

# Check Tauri CLI version
cd apps/desktop
pnpm tauri info
```

#### Mobile Build Issues

```bash
# Clear Expo cache
cd apps/mobile
npx expo start --clear

# Reset Metro bundler
npx react-native start --reset-cache
```

### Ubuntu 24.04 Build Issues

**Symptom:** Build fails with `Package 'webkit2gtk-4.0' not found` or similar errors regarding `javascriptcore-gtk`.

**Cause:** Ubuntu 24.04 (Noble Numbat) removed the `libwebkit2gtk-4.0-dev` package, which is a hard dependency for Tauri v1 (via the `wry` and `javascriptcore-rs` crates).

**Solution:**

1.  **Use Ubuntu 22.04 LTS (Jammy Jellyfish):** This is the recommended environment for building Noteece.
2.  **Use a Docker Container:** Build inside a `ubuntu:22.04` container.
3.  **Upgrade to Tauri v2 (Future):** We are planning a migration to Tauri v2 which supports `webkit2gtk-4.1`.

### Getting Help

- **GitHub Issues:** Report bugs at [github.com/AmirrezaFarnamTaheri/noteece/issues](https://github.com/AmirrezaFarnamTaheri/noteece/issues)
- **Email:** taherifarnam@gmail.com

---

_Created by Amirreza "Farnam" Taheri_
