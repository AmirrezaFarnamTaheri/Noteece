# Phase 0: Environment & Foundation Audit Report

**Status:** Ready for Execution
**Goal:** Establish a deterministic, secure, and fully reproducible build environment across all development machines (Mac/Linux/Windows) and CI pipelines.

## Overview
Phase 0 is the bedrock of the project. If the build environment is shaky, the resulting artifacts are untrustworthy. This phase targets "it works on my machine" syndrome and eliminates it through rigorous version pinning and toolchain verification.

## 0.1 Rust Toolchain & Dependencies (`packages/core-rs`)

### Toolchain Determinism
*   **File:** `rust-toolchain.toml` (Root or Package level)
*   **Audit Check:**
    *   Does the file exist? If not, `cargo` defaults to the system version, leading to inconsistent builds.
    *   **Action:** Ensure `channel = "stable"` (or specific version like `"1.75.0"`) is defined.
*   **Target Triplets:**
    *   Verify all required targets are installed for cross-compilation:
        *   `aarch64-linux-android`
        *   `armv7-linux-androideabi`
        *   `x86_64-linux-android`
        *   `i686-linux-android` (optional, for older emulators)

### Dependency Graph Security
*   **Command:** `cargo audit`
    *   **Action:** Run this in `packages/core-rs`. It checks `RustSec` database for known vulnerabilities in the dependency tree.
    *   **Remediation:** If vulnerabilities are found, update crates. If a patch isn't available, document the risk in `ISSUES.md`.
*   **OpenSSL / SQLCipher Complexity (Diamond Dependency):**
    *   **File:** `Cargo.toml`
    *   **Observation:** `rusqlite` uses `bundled-sqlcipher-vendored-openssl`, while `tokio-tungstenite` (and potentially `reqwest`) uses `native-tls`.
    *   **Risk:** This creates a potential conflict where two different versions of OpenSSL are linked (one vendored by SQLCipher, one system-provided by native-tls), leading to symbol collisions and random segfaults on Linux.
    *   **Action:** Switch `tokio-tungstenite` to use `rustls-tls-native-roots` instead of `native-tls` to remove the system OpenSSL dependency entirely.
*   **Crate Hygiene:**
    *   `perf-harness`: Ensure this binary is explicitly excluded from the release build pipeline (via `exclude` in `Cargo.toml` or build script filters) to prevent artifact bloat.
    *   `jni`: Ensure it is strictly guarded by `target_os = "android"` to prevent polluting the symbol table of the Desktop app.
    *   `uuid` vs `ulid`: Project uses both (v1.10.0 and v1.2.1 respectively). Consolidate where possible, or document why both are needed (ULID for sortable IDs, UUID for standard compliance?).

### Build Scripts (`build.rs`)
*   **Context:** Custom build logic that runs before compilation.
*   **Audit Target:** `packages/core-rs/build.rs` (if exists) or dependencies.
*   **Risk:** Arbitrary code execution or non-deterministic file generation.
*   **Check:** Does it modify source files? (It shouldn't). It should only write to `OUT_DIR`.

---

## 0.2 Mobile Environment (`apps/mobile`)

### JDK & Gradle
*   **Requirement:** React Native 0.73+ requires JDK 17.
*   **Audit Command:** `java -version`
    *   **Acceptance:** `17.x.x`.
    *   **Failure Mode:** JDK 11 causes Gradle build failures with "Unsupported class file major version 61".
*   **Gradle Daemon:**
    *   **File:** `android/gradle.properties`
    *   **Setting:** `org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m`
    *   **Why:** Default heap size is often too small for Kotlin compilation + release minification (R8), leading to `OutOfMemoryError` during CI builds.

### React Native & Expo Ecosystem
*   **Alignment:**
    *   **Command:** `npx expo install --check`
    *   **Goal:** Ensure `package.json` dependencies match the recommended versions for the installed `expo` SDK.
    *   **Specific Risk:** `react-native-reanimated`.
        *   **Check:** Verify `babel.config.js` has the plugin listed **last**.
        *   **Check:** Verify `android/app/build.gradle` enables Hermes (`enableHermes: true`).
*   **Autolinking Logs:**
    *   **Action:** Run `npx expo prebuild --clean` and inspect the output.
    *   **Look for:** "Skipping package..." warnings. This indicates a native module is installed but not being linked, leading to runtime "Module not found" errors.

### Permission Audit (`app.json` vs `AndroidManifest.xml`)
*   **Observation:** `app.json` plugins list `expo-location` and `expo-camera`, but `android.permissions` only lists `VIBRATE` and `USE_BIOMETRIC`.
*   **Risk:** Expo plugins *automatically* inject permissions (`ACCESS_FINE_LOCATION`, `CAMERA`) into the final `AndroidManifest.xml` during prebuild, even if they are not explicitly listed in the `android.permissions` array.
*   **Action:** Inspect the generated `android/app/src/main/AndroidManifest.xml` after `npx expo prebuild`. If unused permissions are present, remove the corresponding plugins or configure them to exclude permissions.

### Database Binary Capability (SQLCipher Check)
*   **Critical Check:** The mobile app uses `expo-sqlite`. Standard `expo-sqlite` builds DO NOT include SQLCipher.
*   **Implication:** If the Rust core expects to open an encrypted database (created by Desktop), but the Mobile UI opens it with standard SQLite, it will fail (file is not a database). If Mobile creates the DB, it will be plaintext.
*   **Action:** Verify if `expo-sqlite` is replaced by a custom build or if `op-sqlite` / `react-native-quick-sqlite` (with encryption support) is required to match Core-RS encryption.
*   **Note:** `mobile_ffi.rs` opens the database via `rusqlite`. If the underlying binary is not linked against SQLCipher on Android, Rust encryption features will panic or fail.

---

## 0.3 Desktop Environment (`apps/desktop`)

### Linux System Libraries (Ubuntu 24.04 Issue)
*   **Context:** `webkit2gtk-4.0` vs `4.1`.
*   **Deep Dive:**
    *   Tauri v1 defaults to `4.0`. Ubuntu 24.04 provides `4.1` and calls it legacy, removing `4.0`.
    *   **Fix Strategy:**
        1.  Install `libwebkit2gtk-4.1-dev`.
        2.  Check if `javascriptcore-rs` crate supports the `4.1` feature flag.
        3.  If not, symlink the `.pc` (pkg-config) files as a temporary hack (documented in `docs/wiki/03_Development/01_Setup.md`).
*   **Verify Pkg-Config:**
    *   **Command:** `pkg-config --modversion webkit2gtk-4.0`
    *   **Success:** Returns a version number.
    *   **Failure:** Returns "not found".

### Windows Build Tools
*   **Requirement:** C++ Build Tools (VS 2022).
*   **Audit:** Ensure "Desktop development with C++" workload is installed, specifically the **MSVC v143** compiler and **Windows 10/11 SDK**.
*   **Environment Variable:** Check `CC` and `CXX` are NOT set to `gcc` if attempting to build with MSVC, as this confuses `cargo`.

---

## 0.4 Monorepo Health (`Root`)

### Package Management (`pnpm`)
*   **Lockfile Integrity:**
    *   **Command:** `pnpm install --frozen-lockfile`
    *   **Scenario:** CI runs this. If it fails, `pnpm-lock.yaml` is out of sync with `package.json`.
*   **Duplicate Packages:**
    *   **Command:** `pnpm dedupe --check`
    *   **Risk:** Multiple versions of `react` or `@types/react` loaded simultaneously. This breaks React Context (Providers return `undefined`).
    *   **Action:** If duplicates exist, run `pnpm dedupe`.
*   **Hoisting Issues (.npmrc):**
    *   **Check:** `shamefully-hoist=true` usually required for React Native in monorepos.
    *   **Verify:** Does `apps/mobile/node_modules/react-native` exist? Or is it hoisted to root?

### TurboRepo Pipeline
*   **File:** `turbo.json`
*   **Audit:**
    *   **Input Awareness:** Does the `build` task declare inputs like `src/**`, `Cargo.toml`, `.env`?
    *   **Risk:** If inputs are missing, Turbo might cache a failed or stale build.
    *   **Output Awareness:** Does it capture `dist/**` or `target/**`?
*   **Environment Variables:**
    *   Check `globalPassThroughEnv`. Ensure sensitive keys (signing keys) are **NOT** passed through unnecessarily, but build keys (API URLs) are.

## 0.5 CI/CD Pipeline (`.github/workflows`)

### Runner Configuration
*   **File:** `ci.yml` / `release.yml`
*   **Check:** `runs-on: ubuntu-22.04` (or `latest`).
    *   **Note:** Pinning to `22.04` is currently safer for `webkit2gtk` compatibility than `24.04`.
*   **Cache Strategy:**
    *   **Rust:** `actions/cache` on `~/.cargo/registry` and `target/`.
    *   **Key Strategy:** Use `${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}`.
    *   **Invalidation:** Ensure specific keys are used so that a change in `Cargo.lock` busts the cache.
    *   **Node:** `pnpm/action-setup` with `store_path` caching.

### Containerization (Advanced)
*   **Reproducibility:** Consider using a Docker container for the build environment (e.g., `Dockerfile.build`) to guarantee that the local dev environment matches CI exactly, eliminating "works on my machine" issues related to system libraries (like `openssl` or `webkit2gtk`).

## Phase 0 Checklist
- [ ] `rust-toolchain.toml` exists and pins a stable version.
- [ ] `cargo audit` returns 0 vulnerabilities.
- [ ] `openssl-sys` conflict resolved (native-tls vs bundled).
- [ ] `java -version` is 17.x.x.
- [ ] `pkg-config` finds `webkit2gtk` on the Linux build machine.
- [ ] `pnpm dedupe --check` passes.
- [ ] CI workflows pin specific runner OS versions.
- [ ] `perf-harness` is excluded from release artifacts.
- [ ] Mobile `expo-sqlite` vs `sqlcipher` binary capability verified (Critical).
