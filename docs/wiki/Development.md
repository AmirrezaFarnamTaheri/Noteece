# Development Guide

## Setting Up the Environment

### 1. Install Prerequisites

- **Rust:** Install via `rustup` (https://rustup.rs).
- **Node.js:** Install v18+ (via `nvm` recommended).
- **pnpm:** `npm install -g pnpm`.
- **System Libraries (Linux/Ubuntu):**
  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ```

### 2. Clone and Install

```bash
git clone https://github.com/yourusername/noteece.git
cd noteece
pnpm install
```

### 3. Build Core

It's good practice to verify the Rust core builds first.

```bash
cd packages/core-rs
cargo build
cargo test
```

## Running the Application

### Desktop (Tauri)

```bash
# Terminal 1 (Root)
cd apps/desktop
pnpm dev:tauri
```

This command starts the Vite dev server and then launches the Tauri application window.

### Mobile (Expo)

```bash
# Terminal 1 (Root)
cd apps/mobile
pnpm start
```

Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go on your physical device.

## Coding Standards

### Rust (`packages/core-rs`)
- **Style:** Use `cargo fmt`.
- **Linting:** Use `cargo clippy`.
- **Testing:** Write unit tests in the same file or `tests/` directory. Use `#[test]`.
- **Error Handling:** Use `thiserror` for custom error types. Avoid `unwrap()`.

### TypeScript (`apps/desktop`, `apps/mobile`)
- **Style:** Prettier (auto-formatted on save/commit).
- **Linting:** ESLint.
- **Testing:** Jest + React Testing Library.
- **State:** Zustand for global state. Avoid complex Contexts.

## Architecture Guidelines

- **Logic in Core:** Put as much business logic as possible in `core-rs`. This ensures consistency between Desktop and Mobile (Mobile uses a port/adapter or re-implements strict logic matching Core).
- **Thin Client:** The frontend should primarily handle UI/UX and state synchronization.
- **Commands:** Expose Core logic via `apps/desktop/src-tauri/src/commands/*.rs`.

## Release Process

1.  **Version:** Bump version in `package.json` (root, desktop, mobile) and `Cargo.toml`.
2.  **Changelog:** Update `CHANGELOG.md`.
3.  **Commit:** `git commit -am "chore: release vX.Y.Z"`
4.  **Tag:** `git tag vX.Y.Z`
5.  **Push:** `git push origin main --tags`
6.  **CI:** GitHub Actions will build and attach binaries to the release.
