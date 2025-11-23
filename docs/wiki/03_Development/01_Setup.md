# Setup Guide

## Prerequisites

Before you begin, ensure your development environment is set up.

### General
- **Node.js:** v18.0.0 or higher.
- **pnpm:** v8+ (We use pnpm workspaces).
- **Rust:** Latest stable version (`rustup update`).

### Linux (Debian/Ubuntu)
You need system libraries for Tauri (WebKitGTK).
```bash
sudo apt update
sudo apt install build-essential libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev curl wget file
```
*Note: On Ubuntu 24.04, `libwebkit2gtk-4.0-dev` is removed. You may need to use `4.1` and adjust `tauri.conf.json` or develop in a container.*

### macOS
- Install **Xcode Command Line Tools**: `xcode-select --install`.

### Windows
- Install **C++ Build Tools** via Visual Studio Installer.

## Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/yourusername/noteece.git
    cd noteece
    ```

2.  **Install Dependencies:**
    ```bash
    pnpm install
    ```
    This command installs dependencies for the root, `core-rs`, `apps/desktop`, and `apps/mobile`.

3.  **Initialize Database (Optional):**
    The app automatically creates and migrates the database on first run.

## Running the Application

### Desktop (Tauri)
```bash
cd apps/desktop
pnpm dev:tauri
```
This will:
1.  Start the React dev server (Vite).
2.  Compile the Rust core.
3.  Launch the Tauri window.

### Mobile (Expo)
```bash
cd apps/mobile
pnpm start
```
Scan the QR code with the Expo Go app on your phone.

## IDE Setup

- **VS Code:** Recommended.
- **Extensions:**
    - `rust-analyzer` (for Rust).
    - `ESLint` & `Prettier` (for TS/JS).
    - `Tauri` (helper).
