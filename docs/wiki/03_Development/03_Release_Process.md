# Release Process

This document outlines the steps to release a new version of Noteece.

## Versioning Strategy

We follow **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`.
- **MAJOR:** Breaking changes (e.g., incompatible database schema without auto-migration).
- **MINOR:** New features (backward compatible).
- **PATCH:** Bug fixes.

## Pre-Release Checklist

1.  **Test Suite:**
    - Run `pnpm test:all` (or individual test commands).
    - Ensure CI pipeline on `main` is green.

2.  **Documentation:**
    - Update `CHANGELOG.md`: Move items from `[Unreleased]` to `[vX.Y.Z]`.
    - Update `WIKI.md` if features changed significantly.

3.  **Version Bump:**
    - **Root:** Update `version` in `package.json`.
    - **Rust Core:** Update `version` in `packages/core-rs/Cargo.toml`.
    - **Desktop:** Update `version` in `apps/desktop/src-tauri/tauri.conf.json`.
    - **Mobile:** Update `version` in `apps/mobile/app.json`.

## The Release Workflow

1.  **Commit & Tag:**
    ```bash
    git commit -am "chore: release v1.2.0"
    git tag v1.2.0
    git push origin main --tags
    ```

2.  **CI/CD Build (GitHub Actions):**
    - The `.github/workflows/release.yml` workflow triggers on tags starting with `v*`.
    - It builds binaries for:
        - **Linux:** `.deb`, `.AppImage`
        - **macOS:** `.dmg`, `.app`
        - **Windows:** `.msi`, `.exe`
    - It creates a **GitHub Release** and uploads these artifacts.

3.  **Post-Release:**
    - Verify the artifacts by downloading and running them on a clean VM.
    - Announce the release (Discord, Twitter, etc.).

## Hotfixes

If a critical bug is found in production:
1.  Branch from the tag: `git checkout -b hotfix/v1.2.1 v1.2.0`.
2.  Apply the fix.
3.  Bump version to `v1.2.1`.
4.  Tag and push.
5.  Merge the hotfix back into `main`.
