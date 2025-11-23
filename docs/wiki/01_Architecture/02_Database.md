# Database Schema & Storage

## 1. Overview

Noteece uses **SQLite** as its primary storage engine, reinforced with **SQLCipher** for transparent page-level encryption. This ensures that the entire database file is encrypted at rest, protecting user data even if the device is compromised.

## 2. Encryption Strategy

### Data Encryption Key (DEK)
- The database is encrypted using a random 32-byte **DEK**.
- This DEK is never stored in plaintext.
- It is encrypted using a **Key Encryption Key (KEK)** derived from the user's password using **Argon2id**.

### Blob Storage
Large files (images, attachments) are stored outside the database in a content-addressed blob store (`.storage/blobs/`).
- **Filename:** SHA-256 hash of the content.
- **Encryption:** Each blob is encrypted individually using **XChaCha20Poly1305**.

## 3. Core Tables

### 3.1 Structure & Organization
- **`space`**: Logical container for data (e.g., "Personal", "Work").
  - `id` (ULID, PK)
  - `name` (TEXT)
  - `settings` (JSON)
  - `created_at` (INTEGER)

### 3.2 Knowledge
- **`note`**: The atomic unit of knowledge.
  - `id` (TEXT PK)
  - `space_id` (TEXT FK)
  - `title` (TEXT)
  - `content_md` (TEXT) - The raw markdown.
  - `created_at` (INTEGER)
  - `modified_at` (INTEGER) - Used for sync conflict detection.
  - `is_trashed` (BOOLEAN)
- **`tag`**: Many-to-many categorization.
  - `id`, `name`, `color`.
- **`backlink`**: Tracks `[[WikiLinks]]` between notes.
  - `source_id`, `target_id`.

### 3.3 Execution (Projects & Tasks)
- **`project`**:
  - `id` (TEXT PK)
  - `space_id` (TEXT FK)
  - `title` (TEXT)
  - `status` (TEXT) - 'proposed', 'active', 'on_hold', 'completed', 'archived'.
  - `updated_at` (INTEGER)
- **`task`**:
  - `id` (TEXT PK)
  - `project_id` (TEXT FK NULL)
  - `title` (TEXT)
  - `status` (TEXT) - 'inbox', 'todo', 'doing', 'done', 'cancelled'.
  - `priority` (INTEGER) - 1 (Low) to 4 (Urgent).
  - `due_at` (INTEGER NULL)
  - `completed_at` (INTEGER NULL)
  - `recurrence_rule` (TEXT NULL) - RRule string (RFC 5545).
  - `updated_at` (INTEGER)
- **`time_entry`**:
  - `id`, `task_id`, `started_at`, `duration_seconds`.

### 3.4 Personal Growth
- **`habit`**: Daily recurring habits.
  - `id`, `name`, `frequency` ('daily', 'weekly').
- **`habit_log`**: Log of habit completions.
  - `habit_id`, `completed_at`.
- **`goal`**: Long-term objectives.
  - `id`, `title`, `target_date`, `metric`, `target_value`, `current_value`.
- **`health_metric`**: Quantified self data.
  - `id`, `metric_type` (e.g., 'steps'), `value`, `recorded_at`.

### 3.5 Synchronization
- **`sync_state`**: Tracks known peers.
  - `device_id` (PK), `last_seen`.
- **`sync_history`**: Log of sync sessions.
  - `session_id`, `device_id`, `sync_time`, `entities_pushed`, `conflicts_detected`.
- **`sync_conflict`**: Stores divergent versions of entities.
  - `entity_id`, `local_version` (JSON), `remote_version` (JSON).

## 4. Migrations

Database schema changes are managed via versioned migrations in `packages/core-rs/src/db.rs`. The application checks the `PRAGMA user_version` on startup and applies pending migrations sequentially.

**Key Migrations:**
- **v1:** Initial schema (Notes, Spaces).
- **v12:** Added Habits & Goals tables.
- **v14:** Added Audit Logs.
- **v15:** Added `updated_at` columns to `task` and `project` for robust sync.
- **v16:** Added `insight` table for AI suggestions.

## 5. Performance Indices
Indices are created on frequently queried columns:
- `idx_note_space_modified`: `note(space_id, modified_at)` for sync delta queries.
- `idx_task_status`: `task(status)` for dashboard queries.
- `idx_backlink_target`: `backlink(target_id)` for finding "Linked References".
