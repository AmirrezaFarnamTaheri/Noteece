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
*   **OpenSSL / SQLCipher Complexity:**
    *   **File:** `Cargo.toml` -> `rusqlite`
    *   **Deep Dive:** We rely on `bundled-sqlcipher-vendored-openssl`.
    *   **Verification:**
        *   Run `cargo tree -p core-rs -i openssl-sys`.
        *   **Acceptance Criteria:** It MUST show `openssl-sys` as a child of `rusqlite` (via `libsqlite3-sys`). It MUST NOT show a second `openssl-sys` being pulled in by another crate (e.g., `reqwest` without `rustls`).
        *   **Risk:** "Diamond dependency" on OpenSSL causes symbol conflicts and random segfaults on Linux.
    *   **Expansion:** If `tokio-tungstenite` (used for P2P) pulls in `native-tls`, it will link system OpenSSL.
    *   **Fix:** Switch `tokio-tungstenite` to use `rustls-tls-native-roots` to avoid system OpenSSL entirely.
*   **Crate Hygiene:**
    *   `perf-harness`: Ensure this binary is explicitly excluded from the release build pipeline (via `exclude` in `Cargo.toml` or build script filters) to prevent artifact bloat.
    *   `jni`: Ensure it is strictly guarded by `target_os = "android"` to prevent polluting the symbol table of the Desktop app.
    *   `gray_matter`: Ensure pinned to `=0.2.2` to prevent breaking frontmatter parsing changes.
    *   `uuid` vs `ulid`: Project uses both. Consolidate where possible.

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

### Deep Dive: Mobile Binary & Permissions
*   **Database Capability:**
    *   **Finding:** The app uses `expo-sqlite`. Standard builds of this library DO NOT include SQLCipher.
    *   **Critical Risk:** If the Rust core writes an encrypted DB, the Mobile UI cannot read it. If Mobile creates the DB, it is plaintext.
    *   **Verification:** Run `strings android/app/build/outputs/apk/debug/app-debug.apk | grep "sqlcipher"` or check linked libs using `readelf`.
    *   **Action:** Switch to `op-sqlite` or a custom build of `expo-sqlite` that links `sqlcipher`.
*   **Permission Auto-Injection:**
    *   **Finding:** `app.json` includes plugins like `expo-location` and `expo-camera`.
    *   **Risk:** These plugins inject `ACCESS_FINE_LOCATION` and `CAMERA` permissions into `AndroidManifest.xml` automatically.
    *   **Action:** Inspect generated manifest. Remove unused plugins to adhere to "Least Privilege".

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
- [ ] `openssl-sys` is strictly deduped (resolve Diamond Dependency).
- [ ] `gray_matter` pinned to `=0.2.2`.
- [ ] `java -version` is 17.x.x.
- [ ] `pkg-config` finds `webkit2gtk` on the Linux build machine.
- [ ] `pnpm dedupe --check` passes.
- [ ] CI workflows pin specific runner OS versions.
- [ ] `perf-harness` is excluded from release artifacts.
- [ ] Mobile Binary verified: `expo-sqlite` + SQLCipher or `op-sqlite`.
- [ ] Mobile Permissions audited (remove unused plugins).
