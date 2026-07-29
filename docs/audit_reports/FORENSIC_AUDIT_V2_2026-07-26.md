# FORENSIC ASSESSMENT — SECOND PASS

**Repository:** Noteece · **Date:** 2026-07-26 · **Supersedes:** `FORENSIC_AUDIT_2026-07-26.md` (v1, same day)

**Why a second pass:** v1 declared three explicit blind spots (per-command authorization, iOS, test quality) and asserted several security claims from knowledge rather than primary sources. This pass closed the blind spots and verified claims against OWASP, NIST, RFCs, vendored SQLCipher/Tauri source, and Google Play policy. **It corrected v1 as often as it extended it.**

---

## 0. Corrections to v1 — read this first

A finding that is wrong is worse than a finding that is missing, because it gets acted on. v1 contained five.

| v1 claim | Verdict | Evidence |
| :--- | :--- | :--- |
| PBKDF2-HMAC-SHA512 @ 256k is a weakness vs Argon2id | **WRONG** | OWASP recommends **220,000** for SHA-512. 256,000 exceeds it. NIST SP 800-132 salt minimum also met. This was a preference stated as a defect. |
| `kdf_iter` lowered to 64,000 on mobile is a live weakness | **OVERSTATED ×2** | `PragmaTuner` has **zero callers**, and `PRAGMA kdf_iter` is a **no-op** on a raw-hex-keyed connection (verified in the vendored SQLCipher amalgamation). |
| `fs.scope` in `tauri.conf.json` mitigates broad filesystem access | **WRONG, and load-bearing** | `Scopes.fs.is_allowed()` is called **only** from Tauri's built-in JS `fs` endpoints. A custom `#[tauri::command]` using `std::fs` never consults it. This is exactly the gap FINDING-V2-03 exploits. |
| `shell.open: true` is a concern | **WRONG** | Tauri v1 compiles in an anchored regex allowing only `mailto:`/`tel:`/`https?://`; `Program::from_str` is a closed enum. Not exploitable. (The CVE usually cited, CVE-2025-31477, is **v2-plugin-only**.) |
| Blob encryption is convergent-encryption with a privacy tradeoff | **MISCHARACTERIZED** | HKDF usage is *correct* (secret DEK as IKM). The real bug is adjacent and worse — see FINDING-V2-06. |

Also confirmed **not** findings, against primary sources: `Argon2::default()` is m=19456/t=2/p=1, an exact match to OWASP's recommendation; AES-KW is NIST SP 800-38F-approved for key wrapping; XChaCha20-Poly1305 with random 192-bit `OsRng` nonces is the documented pattern.

**Process note.** Two subagent findings in this pass were also wrong and were caught only by direct inspection: a claimed HIGH that Social Hub biometric storage omits `requireAuthentication` (it does not — the write path sets it), and a claim that `.cargo/audit.toml` suppressed only warnings (it did not — six real vulnerabilities were being reported and I had read only the tail of the log). Nothing in this report should be actioned without opening the cited file.

---

## 1. Executive summary

- **Health rating: 3.0 / 10** (v1 said 4.0). Lowered because this pass found a **live, unauthenticated LAN data-exfiltration path in shipping mobile code**, a shipping **release-signing failure**, and confirmed the frontend↔backend contract is broken in **30** places rather than the ~8 v1 found.
- The cryptographic *primitives* are sound — soundly chosen, correctly used, and now verified against standards. Every serious problem is in **plumbing, authorization, and platform integration**, not in the crypto.
- The recurring pattern is **mechanisms that exist, are well-written, and are never invoked**: `TofuStore` (trust-on-first-use, 0 callers), `crdt.rs` (a real `yrs` CRDT, 0 callers), `check_permission_cmd` (RBAC, never consulted by any mutating command), envelope signatures (field exists, no `sign()` function). The codebase reads as secure to a reviewer skimming module names.

---

## 2. Critical findings

### [FINDING-V2-01] — Mobile auto-syncs the vault to any host on the LAN — **CRITICAL, LIVE**

- **Description:** On every vault unlock the mobile app starts a background task that scans mDNS and syncs with **the first responder, unconditionally**. The handshake accepts the peer's public key off the wire, pins nothing, and sets `peerAuthenticated = true` merely because a response arrived. Transport is plaintext `ws://`.
- **Evidence:** `apps/mobile/app/_layout.tsx:55` (`startBackgroundSync()` on unlock) → `background-sync.ts:14-33` (`initiateSync(devices[0].id, …)`) → `sync-client.ts:188` (`ws://`), `:229-236` (unpinned peer key; `peerAuthenticated = true`). `initiateSync` (`:155-176`) then **pulls** peer deltas into the local DB *and* **pushes** the full local change set out.
- **Impact:** Any host on the same network — coffee shop, office, rogue AP — advertises `_noteece-sync._tcp.local.` and obtains full read *and* write of the user's vault. No pairing code, no user interaction.
- **Aggravating detail:** the *legitimate* desktop peer advertises an **empty** public key (`commands/vault.rs:107` → `p2p.rs:55`), which mobile parses as hex and throws on. **The honest handshake fails; only a deliberate attacker completes it.**
- **Remediation:** Disable `startBackgroundSync` until the handshake is authenticated. Then: pin peer keys via the existing `TofuStore`, put the public key in the mDNS TXT record, run the DH output through a KDF with transcript binding, and move off plaintext `ws://`. **Not applied here — it disables a shipped feature and is the owner's call.**

### [FINDING-V2-02] — Release APKs signed with the public AOSP debug key — **CRITICAL, FIXED**

- **Evidence:** `apps/mobile/android/app/build.gradle:138` set `release.signingConfig = signingConfigs.debug`; `debug.keystore` is **git-tracked**; `keytool` confirms `CN=Android Debug`, the universally-known AOSP key, password `android` hardcoded at `:126-128`.
- **Impact:** the private half ships in every Android SDK. Anyone can forge updates; a debug-signed build can never be updated by a properly-signed one; Play rejects the upload outright.
- **Status:** **Fixed** (`ac8102f`). Release signing now comes from injected credentials and produces an *unsigned* artifact with a warning when they are absent — an unsigned build fails loudly, a debug-signed one looks fine.

### [FINDING-V2-03] — Path traversal → arbitrary file read via blob retrieval — **HIGH, FIXED**

- **Evidence:** `packages/core-rs/src/blob.rs` `retrieve_blob` passed caller-controlled `hex_hash` to `Path::join`. `join` **replaces** the base path on an absolute component, so `blob_id = "xx/etc/passwd"` resolved to `/etc/passwd`. Reachable via the registered `process_ocr_job_cmd` (`commands/ocr.rs:44`). The `[0..2]`/`[2..]` slicing also panicked on short or non-UTF-8 input.
- **Status:** **Fixed** (`f697487`, `e1c9ae0`) — content addresses validated as exactly 64 lowercase hex chars before any path construction, applied to both blob and chunk paths.
- **Note:** v1 would have rated this lower because it wrongly believed `fs.scope` constrained it. It does not.

### [FINDING-V2-04] — Sync silently destroys data — **CRITICAL, NOT FIXED**

Four independent defects in `delta_applier.rs` / `engine.rs`:

1. **`INSERT OR REPLACE` wipes unsynced columns.** SQLite REPLACE is DELETE+INSERT. `delta_applier.rs:63,97,177,214,245,275` list only a subset of columns, so resolving a task conflict nulls `description`, `due_at`, `priority`, `project_id` and orphans subtasks; resolving a note conflict blanks `title` and **resurrects trashed notes** (`is_trashed` → 0).
2. **The same REPLACE breaks sync entirely for tagged notes.** `note_tags.note_id` / `knowledge_card.note_id` are FKs with `NO ACTION`; the implicit DELETE raises `SQLITE_CONSTRAINT` and rolls back the whole batch. Any vault with tagged notes can **never** complete a sync.
3. **Stale deltas overwrite newer local data** with no conflict raised — no timestamp guard in the applier (`engine.rs:659-676`).
4. **`mark_conflict_resolved` matches on `entity_id`, not conflict id** (`engine.rs:702`), silently resolving every outstanding conflict for that entity across all spaces, destroying the only copy of the losing branches.

### [FINDING-V2-05] — Timestamp units are inconsistent, and it breaks sync silently — **CRITICAL, NOT FIXED**

- Mobile writes its watermark in **milliseconds** (`sync-client.ts:861`); Rust gatherers compare against **seconds** columns (`delta_gatherer.rs:38,68`). The watermark exceeds every row, so **sync reports success while transferring nothing.**
- `note.modified_at` receives seconds from Rust (`note.rs:72`) and milliseconds from mobile capture (`capture.tsx:33`) **into the same column**, so under wall-clock LWW a mobile note is ~50,000 years newer and **always wins**.
- Frontend is split ~70/30 on `*1000`, so the same task renders overdue in one widget and 1/1/1970 in another.

---

## 3. High findings (not fixed)

| ID | Finding | Evidence |
| :--- | :--- | :--- |
| V2-06 | **Blob filenames leak content.** Objects stored at `objects/<sha256-of-plaintext>`; manifests written **unencrypted**. Anyone reading the vault dir (cloud-sync, backup, disk image) can hash candidate files and confirm possession — without touching ciphertext. | `blob.rs:32,44,88-96` |
| V2-07 | **RBAC is decorative.** 12 collaboration commands, all vault-gated, **none** authorization-checked; actor is a hardcoded `"admin"`/`"system"` literal. `check_permission_cmd` is a read-only query the frontend calls on itself. **No mutating command anywhere takes a session token.** | `collaboration.rs:36,50,63,87,108,127` |
| V2-08 | **Five ungated commands.** Three backup commands take `_db` — the underscore means the vault state is never consulted. `delete_backup_cmd` performs **destructive file deletion with the vault locked**. | `commands/backup.rs:52,63,70`; `sync.rs:102,115` |
| V2-09 | **Unrestricted directory walk.** `import_from_obsidian_cmd` takes an arbitrary path with no scope restriction and ingests every `.md` under it. Chained with `get_all_notes_in_space_cmd` this is read-and-exfiltrate over the filesystem. `fs.scope` does **not** apply (§0). | `commands/import.rs:6-15`; `import.rs:36` |
| V2-10 | **CalDAV SSRF.** Host check is `starts_with`-based; `http://localhost.attacker.com/` passes, as does `https://` to any internal host. Credentials are attached to the outbound request. | `caldav/sync.rs:267-274` |
| V2-11 | **30 broken IPC commands** (not ~8). Includes the entire AI subsystem and RAG. Three tests **assert dead command names and pass**, certifying the bugs. | `scripts/check-ipc-contract.mjs` reproduces; `LocalAI.test.tsx:55`, `ChatWithVault.test.tsx:114`, `HabitsTracker.test.tsx:117` |
| V2-12 | **Auth rate-limit never fires.** `or_insert` sets the window `Instant` only on first insertion and never refreshes it; the counter never resets on success. After the window elapses the limiter is permanently disabled. | `auth.rs:16-27,54-58` |
| V2-13 | **Play policy — deceptive distribution.** Store flavor ships a no-op accessibility stub while the sideload flavor carries the live 35-app scraper. Engages Play's Deceptive Behavior and Device-and-Network-Abuse prohibitions; grounds for account termination independent of the code. | `app/build.gradle:110-121`; [Play accessibility policy](https://support.google.com/googleplay/android-developer/answer/10964491), [device/network abuse](https://support.google.com/googleplay/android-developer/answer/16559646) |

---

## 4. The test suite provides negative assurance

The desktop suite passed **338 tests** while the vault could not be opened. That is structural, not bad luck.

- `__mocks__/@tauri-apps/api/tauri.ts` is one line: `export const invoke = jest.fn()`. A bare `jest.fn()` resolves **any** command name, so no test can distinguish a real handler from a typo. 20 of 50 desktop files route through it.
- **`performance.test.ts` — all 23 tests — never import application code.** They construct object literals in the test body and assert on those literals.
- `ControlPanel.test.tsx:99-101` contains a literal `expect(true).toBe(true)` in the else-branch, explicitly engineered never to fail.
- **No coverage gate anywhere**: `ci.yml:74-88` emits `::warning::` only; tarpaulin has both `|| true` **and** `continue-on-error`; no `coverageThreshold` in any Jest config; `--passWithNoTests` is set.
- **Never run in CI at all:** Playwright e2e, `packages/relay-server` tests, `src-tauri` tests, `automation-dsl` tests.
- **E2E is theater:** `playwright.config.ts:24-28` runs the **Vite dev server in Chromium**. `window.__TAURI__` does not exist; no IPC is exercised. The entire suite is one test asserting the page title.
- **Untested untrusted-input parsers:** `caldav/parser.rs` — 286 lines of hand-rolled index slicing over remote data, **zero tests**, and `to_lowercase()` is not length-preserving in Unicode so `:14`/`:34` can panic mid-codepoint.

**Mitigation shipped:** `scripts/check-ipc-contract.mjs`, wired into CI (`2b623e7`). It diffs invoked names against `generate_handler!` and currently reports all 30. Non-blocking until triaged.

---

## 5. What is genuinely good

Stated plainly, because a report this long otherwise reads as "everything is broken."

- **Crypto primitives, verified against standards:** PBKDF2-HMAC-SHA512 @ 256k (exceeds OWASP), Argon2id at exactly OWASP's parameters, AES-KW per NIST SP 800-38F, XChaCha20-Poly1305 with correct random nonces, CSPRNG throughout, no nonce reuse.
- **`relay.rs` is the best-hardened component in the repo** — bounded ciphertext, binary fields, string fields, empty-id rejection, clock-skew caps, queue limits.
- **Secrets are not leaked to the frontend:** `encrypted_password` and `encrypted_credentials` carry `#[serde(skip_serializing)]`; `User` has no password-hash field; the DEK is never serialized.
- **Injection posture:** all command-layer SQL is parameterized; ULIDs validated before use; no `dangerouslySetInnerHTML`, `eval`, or markdown→HTML sink anywhere.
- **`TofuStore` and `crdt.rs` are correctly implemented.** They just need wiring.
- **Tauri config is mostly correct:** `allowlist.all: false`, no `dangerousRemoteDomainIpcAccess`, `withGlobalTauri` off, asset/HTTP allowlists disabled.

---

## 6. Recommended order of work

1. **Disable `startBackgroundSync`** (V2-01) — a live LAN exfiltration path in shipped code.
2. **Do not ship a release build** until signing is verified end-to-end (V2-02 fixed, needs a real key in CI).
3. **Replace every `INSERT OR REPLACE` in `delta_applier.rs`** with column-scoped `ON CONFLICT DO UPDATE` before anything calls `apply_deltas` (V2-04).
4. **Standardise timestamps on seconds**, with a migration and a lint (V2-05).
5. **Decide on RBAC** (V2-07): wire session tokens into mutating commands, or delete the subsystem and document single-user-full-trust. Shipping it as-is invites false confidence.
6. Gate the three backup commands; fix the CalDAV host check; confine the import walk (V2-08/09/10).
7. Triage the 30 broken IPC commands, then flip the contract check to blocking (V2-11).
8. **Make CI capable of failing:** coverage threshold, drop `|| true`/`continue-on-error` on tarpaulin, drop `--passWithNoTests`, add `cargo test --workspace`.
9. Make a governance decision on Prime interception (V2-13 and v1's FINDING-01).

---

## 7. Coverage and limits of this pass

**Closed from v1:** per-command authorization (all 155 traced), test quality, Android signing/manifest/policy, sync/CRDT correctness, crypto-vs-standards.

**Still open:** iOS has **no native project** (managed Expo; no `Info.plist` to audit — its `usesNonExemptEncryption: false` looks inaccurate given ChaCha20+Argon2 ship). The database/migrations agent had not reported at the time of writing. No finding here was validated with a working exploit; all are established by code reading. `rustsec.org`, `tauri.app`, and `jestjs.io` returned 403 through the environment proxy, so those citations rest on vendored source and GitHub advisories instead — stronger evidence than prose docs, but different sources than requested.

_No claim in this document should be acted on without opening the cited file. Three findings across the two passes were confidently wrong and were caught only that way._

---

## 8. Addendum — persistence layer (empirically verified)

This section landed after §7 was written and **removes the "database/migrations" item from that section's open list**. Unlike the rest of this report, these findings were *reproduced* by replaying the project's actual migration SQL against SQLite 3.45.1 — they are not code-reading inferences. (`sqlite.org` and `zetetic.net` are proxy-blocked, so official docs could not be cited; empirical replay was used instead.)

### Confirmed broken, with reproductions

| # | Finding | Reproduction |
| :--- | :--- | :--- |
| V2-14 | **Task sync has never worked.** `delta_applier.rs:97` writes `task.created_at`; that column does not exist. **100% of task deltas fail.** | `table task has no column named created_at` |
| V2-15 | **Mobile fresh install cannot start.** `database.ts:600` defaults a missing version key to `1`, so a brand-new install replays every migration against the current base schema. v4→v5 selects `note.content` / `note.updated_at`, which the base schema does not have. | `no such column: content` |
| V2-16 | **Migration v17 bricks any populated vault.** `migrations.rs:771` adds a **STORED** generated column via `ALTER TABLE`. SQLite forbids this on a non-empty table. | empty table → OK; **≥1 row → `cannot add a STORED column`** |
| V2-17 | **There is no upgrade path at all.** `migrate()` is called *only* from `create_vault`. `unlock_vault` reads `schema_version` and never compares it. Older vaults open at their old schema forever — and V2-16 means wiring the obvious fix would brick every existing vault. | `vault.rs:106` vs `:177` |
| V2-18 | **Deletes fail under the FKs the app enables.** With `foreign_keys=ON`, deleting a task with a tag, a note with a tag, or a space all raise. Most v1 relations lack `ON DELETE`. A remote note-delete therefore errors and the note is never removed → permanent sync divergence. | `FOREIGN KEY constraint failed` (×3) |
| V2-19 | **Trashed notes resurrect with titles destroyed.** Confirms V2-04 empirically: `title='MyTitle', is_trashed=1` → `title='', is_trashed=0` after one applied delta. | reproduced on real schema |
| V2-20 | **Projects with logged time cannot be deleted.** `delete_project` nullifies `time_entry.project_id`, violating the CHECK that exactly one parent be non-NULL. | `CHECK constraint failed` |
| V2-21 | **`clearAllData` leaves plaintext user content behind.** Drops `note`/`task` but not `fts_note`, `space`, `project`, `tag`, or any `social_*` table. After "clear all local data", every note title and body **remains in the unencrypted FTS index**. | `data-utils.ts:166-183` |
| V2-22 | **Ordinary search input raises errors.** `advanced.rs:157,264,383` bind raw user text into `MATCH`. `C++`, `a-b`, `-hello`, `foo AND`, `col:val` all error; the last is also a column-existence oracle. `search/mod.rs:32-34` escapes correctly — the fix already exists in-repo but is inline and unused elsewhere. | 7 inputs reproduced |
| V2-23 | **`with_db!` serializes the whole app.** It holds the pool `Mutex` guard across the entire block, so `max_size(10)` is inert and WAL's reader concurrency — the reason WAL was chosen — is defeated at the application layer. | `main.rs:18-33` |
| V2-24 | **Mobile/desktop schema drift breaks sync both ways.** `sync-client.ts:522` whitelists `content`, `updated_at`, `tags` on `note`; mobile's own table has `content_md`, `modified_at`, and no `tags`. Same for `task`. Every note sync from desktop fails. | column lists compared |

### Why none of this was caught

`apps/mobile/src/__tests__/database.test.ts:44` mocks `execAsync` as `jest.fn().mockResolvedValue(undefined)` — **no SQL is ever executed by the mobile test suite.** This is the same structural blindness as §4's mocked `invoke`: the tests exercise the calling code and never the thing that actually fails.

### Also found

~1,200 lines of dead code under `db/` with **zero callers** (`pragma_tuning.rs`, `materialized_views.rs`, `vault_backup.rs`), two containing schema bugs against columns that do not exist. `fts_note` is the only FTS table with no maintenance triggers, so synced notes are unsearchable while their stale content stays searchable. Migration v10 never records its version and is non-idempotent. `social/backup.rs:386` builds `INSERT INTO {table} ({cols})` from unvalidated JSON keys.

**One hypothesis was tested and refuted:** `ON DELETE CASCADE` does *not* skip `AFTER DELETE` triggers absent `recursive_triggers`. FTS cleanup on social-account deletion works correctly.

### Revised priority

V2-14, V2-15, and V2-16/17 outrank everything in §6 except V2-01. Task sync has never functioned, mobile cannot cold-start, and the migration ladder is a trap that springs the moment anyone fixes the upgrade path.
