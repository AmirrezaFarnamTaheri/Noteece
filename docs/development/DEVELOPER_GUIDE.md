# Noteece Developer Guide

Comprehensive guide for developers contributing to or building upon Noteece.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Security Architecture](#security-architecture)
9. [State Management](#state-management)
10. [Testing](#testing)
11. [Building & Deployment](#building--deployment)
12. [Common Development Tasks](#common-development-tasks)
13. [Best Practices](#best-practices)
14. [Troubleshooting](#troubleshooting)
15. [Contributing](#contributing)

---

## Getting Started

### Prerequisites

#### Required Tools

- **Rust** (latest stable): [Install Rust](https://www.rust-lang.org/tools/install)
- **Node.js** (v18+): [Install Node.js](https://nodejs.org/)
- **pnpm** (v8.15.6+): `npm install -g pnpm`
- **Git**: Version control

#### Platform-Specific Dependencies

**macOS**:

```bash
xcode-select --install
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**Linux (Fedora)**:

```bash
sudo dnf install webkit2gtk4.0-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

**Windows**:

- Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/AmirrezaFarnamTaheri/noteece.git
cd noteece

# Install dependencies
pnpm install

# Run development build
cd apps/desktop
pnpm dev:tauri

# Run tests
pnpm test                    # React tests
cd ../../packages/core-rs
cargo test                   # Rust tests
```

### Development Environment

**Recommended IDE**:

- **VS Code** with extensions:
  - rust-analyzer
  - ESLint
  - Prettier
  - Tauri
  - Error Lens

**Recommended Tools**:

- **Rust Analyzer**: Language server for Rust
- **React DevTools**: Browser extension
- **Redux DevTools**: For state inspection (works with Zustand)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         React UI (TypeScript)           │
│  ┌─────────────────────────────────┐   │
│  │   Components & Views            │   │
│  │   (Dashboard, Editor, etc.)     │   │
│  └─────────────┬───────────────────┘   │
│                │                         │
│  ┌─────────────▼───────────────────┐   │
│  │   State Management              │   │
│  │   - Zustand (app state)         │   │
│  │   - React Query (server state)  │   │
│  └─────────────┬───────────────────┘   │
│                │                         │
│  ┌─────────────▼───────────────────┐   │
│  │   Services (api.ts)             │   │
│  │   Tauri Command Invocations     │   │
│  └─────────────┬───────────────────┘   │
└────────────────┼─────────────────────┘
                 │ IPC (JSON)
┌────────────────▼─────────────────────┐
│     Tauri Runtime (Rust)             │
│  ┌─────────────────────────────────┐ │
│  │   Command Handlers              │ │
│  │   (main.rs)                     │ │
│  └─────────────┬───────────────────┘ │
│                │                      │
│  ┌─────────────▼───────────────────┐ │
│  │   Core Business Logic           │ │
│  │   (packages/core-rs)            │ │
│  │   - vault.rs                    │ │
│  │   - note.rs, task.rs, etc.      │ │
│  └─────────────┬───────────────────┘ │
│                │                      │
│  ┌─────────────▼───────────────────┐ │
│  │   Encrypted SQLite Database     │ │
│  │   (SQLCipher)                   │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** → React component
2. **Component** → Calls API function from `services/api.ts`
3. **API Service** → Invokes Tauri command via `@tauri-apps/api`
4. **Tauri Runtime** → Receives IPC message, calls command handler
5. **Command Handler** → Calls Rust core library function
6. **Core Library** → Queries/updates encrypted database
7. **Database** → Returns encrypted data
8. **Core Library** → Decrypts and returns data
9. **Command Handler** → Serializes result as JSON
10. **API Service** → Returns Promise with data
11. **React Query** → Caches result, updates component
12. **Component** → Renders updated UI

### Monorepo Structure

Noteece uses **Turborepo** with **pnpm workspaces**:

```
noteece/
├── apps/
│   ├── desktop/         # Main desktop app (Tauri)
│   └── mobile/          # Mobile app (React Native) - WIP
├── packages/
│   ├── core-rs/         # Rust business logic
│   ├── ui/              # Shared React components
│   ├── types/           # TypeScript type definitions
│   ├── editor/          # Lexical editor wrapper
│   ├── modes/           # Mode system
│   ├── locale/          # i18n (planned)
│   └── automation-dsl/  # Automation (planned)
└── turbo.json           # Turborepo config
```

---

## Technology Stack

### Frontend Stack

| Technology              | Version | Purpose                    |
| ----------------------- | ------- | -------------------------- |
| **React**               | 18.2    | UI framework               |
| **TypeScript**          | 5.4+    | Type safety                |
| **Mantine**             | 8.3.6   | Component library          |
| **React Query**         | 5.90+   | Data fetching & caching    |
| **Lexical**             | 0.38.2  | Rich text editor           |
| **Zustand**             | 5.0+    | App state management       |
| **React Router**        | 6.17+   | Client-side routing        |
| **Recharts**            | 3.3+    | Data visualization         |
| **React Beautiful DnD** | 13.1    | Drag and drop              |
| **Tabler Icons**        | 3.35+   | Icon library (3500+ icons) |
| **Vite**                | 4.5+    | Build tool                 |

### Backend Stack

| Technology           | Version       | Purpose                     |
| -------------------- | ------------- | --------------------------- |
| **Tauri**            | 2.9.0         | Desktop framework           |
| **Rust**             | Latest stable | Core language               |
| **rusqlite**         | 0.37+         | SQLite interface            |
| **SQLCipher**        | Bundled       | Database encryption         |
| **argon2**           | 0.5+          | Password hashing (Argon2id) |
| **chacha20poly1305** | 0.10+         | AEAD encryption             |
| **hkdf**             | 0.12+         | Key derivation              |
| **yrs**              | 0.15+         | CRDT for sync               |
| **zstd**             | 0.13+         | Compression                 |
| **serde**            | 1.0+          | Serialization               |
| **ulid**             | 1.1+          | Unique IDs                  |

### Development Tools

| Tool                      | Purpose              |
| ------------------------- | -------------------- |
| **Turborepo**             | Monorepo task runner |
| **pnpm**                  | Package manager      |
| **ESLint**                | Linting              |
| **Prettier**              | Code formatting      |
| **Jest**                  | Testing (React)      |
| **React Testing Library** | Component testing    |
| **cargo**                 | Rust build system    |
| **clippy**                | Rust linting         |

---

## Project Structure

### `/apps/desktop` - Main Desktop Application

```
apps/desktop/
├── src/                          # React application
│   ├── components/              # UI components
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── NoteEditor.tsx       # Note editing
│   │   ├── TaskBoard.tsx        # Kanban board
│   │   ├── ProjectHub.tsx       # Project management
│   │   └── ...                  # 60+ components
│   ├── widgets/                 # Dashboard widgets
│   │   ├── TimeTrackingWidget.tsx
│   │   ├── NotesHeatmap.tsx
│   │   ├── InsightsWidget.tsx
│   │   └── ...                  # 18+ widgets
│   ├── hooks/                   # Custom React hooks
│   │   ├── useFetch.ts
│   │   ├── useAsync.ts
│   │   └── useActiveSpace.ts
│   ├── services/                # API layer
│   │   └── api.ts               # Tauri command wrappers
│   ├── store/                   # Zustand stores
│   │   └── useStore.ts
│   ├── utils/                   # Utility functions
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── App.tsx                  # Root component
│   └── main.tsx                 # Entry point
├── src-tauri/                   # Tauri backend
│   ├── src/
│   │   └── main.rs              # Command handlers
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri config
│   └── icons/                   # App icons
├── package.json
└── vite.config.ts
```

### `/packages/core-rs` - Rust Core Library

```
packages/core-rs/
├── src/
│   ├── lib.rs                   # Module exports
│   ├── vault.rs                 # Vault management
│   ├── crypto.rs                # Encryption/decryption
│   ├── db.rs                    # Database & migrations
│   ├── note.rs                  # Note CRUD
│   ├── task.rs                  # Task CRUD
│   ├── project.rs               # Project CRUD
│   ├── search.rs                # Full-text search
│   ├── srs.rs                   # Spaced repetition
│   ├── time_tracking.rs         # Time tracking
│   ├── sync.rs                  # CRDT sync
│   ├── collaboration.rs         # RBAC & permissions
│   ├── import.rs                # Import (Obsidian, Notion)
│   ├── backup.rs                # Backup & restore
│   ├── versioning.rs            # Version history
│   ├── blob.rs                  # Blob storage
│   ├── backlink.rs              # Backlink tracking
│   ├── tag.rs                   # Tag management
│   ├── space.rs                 # Space management
│   └── mode.rs                  # Mode system
├── tests/                       # Integration tests
│   ├── note_tests.rs
│   ├── task_tests.rs
│   └── ...
├── Cargo.toml
└── README.md
```

### `/packages/ui` - Shared UI Components

```
packages/ui/
└── src/
    ├── Button.tsx
    ├── PriorityBadge.tsx
    ├── StatusBadge.tsx
    ├── DateDisplay.tsx
    ├── EmptyState.tsx
    ├── LoadingCard.tsx
    ├── StatCard.tsx
    └── index.ts
```

### `/packages/types` - TypeScript Types

```
packages/types/
└── src/
    └── index.ts                 # All type definitions
        ├── Vault
        ├── Space
        ├── Note
        ├── Task
        ├── Project
        ├── TimeEntry
        ├── KnowledgeCard
        └── ...
```

---

## Development Workflow

### Creating a New Feature

#### 1. Plan the Feature

- Define requirements
- Design data model
- Plan UI/UX
- Identify affected components

#### 2. Backend Implementation (if needed)

**Create Rust functions** in `packages/core-rs/src/`:

```rust
// Example: packages/core-rs/src/feature.rs

use crate::db::DbConnection;
use crate::error::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Feature {
    pub id: String,
    pub name: String,
}

pub fn create_feature(db: &DbConnection, name: String) -> Result<Feature> {
    // Implementation
    Ok(Feature {
        id: ulid::Ulid::new().to_string(),
        name,
    })
}

pub fn get_feature(db: &DbConnection, id: &str) -> Result<Option<Feature>> {
    // Implementation
}
```

**Add tests**:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_feature() {
        // Test implementation
    }
}
```

#### 3. Expose Tauri Commands

**Add command handlers** in `apps/desktop/src-tauri/src/main.rs`:

```rust
#[tauri::command]
fn create_feature_cmd(
    name: String,
    state: tauri::State<AppState>,
) -> Result<Feature, String> {
    let vault = state.vault.lock().unwrap();
    let db = vault.as_ref().ok_or("Vault not unlocked")?;

    core_rs::feature::create_feature(db, name)
        .map_err(|e| e.to_string())
}

// Register in main():
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_feature_cmd,
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 4. Create API Wrapper

**Add to** `apps/desktop/src/services/api.ts`:

```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { Feature } from '@noteece/types';

export async function createFeature(name: string): Promise<Feature> {
  return invoke<Feature>('create_feature_cmd', { name });
}

export async function getFeature(id: string): Promise<Feature | null> {
  return invoke<Feature | null>('get_feature_cmd', { id });
}
```

#### 5. Create React Component

```typescript
// apps/desktop/src/components/FeatureView.tsx

import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, TextInput } from '@mantine/core';
import * as api from '../services/api';

export function FeatureView() {
  const [name, setName] = React.useState('');

  const createMutation = useMutation({
    mutationFn: api.createFeature,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['features']);
    },
  });

  const handleCreate = () => {
    createMutation.mutate(name);
  };

  return (
    <div>
      <TextInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Feature name"
      />
      <Button onClick={handleCreate} loading={createMutation.isPending}>
        Create Feature
      </Button>
    </div>
  );
}
```

#### 6. Add Tests

**React component test**:

```typescript
// apps/desktop/src/components/FeatureView.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureView } from './FeatureView';

describe('FeatureView', () => {
  it('creates a feature', () => {
    render(<FeatureView />);

    fireEvent.change(screen.getByPlaceholderText('Feature name'), {
      target: { value: 'Test Feature' },
    });

    fireEvent.click(screen.getByText('Create Feature'));

    // Assert
  });
});
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes
# ...

# Run tests
pnpm test
cargo test

# Lint and format
pnpm lint
pnpm format
cargo fmt
cargo clippy

# Commit (following Conventional Commits)
git add .
git commit -m "feat(feature): add new feature"

# Push and create PR
git push origin feature/my-new-feature
```

---

## API Reference

### Tauri Commands

All commands are defined in `apps/desktop/src-tauri/src/main.rs` and exposed via IPC.

#### Vault Management

```rust
// Create a new vault
create_vault_cmd(path: String, password: String) -> Result<(), String>

// Unlock existing vault
unlock_vault_cmd(path: String, password: String) -> Result<(), String>

// Lock vault
lock_vault_cmd() -> Result<(), String>

// Check if vault is unlocked
is_vault_unlocked_cmd() -> Result<bool, String>
```

#### Space Management

```rust
// Create space
create_space_cmd(name: String, description: Option<String>) -> Result<Space, String>

// Get all spaces
get_spaces_cmd() -> Result<Vec<Space>, String>

// Get space by ID
get_space_cmd(id: String) -> Result<Option<Space>, String>

// Update space
update_space_cmd(id: String, name: String, description: Option<String>) -> Result<Space, String>

// Delete space
delete_space_cmd(id: String) -> Result<(), String>
```

#### Note Management

```rust
// Create note
create_note_cmd(
    space_id: String,
    title: String,
    content: String,
    tags: Vec<String>
) -> Result<Note, String>

// Get note
get_note_cmd(id: String) -> Result<Option<Note>, String>

// Update note
update_note_cmd(
    id: String,
    title: String,
    content: String,
    tags: Vec<String>
) -> Result<Note, String>

// Delete note
delete_note_cmd(id: String) -> Result<(), String>

// List notes in space
list_notes_cmd(space_id: String) -> Result<Vec<Note>, String>

// Get backlinks
get_backlinks_cmd(note_id: String) -> Result<Vec<Note>, String>
```

#### Task Management

```rust
// Create task
create_task_cmd(
    space_id: String,
    title: String,
    description: Option<String>,
    status: TaskStatus,
    priority: TaskPriority,
    due_date: Option<i64>,
    recurrence: Option<String>
) -> Result<Task, String>

// Update task
update_task_cmd(/* ... */) -> Result<Task, String>

// Complete task
complete_task_cmd(id: String) -> Result<Task, String>

// List tasks
list_tasks_cmd(space_id: String) -> Result<Vec<Task>, String>

// Get tasks by status
get_tasks_by_status_cmd(space_id: String, status: TaskStatus) -> Result<Vec<Task>, String>
```

#### Project Management

```rust
// Create project
create_project_cmd(/* ... */) -> Result<Project, String>

// Add milestone
add_milestone_cmd(
    project_id: String,
    title: String,
    due_date: i64,
    description: Option<String>
) -> Result<Milestone, String>

// Add project risk
add_project_risk_cmd(/* ... */) -> Result<ProjectRisk, String>

// Add project update
add_project_update_cmd(
    project_id: String,
    content: String
) -> Result<ProjectUpdate, String>
```

#### Time Tracking

```rust
// Start time entry
start_time_entry_cmd(
    space_id: String,
    task_id: Option<String>,
    project_id: Option<String>,
    note_id: Option<String>,
    description: Option<String>
) -> Result<TimeEntry, String>

// Stop time entry
stop_time_entry_cmd(entry_id: String) -> Result<TimeEntry, String>

// Get running entries
get_running_entries_cmd(space_id: String) -> Result<Vec<TimeEntry>, String>

// Get recent entries
get_recent_time_entries_cmd(
    space_id: String,
    limit: usize
) -> Result<Vec<TimeEntry>, String>

// Get task time stats
get_task_time_stats_cmd(task_id: String) -> Result<TimeStats, String>

// Create manual entry
create_manual_time_entry_cmd(/* ... */) -> Result<TimeEntry, String>

// Delete entry
delete_time_entry_cmd(entry_id: String) -> Result<(), String>
```

#### Search

```rust
// Full-text search
search_cmd(
    space_id: String,
    query: String,
    filters: SearchFilters
) -> Result<SearchResults, String>

// Advanced search with field filters
advanced_search_cmd(
    space_id: String,
    query: String,
    tag_filter: Option<String>,
    date_filter: Option<DateFilter>,
    status_filter: Option<TaskStatus>
) -> Result<SearchResults, String>

// Save search
save_search_cmd(
    space_id: String,
    name: String,
    query: String,
    filters: SearchFilters
) -> Result<SavedSearch, String>
```

#### Spaced Repetition

```rust
// Create knowledge card
create_card_cmd(
    space_id: String,
    front: String,
    back: String,
    note_id: Option<String>
) -> Result<KnowledgeCard, String>

// Get cards due for review
get_due_cards_cmd(space_id: String) -> Result<Vec<KnowledgeCard>, String>

// Review card
review_card_cmd(
    card_id: String,
    quality: ReviewQuality  // Again, Hard, Good, Easy
) -> Result<KnowledgeCard, String>

// Get review statistics
get_review_stats_cmd(space_id: String) -> Result<ReviewStats, String>
```

#### Import/Export

```rust
// Import Obsidian vault
import_obsidian_cmd(
    space_id: String,
    vault_path: String
) -> Result<ImportResult, String>

// Import Notion export
import_notion_cmd(
    space_id: String,
    export_path: String
) -> Result<ImportResult, String>

// Export note
export_note_cmd(
    note_id: String,
    format: ExportFormat,  // Markdown, HTML, PDF
    output_path: String
) -> Result<(), String>

// Export space
export_space_cmd(
    space_id: String,
    output_path: String
) -> Result<(), String>

// Backup vault
backup_vault_cmd(output_path: String) -> Result<(), String>

// Restore vault
restore_vault_cmd(backup_path: String, password: String) -> Result<(), String>
```

### TypeScript API Wrapper

All Tauri commands are wrapped in `apps/desktop/src/services/api.ts`:

```typescript
import { invoke } from '@tauri-apps/api/tauri';
import type { Note, Task, Project /* ... */ } from '@noteece/types';

// Example wrappers
export const createNote = (spaceId: string, title: string, content: string, tags: string[]): Promise<Note> => {
  return invoke<Note>('create_note_cmd', {
    spaceId,
    title,
    content,
    tags,
  });
};

export const searchNotes = (spaceId: string, query: string): Promise<SearchResults> => {
  return invoke<SearchResults>('search_cmd', {
    spaceId,
    query,
    filters: {},
  });
};
```

---

## Database Schema

### Schema Versions

Noteece uses **SQLite with SQLCipher** for transparent encryption. The schema evolves through migrations defined in `packages/core-rs/src/db.rs`.

**Current Version**: 5

### Core Tables (Version 1)

#### `space` - Workspaces

```sql
CREATE TABLE space (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### `note` - Notes

```sql
CREATE TABLE note (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES space(id),
    title TEXT NOT NULL,
    content_blob_id TEXT,  -- Reference to encrypted blob
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX note_space ON note(space_id);
CREATE INDEX note_created ON note(created_at DESC);
```

#### `task` - Tasks

```sql
CREATE TABLE task (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES space(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,  -- inbox, next, in_progress, waiting, done, cancelled
    priority TEXT NOT NULL,  -- low, medium, high, urgent
    due_date INTEGER,
    project_id TEXT REFERENCES project(id),
    recurrence TEXT,  -- iCal RRULE format
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER
);

CREATE INDEX task_space ON task(space_id);
CREATE INDEX task_status ON task(status);
CREATE INDEX task_due ON task(due_date);
CREATE INDEX task_project ON task(project_id);
```

#### `project` - Projects

```sql
CREATE TABLE project (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES space(id),
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    status TEXT NOT NULL,  -- proposed, active, blocked, done, archived
    start_date INTEGER,
    end_date INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX project_space ON project(space_id);
CREATE INDEX project_status ON project(status);
```

#### `tag` - Tags

```sql
CREATE TABLE tag (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES space(id),
    name TEXT NOT NULL,
    color TEXT,
    created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX tag_space_name ON tag(space_id, name);
```

#### `link` - Backlinks

```sql
CREATE TABLE link (
    id TEXT PRIMARY KEY,
    source_note_id TEXT NOT NULL REFERENCES note(id),
    target_note_id TEXT NOT NULL REFERENCES note(id),
    created_at INTEGER NOT NULL
);

CREATE INDEX link_source ON link(source_note_id);
CREATE INDEX link_target ON link(target_note_id);
```

#### `fts_note` - Full-Text Search Index

```sql
CREATE VIRTUAL TABLE fts_note USING fts5(
    note_id UNINDEXED,
    title,
    content,
    tokenize='porter'  -- Porter stemming
);
```

### SRS Tables (Version 2)

#### `knowledge_card` - Flashcards

```sql
CREATE TABLE knowledge_card (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES space(id),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    note_id TEXT REFERENCES note(id),
    stability REAL NOT NULL DEFAULT 0.0,
    difficulty REAL NOT NULL DEFAULT 0.0,
    last_review INTEGER,
    next_review INTEGER NOT NULL,
    review_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX card_space ON knowledge_card(space_id);
CREATE INDEX card_next_review ON knowledge_card(next_review);
```

#### `review_log` - Review History

```sql
CREATE TABLE review_log (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES knowledge_card(id),
    quality INTEGER NOT NULL,  -- 0-3 (Again, Hard, Good, Easy)
    reviewed_at INTEGER NOT NULL
);

CREATE INDEX review_card ON review_log(card_id);
CREATE INDEX review_time ON review_log(reviewed_at DESC);
```

### Time Tracking Tables (Version 5)

#### `time_entry` - Time Entries

```sql
CREATE TABLE time_entry (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES space(id),
    task_id TEXT REFERENCES task(id),
    project_id TEXT REFERENCES project(id),
    note_id TEXT REFERENCES note(id),
    description TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    duration_seconds INTEGER,
    is_running INTEGER NOT NULL DEFAULT 0,
    CHECK(
        (task_id IS NOT NULL AND project_id IS NULL AND note_id IS NULL) OR
        (task_id IS NULL AND project_id IS NOT NULL AND note_id IS NULL) OR
        (task_id IS NULL AND project_id IS NULL AND note_id IS NOT NULL)
    )
);

CREATE INDEX time_entry_task ON time_entry(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX time_entry_project ON time_entry(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX time_entry_started ON time_entry(started_at DESC);
CREATE INDEX time_entry_running ON time_entry(is_running) WHERE is_running = 1;
```

### Other Tables

- `project_milestone`: Project milestones
- `project_dependency`: Project dependencies
- `project_risk`: RAID log entries
- `project_update`: Project status updates
- `saved_search`: Saved search queries
- `person`: Person references
- `space_people`: User roles (RBAC)
- `form_template`: Dynamic form templates

For complete schema, see `packages/core-rs/src/db.rs`.

---

## Security Architecture

### Encryption Stack

Noteece implements **defense-in-depth** encryption:

#### 1. Master Key Derivation

```
User Password
    ↓
Argon2id (time=3, memory=64MB, parallelism=4)
    ↓
Master Key (256-bit)
```

**Parameters**:

- Algorithm: Argon2id
- Time cost: 3 iterations
- Memory: 64 MB
- Parallelism: 4 threads
- Output: 32 bytes (256-bit key)

#### 2. Data Encryption Key (DEK)

```
Random Generator
    ↓
Generate 256-bit DEK
    ↓
Encrypt DEK with Master Key using XChaCha20-Poly1305
    ↓
Store encrypted DEK in vault
```

#### 3. Per-Blob Encryption

Each piece of content (note, task, etc.) is encrypted separately:

```
DEK + Blob ID
    ↓
HKDF-SHA256 (derive unique key)
    ↓
Blob Encryption Key
    ↓
XChaCha20-Poly1305 AEAD Encryption
    ↓
Encrypted Blob
```

**Benefits**:

- Each blob has unique encryption key
- Compromise of one blob doesn't affect others
- Perfect forward secrecy for individual blobs

#### 4. Database Encryption

SQLCipher provides **transparent database encryption**:

```
SQLCipher Key = HKDF-SHA256(DEK, "sqlcipher-key")
    ↓
SQLCipher encrypts database pages with AES-256
```

### Encryption Flow Diagram

```
┌─────────────────┐
│  User Password  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Argon2id KDF  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Master Key    │
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│  Decrypt DEK    │   │  SQLCipher Key  │
└────────┬────────┘   └─────────────────┘
         │
         ▼
┌─────────────────┐
│      DEK        │
└────────┬────────┘
         │
         ├─────┬─────┬─────┬─────┐
         │     │     │     │     │
         ▼     ▼     ▼     ▼     ▼
      Blob1 Blob2 Blob3 Blob4 BlobN
      (Each with unique key via HKDF)
```

### Recovery Codes

Generated during vault creation:

```
Random 128-bit value
    ↓
Encode as 8 groups of 4 characters (Base32)
    ↓
Example: ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12-3456
```

**Usage**:

- Can be used instead of password to unlock vault
- Derive Master Key from recovery code
- Must be stored securely offline

### Security Best Practices

1. **Never log sensitive data**: Passwords, keys, decrypted content
2. **Zero memory on drop**: Clear sensitive data from memory when done
3. **Use secure random**: `getrandom` crate for cryptographic randomness
4. **Constant-time comparisons**: For password/key verification
5. **No unauthenticated encryption**: Always use AEAD (XChaCha20-Poly1305)

### Threat Model

**Protected Against**:

- ✅ Disk/filesystem access (encrypted at rest)
- ✅ Memory dumps (when vault locked)
- ✅ Database extraction (SQLCipher encryption)
- ✅ Man-in-the-middle (E2E encrypted sync)
- ✅ Server compromise (zero-knowledge sync)

**NOT Protected Against**:

- ❌ Keyloggers (can capture password during unlock)
- ❌ Memory dumps while vault unlocked (decrypted data in RAM)
- ❌ Malicious OS (can capture everything)
- ❌ Physical access to unlocked device

---

## State Management

### Zustand (Application State)

**Location**: `apps/desktop/src/store/useStore.ts`

```typescript
import { create } from 'zustand';

interface AppState {
  activeSpaceId: string | null;
  setActiveSpaceId: (id: string) => void;

  isVaultUnlocked: boolean;
  setVaultUnlocked: (unlocked: boolean) => void;

  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
}

export const useStore = create<AppState>((set) => ({
  activeSpaceId: null,
  setActiveSpaceId: (id) => set({ activeSpaceId: id }),

  isVaultUnlocked: false,
  setVaultUnlocked: (unlocked) => set({ isVaultUnlocked: unlocked }),

  theme: 'auto',
  setTheme: (theme) => set({ theme }),
}));
```

**Usage**:

```typescript
import { useStore } from '../store/useStore';

function Component() {
  const activeSpaceId = useStore((state) => state.activeSpaceId);
  const setActiveSpaceId = useStore((state) => state.setActiveSpaceId);

  // ...
}
```

### React Query (Server State)

**Location**: `apps/desktop/src/App.tsx` (QueryClientProvider)

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,      // 5 seconds
      cacheTime: 10 * 60 * 1000,  // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* App content */}
    </QueryClientProvider>
  );
}
```

**Usage**:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';

function NoteList({ spaceId }: { spaceId: string }) {
  // Fetch notes
  const {
    data: notes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notes', spaceId],
    queryFn: () => api.listNotes(spaceId),
  });

  // Create note mutation
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: api.createNote,
    onSuccess: () => {
      // Invalidate and refetch notes
      queryClient.invalidateQueries(['notes', spaceId]);
    },
  });

  // ...
}
```

**Query Keys Convention**:

```typescript
['notes'][('notes', spaceId)][('note', noteId)][('tasks', spaceId)][('tasks', spaceId, 'active')][('search', query)]; // All notes // Notes in space // Single note // Tasks in space // Active tasks in space // Search results
```

---

## Testing

### React Component Tests

**Framework**: Jest + React Testing Library

**Location**: `apps/desktop/src/__tests__/` or co-located `.test.tsx` files

**Example**:

```typescript
// NotesHeatmap.test.tsx

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotesHeatmap } from '../widgets/NotesHeatmap';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('NotesHeatmap', () => {
  it('renders heatmap', () => {
    render(<NotesHeatmap spaceId="test-space" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/Activity Heatmap/i)).toBeInTheDocument();
  });
});
```

**Run tests**:

```bash
cd apps/desktop
pnpm test
```

### Rust Tests

**Framework**: Built-in Rust test framework

**Location**: `packages/core-rs/tests/` or inline `#[cfg(test)]` modules

**Example**:

```rust
// packages/core-rs/tests/note_tests.rs

use noteece_core::{note, vault, db};

#[test]
fn test_create_and_get_note() {
    // Setup test vault
    let vault_path = "/tmp/test_vault.db";
    let vault = vault::create_vault(vault_path, "password123").unwrap();

    // Create space
    let space = space::create_space(&vault.db, "Test Space".to_string(), None).unwrap();

    // Create note
    let note = note::create_note(
        &vault.db,
        &space.id,
        "Test Note".to_string(),
        "Content".to_string(),
        vec![]
    ).unwrap();

    // Retrieve note
    let retrieved = note::get_note(&vault.db, &note.id).unwrap().unwrap();

    assert_eq!(retrieved.title, "Test Note");
    assert_eq!(retrieved.content, "Content");
}
```

**Run tests**:

```bash
cd packages/core-rs
cargo test
cargo test -- --nocapture  # Show println! output
```

### Integration Tests

**Location**: `packages/core-rs/tests/*.rs`

Test entire workflows:

```rust
#[test]
fn test_task_lifecycle() {
    // Create vault
    // Create space
    // Create task
    // Update status
    // Complete task
    // Archive task
    // Verify state at each step
}
```

### Test Coverage

**TypeScript**:

```bash
cd apps/desktop
pnpm test:coverage
```

**Rust**:

```bash
cd packages/core-rs
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

---

## Building & Deployment

### Development Build

```bash
cd apps/desktop
pnpm dev:tauri
```

**Features**:

- Hot reload for React changes
- Rust recompilation on changes
- DevTools enabled
- Debug logs

### Production Build

```bash
cd apps/desktop
pnpm build:tauri
```

**Output Locations**:

- **Windows**: `apps/desktop/src-tauri/target/release/bundle/msi/`
- **macOS**: `apps/desktop/src-tauri/target/release/bundle/dmg/`
- **Linux**: `apps/desktop/src-tauri/target/release/bundle/appimage/` or `deb/`

### Build Configuration

**Tauri Config**: `apps/desktop/src-tauri/tauri.conf.json`

```json
{
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Noteece",
    "version": "0.1.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.noteece.app",
      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]
    }
  }
}
```

### Code Signing

**macOS**:

```bash
# Sign the app
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" target/release/bundle/macos/Noteece.app

# Create DMG
hdiutil create -volname Noteece -srcfolder target/release/bundle/macos/Noteece.app -ov -format UDZO Noteece.dmg
```

**Windows**:

- Use `signtool` with code signing certificate
- Configure in `tauri.conf.json`:

```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
        "digestAlgorithm": "sha256",
        "timestampUrl": "http://timestamp.digicert.com"
      }
    }
  }
}
```

### Release Process

1. **Update version** in:
   - `apps/desktop/package.json`
   - `apps/desktop/src-tauri/Cargo.toml`
   - `apps/desktop/src-tauri/tauri.conf.json`

2. **Update CHANGELOG.md**

3. **Build for all platforms**:

   ```bash
   # macOS
   pnpm build:tauri

   # Windows (on Windows machine or CI)
   pnpm build:tauri

   # Linux
   pnpm build:tauri
   ```

4. **Test installers** on each platform

5. **Create GitHub Release**:
   - Tag version (e.g., `v0.1.0`)
   - Upload installers
   - Include changelog

---

## Common Development Tasks

### Adding a New Dashboard Widget

1. **Create widget component**:

   ```typescript
   // apps/desktop/src/widgets/MyWidget.tsx

   import React from 'react';
   import { Card, Title, Text } from '@mantine/core';

   export function MyWidget() {
     return (
       <Card shadow="sm" padding="lg">
         <Title order={3}>My Widget</Title>
         <Text>Widget content</Text>
       </Card>
     );
   }
   ```

2. **Add to Dashboard**:

   ```typescript
   // apps/desktop/src/components/Dashboard.tsx

   import { MyWidget } from '../widgets/MyWidget';

   function Dashboard() {
     return (
       <div>
         {/* Other widgets */}
         <MyWidget />
       </div>
     );
   }
   ```

3. **Add tests**:

   ```typescript
   // apps/desktop/src/widgets/MyWidget.test.tsx

   import { render, screen } from '@testing-library/react';
   import { MyWidget } from './MyWidget';

   describe('MyWidget', () => {
     it('renders widget', () => {
       render(<MyWidget />);
       expect(screen.getByText('My Widget')).toBeInTheDocument();
     });
   });
   ```

### Adding a Database Migration

1. **Update `db.rs`**:

   ```rust
   // packages/core-rs/src/db.rs

   const CURRENT_VERSION: u32 = 6;  // Increment version

   pub fn migrate(conn: &Connection) -> Result<()> {
       let version = get_db_version(conn)?;

       if version < 6 {
           // Run migration 6
           conn.execute_batch("
               CREATE TABLE my_new_table (
                   id TEXT PRIMARY KEY,
                   data TEXT NOT NULL
               );
           ")?;
       }

       set_db_version(conn, CURRENT_VERSION)?;
       Ok(())
   }
   ```

2. **Test migration**:
   ```rust
   #[test]
   fn test_migration_6() {
       // Create DB at version 5
       // Run migration
       // Verify new table exists
   }
   ```

### Adding a TypeScript Type

1. **Add to types package**:

   ```typescript
   // packages/types/src/index.ts

   export interface MyType {
     id: string;
     name: string;
     createdAt: number;
   }
   ```

2. **Use in components**:

   ```typescript
   import type { MyType } from '@noteece/types';

   function Component({ data }: { data: MyType }) {
     // ...
   }
   ```

---

## Best Practices

### Code Style

**TypeScript**:

- Use functional components with hooks
- Prefer `const` over `let`
- Use arrow functions for callbacks
- Destructure props
- Use TypeScript strict mode

**Rust**:

- Follow Rust naming conventions
- Use `Result<T, E>` for error handling
- Document public APIs with `///` comments
- Use `clippy` lints
- Avoid `unwrap()` in library code (use `?` operator)

### Performance

**React**:

- Use `React.memo` for expensive components
- Memoize callbacks with `useCallback`
- Memoize expensive computations with `useMemo`
- Virtualize long lists (planned: `react-window`)
- Lazy load routes with `React.lazy`

**Rust**:

- Use prepared statements for repeated queries
- Batch database operations in transactions
- Profile with `cargo flamegraph`
- Use `&str` over `String` where possible
- Avoid allocations in hot paths

### Security

- Never log sensitive data (passwords, keys, decrypted content)
- Validate all user input
- Use parameterized queries (prevent SQL injection)
- Clear sensitive data from memory when done
- Use constant-time comparisons for secrets
- Follow principle of least privilege

### Accessibility

- Use semantic HTML elements
- Add ARIA labels to interactive elements
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Test with screen readers
- Use Mantine's accessible components

---

## Troubleshooting

### Known Issues & Workarounds

The project has several known issues that developers should be aware of. For a full, up-to-date list, please see the [ISSUES.md](ISSUES.md) file at the root of the project.

#### `core-rs`: FTS5 Build Failure

- **Symptom**: `cargo test` or `cargo build` in `packages/core-rs` fails with errors related to the `fts5` feature of `rusqlite` when `bundled-sqlcipher-vendored-openssl` is enabled.
- **Workaround**: To build the project or run non-FTS tests, you must temporarily disable the `fts5` feature in `packages/core-rs/Cargo.toml`:
  ```toml
  # in packages/core-rs/Cargo.toml
  [dependencies]
  rusqlite = { version = "0.37.0", features = ["bundled-sqlcipher-vendored-openssl"] } #, "fts5"]
  ```
- **Impact**: Full-text search will not be available when this feature is disabled.

#### `desktop`: Test Suite Failures

- **Symptom**: Running `pnpm test` in `apps/desktop` results in multiple test failures, particularly for the `UserManagement` and `Dashboard` components.
- **Workaround**: There is no current workaround. These tests must be fixed or skipped to achieve a passing test suite.
- **Impact**: Pull requests may fail CI checks until these are resolved.

#### `mobile`: Test Suite Global Failure

- **Symptom**: Running `pnpm test` in `apps/mobile` fails for all test suites with a Jest setup error: `Cannot find module 'expo-share-menu'`.
- **Workaround**: The Jest configuration needs to be fixed to properly mock native Expo modules.
- **Impact**: No mobile tests can be run until the Jest environment is repaired.

### Common Build & Runtime Issues

#### Build Fails with "SQLCipher not found"

**Solution**: Ensure SQLCipher is bundled in `Cargo.toml`:

```toml
[dependencies]
rusqlite = { version = "0.37", features = ["bundled-sqlcipher"] }
```

#### Tauri IPC Errors

**Problem**: `invoke` returns error "command not found"

**Solutions**:

1. Verify command name matches `#[tauri::command]` function name
2. Ensure command is registered in `invoke_handler![]`
3. Check parameter names match exactly (case-sensitive)
4. Rebuild Tauri backend: `pnpm build:tauri`

#### React Query Stale Data

**Problem**: UI shows old data after mutation

**Solution**: Invalidate queries after mutations:

```typescript
const mutation = useMutation({
  mutationFn: api.updateNote,
  onSuccess: () => {
    queryClient.invalidateQueries(['notes']);
  },
});
```

#### Rust Compilation Errors

**Problem**: `error[E0599]: no method named 'x' found`

**Solution**:

1. Check trait imports: `use std::io::Read;`
2. Update dependencies: `cargo update`
3. Clean and rebuild: `cargo clean && cargo build`

#### Performance Issues

**Problem**: Dashboard slow with many widgets

**Solutions**:

1. Reduce number of active widgets
2. Increase query `staleTime` in React Query
3. Use pagination for large lists
4. Profile with React DevTools Profiler
5. Check for unnecessary re-renders

---

## Contributing

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

**Quick Start**:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linters and tests
6. Submit a pull request

**Resources**:

- [Tauri Documentation](https://tauri.app/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Mantine UI Documentation](https://mantine.dev/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLCipher Documentation](https://www.zetetic.net/sqlcipher/)

---

**Questions?** Open a [GitHub Discussion](https://github.com/AmirrezaFarnamTaheri/Noteece/discussions) or check [USER_GUIDE.md](USER_GUIDE.md) for user-facing documentation.

**Happy Hacking! 🚀**
