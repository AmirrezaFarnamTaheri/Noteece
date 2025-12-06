# Testing Strategy

Noteece employs a multi-layered testing strategy to ensure reliability across the monolith.

## 1. Rust Core (`packages/core-rs`)

This is the most critical layer. It uses standard `cargo test`.

### Structure

- **Unit Tests (`src/**/\*.rs`):\*\*
  - Co-located with code using `#[cfg(test)]`.
  - Focus on pure functions (e.g., Markdown parsing, RRule expansion).

- **Integration Tests (`tests/*.rs`):**
  - Located in the `tests/` directory.
  - These tests treat the crate as a black box.
  - **Fixture:** Most tests use a helper `setup_db()` which:
    1. Creates a temporary directory (`tempfile` crate).
    2. Initializes a fresh SQLCipher database.
    3. Runs all migrations.
    4. Returns a thread-safe connection pool.
  - **Coverage:** We aim for >85% coverage on core business logic (Sync, Auth, Database).

**Running Tests:**

```bash
cd packages/core-rs
# Run all tests
cargo test

# Run specific test file
cargo test --test sync_logic_tests

# Run tests with logs enabled (useful for debugging)
RUST_LOG=debug cargo test --test sync_agent_comprehensive_tests -- --nocapture
```

## 2. Desktop Frontend (`apps/desktop`)

Uses **Jest** and **React Testing Library**.

### Structure

- **Component Tests (`__tests__`):**
  - Verify UI rendering and user interactions.
  - Example: `ProjectHub.test.tsx` checks if the project list renders correctly.

- **Mocking:**
  - **Tauri API:** The global `window.__TAURI__` object and `invoke` function are mocked.
  - **Backend Responses:** We simulate JSON responses from the Rust backend to test frontend state handling without running the actual binary.
  - **Zustand:** The global store is reset between tests to ensure isolation.

**Running Tests:**

```bash
cd apps/desktop
pnpm test

# Run with coverage
pnpm test -- --coverage
```

## 3. Mobile Frontend (`apps/mobile`)

Uses **Jest** and **React Native Testing Library**.

### Challenges & Solutions

- **Native Modules:** Libraries like `expo-sqlite` and `expo-file-system` are native bindings. They must be mocked in the Jest environment.
- **Setup:** `jest.pre-setup.js` handles the extensive mocking required for Expo.

**Running Tests:**

```bash
cd apps/mobile
pnpm test
```

## 4. End-to-End (E2E) Testing

_Currently Manual._

We do not yet have automated E2E tests (e.g., Playwright driving the Tauri app). This is a planned improvement.
**Current Workflow:**

1.  Build the app (`pnpm tauri build`).
2.  Launch on a clean VM.
3.  Perform the "Smoke Test" script (Create Note, Sync with Mobile, Search).

## 5. CI/CD Pipeline

The project uses GitHub Actions (see `.github/workflows/ci.yml`).

- **Triggers:** Push to `main`, Pull Requests.
- **Steps:**
  1.  Lint (ESLint, Cargo Clippy).
  2.  Format Check (Prettier, Rustfmt).
  3.  Test (Rust, Desktop, Mobile).
  4.  Build (Check if binaries compile).
