# Building Noteece

This guide explains how to build Noteece binaries for desktop and mobile platforms.

---

## Table of Contents

- [Desktop Builds](#desktop-builds)
- [Mobile Builds](#mobile-builds)
- [Automated Builds (GitHub Actions)](#automated-builds-github-actions)
- [Release Process](#release-process)

---

## Desktop Builds

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v20 or later)
- [pnpm](https://pnpm.io/installation) (v8 or later)
- Platform-specific tools:
  - **Windows**: Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `build-essential`, `libgtk-3-dev`, `libwebkit2gtk-4.0-dev`

### Build Commands

```bash
# Install dependencies
pnpm install

# Build Rust core
cd packages/core-rs
cargo build --release
cd ../..

# Build desktop app
cd apps/desktop
pnpm build
```

### Platform-Specific Packaging

#### Linux

```bash
# Create tarball
mkdir -p dist/linux
cp packages/core-rs/target/release/noteece-core dist/linux/
tar -czf noteece-linux-x64.tar.gz -C dist/linux .
```

#### macOS

```bash
# Create tarball
mkdir -p dist/macos
cp packages/core-rs/target/release/noteece-core dist/macos/
tar -czf noteece-macos-x64.tar.gz -C dist/macos .
```

#### Windows

```powershell
# Create zip archive
mkdir dist\windows
cp packages\core-rs\target\release\noteece-core.exe dist\windows\
Compress-Archive -Path dist\windows\* -DestinationPath noteece-windows-x64.zip
```

---

## Mobile Builds

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/)
- Expo account (free tier available)

### Setup

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS project:**
   ```bash
   cd apps/mobile
   eas build:configure
   ```

### Build Profiles

The mobile app has three build profiles defined in `apps/mobile/eas.json`:

- **development**: Development client with simulator support
- **preview**: Internal testing builds (APK for Android, TestFlight for iOS)
- **production**: Store-ready builds (AAB for Android, IPA for iOS)

### Build Commands

#### Development Builds

```bash
cd apps/mobile
npm run build:development
```

#### Preview Builds

```bash
# Both platforms
npm run build:preview

# iOS only
eas build --profile preview --platform ios

# Android only
eas build --profile preview --platform android
```

#### Production Builds

```bash
# Both platforms
npm run build:production

# iOS only
npm run build:ios

# Android only
npm run build:android
```

### Local Builds

For faster iteration, you can build locally (requires proper signing credentials):

```bash
# iOS (requires macOS and Xcode)
eas build --profile preview --platform ios --local

# Android
eas build --profile preview --platform android --local
```

---

## Automated Builds (GitHub Actions)

Noteece uses GitHub Actions to automate binary builds for all platforms.

### Workflow: Build Binaries

File: `.github/workflows/build-binaries.yml`

#### Triggers

1. **Manual workflow dispatch:**
   - Go to Actions → Build Binaries → Run workflow
   - Choose build profile (preview/production)
   - Choose platform (all/ios/android)

2. **Version tags:**
   - Push a tag: `git tag v1.0.0 && git push origin v1.0.0`
   - Automatically builds all platforms in production mode

#### Build Matrix

The workflow builds for:
- **Desktop**: Linux (ubuntu-latest), macOS (macos-latest), Windows (windows-latest)
- **Mobile**: iOS and Android via EAS Build

#### Artifacts

Built binaries are uploaded as GitHub Actions artifacts:
- `noteece-linux-x64.tar.gz`
- `noteece-macos-x64.tar.gz`
- `noteece-windows-x64.zip`
- Mobile builds are managed by EAS and available in Expo dashboard

#### Secrets Required

Add these secrets in GitHub repository settings:

- `EXPO_TOKEN`: Expo access token for EAS builds
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

---

## Release Process

### 1. Prepare Release

```bash
# Update version in package.json files
pnpm version:bump 1.0.0

# Update CHANGELOG.md with release notes
```

### 2. Create Git Tag

```bash
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

### 3. Automatic Build & Release

The GitHub Actions workflow will:
1. Build all desktop platforms
2. Build mobile apps via EAS
3. Create a GitHub Release with binaries attached
4. Generate release notes automatically

### 4. Mobile Store Submission

#### iOS (App Store)

```bash
cd apps/mobile
npm run submit:ios
```

#### Android (Play Store)

```bash
cd apps/mobile
npm run submit:android
```

### 5. Verify Release

- [ ] Download and test desktop binaries for all platforms
- [ ] Test mobile builds on physical devices
- [ ] Verify release notes are accurate
- [ ] Check that all artifacts are attached to GitHub Release

---

## Troubleshooting

### Desktop Builds

#### Error: "Cannot find Rust compiler"

**Solution:** Install Rust toolchain:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Error: "Missing platform dependencies"

**Linux:**
```bash
sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.0-dev
```

**macOS:**
```bash
xcode-select --install
```

#### Error: "pnpm: command not found"

**Solution:**
```bash
npm install -g pnpm@8
```

### Mobile Builds

#### Error: "Not logged in to Expo"

**Solution:**
```bash
eas login
```

#### Error: "Build failed: signing credentials"

**Solution:**
1. Run `eas credentials` to configure signing
2. For iOS: Provide Apple Developer credentials
3. For Android: Generate or upload keystore

#### Error: "Project ID not configured"

**Solution:** Update `apps/mobile/app.json`:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

---

## Build Configuration Files

### Desktop

- `apps/desktop/package.json`: Build scripts and dependencies
- `packages/core-rs/Cargo.toml`: Rust build configuration

### Mobile

- `apps/mobile/app.json`: Expo configuration
- `apps/mobile/eas.json`: EAS build profiles
- `apps/mobile/package.json`: Build scripts

### CI/CD

- `.github/workflows/build-binaries.yml`: Automated build workflow
- `.github/workflows/ci.yml`: Continuous integration checks

---

## Security Notes

### Code Signing

- **iOS**: Requires Apple Developer account and signing certificates
- **Android**: Requires keystore for signing (never commit keystore to git!)
- **macOS**: Notarization recommended for distribution
- **Windows**: Code signing certificate recommended

### Credential Management

- Store signing credentials in GitHub Secrets
- Use EAS Secrets for mobile app environment variables
- Never commit `.env` files or credentials to version control

---

## Performance Optimization

### Build Time Optimization

1. **Use caching:**
   - GitHub Actions caches dependencies automatically
   - Local: Use `cargo build --release` with `sccache`

2. **Parallel builds:**
   - Rust: `cargo build --release -j $(nproc)`
   - Node: Turborepo handles parallelization automatically

3. **Incremental builds:**
   - Keep `target/` and `node_modules/` for faster rebuilds

### Binary Size Optimization

1. **Rust optimizations** (in `Cargo.toml`):
   ```toml
   [profile.release]
   opt-level = "z"
   lto = true
   strip = true
   codegen-units = 1
   ```

2. **JavaScript bundle optimization:**
   - Tree shaking enabled by default in Vite
   - Code splitting for lazy loading

---

## Related Documentation

- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Development setup
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution workflow
- [apps/mobile/DEPLOYMENT_GUIDE.md](apps/mobile/DEPLOYMENT_GUIDE.md) - Mobile deployment
- [CHANGELOG.md](CHANGELOG.md) - Release history

---

**Built with ❤️ for privacy-conscious knowledge workers**
