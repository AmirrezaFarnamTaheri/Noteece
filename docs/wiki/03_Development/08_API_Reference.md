# API Reference

This document provides a reference for Noteece's internal APIs.

## Tauri Commands

### Notes

```typescript
// Create a new note
invoke('create_note_cmd', { spaceId, title, content, tags })

// Get note by ID
invoke('get_note_cmd', { noteId })

// Update note
invoke('update_note_cmd', { noteId, title, content, tags })

// Delete note
invoke('delete_note_cmd', { noteId })

// Search notes
invoke('search_notes_cmd', { query, spaceId, limit })

// Get note versions
invoke('get_note_versions_cmd', { noteId })
```

### Tasks

```typescript
// Create task
invoke('create_task_cmd', { spaceId, title, description, priority, dueDate })

// Update task
invoke('update_task_cmd', { taskId, ...updates })

// Complete task
invoke('complete_task_cmd', { taskId })

// Get tasks for space
invoke('get_tasks_cmd', { spaceId, filter })

// Get due tasks
invoke('get_due_tasks_cmd', { spaceId })
```

### Projects

```typescript
// Create project
invoke('create_project_cmd', { spaceId, name, description })

// Update project
invoke('update_project_cmd', { projectId, ...updates })

// Get project
invoke('get_project_cmd', { projectId })

// Get projects for space
invoke('get_projects_cmd', { spaceId })

// Add task to project
invoke('add_task_to_project_cmd', { projectId, taskId })
```

### Sync

```typescript
// Discover devices
invoke('discover_devices_cmd')

// Register device
invoke('register_device_cmd', { deviceId, name, publicKey })

// Initiate pairing
invoke('initiate_pairing_cmd', { deviceId })

// Start sync
invoke('start_p2p_sync_cmd', { deviceId })

// Get sync progress
invoke('get_sync_progress_cmd', { deviceId })

// Get sync conflicts
invoke('get_sync_conflicts_cmd')

// Resolve conflict
invoke('resolve_sync_conflict_cmd', { conflict, resolution })
```

### AI / LLM

```typescript
// Check Ollama connection
invoke('check_ollama_connection_cmd', { url })

// List models
invoke('list_ollama_models_cmd')

// Chat with Ollama
invoke('chat_with_ollama_cmd', { model, messages, prompt })

// Test cloud provider
invoke('test_cloud_provider_cmd', { provider, apiKey })

// Get AI config
invoke('get_ai_config_cmd')

// Save AI config
invoke('save_ai_config_cmd', { config })
```

### Health

```typescript
// Create health metric
invoke('create_health_metric_cmd', { spaceId, metricType, value, unit, notes, recordedAt })

// Get health metrics
invoke('get_health_metrics_cmd', { spaceId, metricType, startDate, endDate })

// Create goal
invoke('create_goal_cmd', { spaceId, title, target, unit, category })

// Update goal progress
invoke('update_goal_progress_cmd', { goalId, current })

// Complete goal
invoke('complete_goal_cmd', { goalId })
```

### OCR

```typescript
// Queue OCR job
invoke('queue_ocr_cmd', { blobId })

// Get OCR status
invoke('get_ocr_status_cmd', { blobId })

// Search OCR text
invoke('search_ocr_text_cmd', { query })

// Process OCR job
invoke('process_ocr_job_cmd', { blobId, imagePath })
```

### Spaced Repetition

```typescript
// Get due cards
invoke('get_due_cards_cmd')

// Record review
invoke('record_review_cmd', { cardId, quality })

// Create card
invoke('create_card_cmd', { deckId, front, back })

// Get decks
invoke('get_decks_cmd', { spaceId })
```

## React Hooks

### useNotes

```typescript
import { useNotes } from '@/hooks/useNotes';

const { notes, isLoading, error, create, update, delete } = useNotes(spaceId);
```

### useTasks

```typescript
import { useTasks } from '@/hooks/useTasks';

const { tasks, isLoading, createTask, completeTask, deleteTask } = useTasks(spaceId);
```

### useSync

```typescript
import { useSync } from '@/hooks/useSync';

const { devices, isDiscovering, discover, pair, sync } = useSync();
```

### useTheme

```typescript
import { useThemeStore } from '@/store/themeStore';

const { mode, actualTheme, setMode, toggleTheme } = useThemeStore();
```

### useI18n

```typescript
import { useI18n } from '@/i18n';

const { locale, setLocale, t } = useI18n();
```

### useControlPanel

```typescript
import { useControlPanelStore } from '@/store/controlPanelStore';

const { widgets, features, toggleWidget, toggleFeature } = useControlPanelStore();
```

## Rust Core API

### Database

```rust
// Initialize database
db::init_database(path: &Path, password: &str) -> Result<Connection>

// Run migrations
db::run_migrations(conn: &Connection) -> Result<()>

// Get or create user ID
db::get_or_create_user_id(conn: &Connection) -> Result<String>
```

### Notes

```rust
// Create note
note::create_note(conn: &Connection, space_id: &Ulid, title: &str, content: &str) -> Result<Note>

// Get note
note::get_note(conn: &Connection, note_id: &Ulid) -> Result<Option<Note>>

// Update note
note::update_note(conn: &Connection, note_id: &Ulid, ...) -> Result<()>

// Delete note
note::delete_note(conn: &Connection, note_id: &Ulid) -> Result<()>
```

### Encryption

```rust
// Encrypt data
crypto::encrypt_aes256(data: &[u8], key: &[u8]) -> Result<Vec<u8>>

// Decrypt data
crypto::decrypt_aes256(ciphertext: &[u8], key: &[u8]) -> Result<Vec<u8>>

// Derive key from password
crypto::derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32]>
```

### Sync

```rust
// Create sync agent
SyncAgent::new(device_id: String, device_name: String, port: u16) -> Self

// Start sync
sync_agent.start_sync(conn: &Connection, target_device_id: &str) -> Result<()>

// Get conflicts
sync_agent.get_unresolved_conflicts(conn: &Connection) -> Result<Vec<SyncConflict>>

// Resolve conflict
sync_agent.resolve_conflict(conn: &Connection, conflict: &SyncConflict, resolution: ConflictResolution) -> Result<()>
```

### LLM

```rust
// Create client
LLMClient::new(config: LLMConfig, conn: &Connection) -> Result<Self>

// Generate completion
client.complete(request: LLMRequest) -> Result<LLMResponse>

// Stream completion
client.complete_stream(request: LLMRequest) -> Result<LLMStream>

// List models
client.list_models(provider: &ProviderType) -> Result<Vec<String>>
```

---

*See also: [Developer Guide](../development/DEVELOPER_GUIDE.md)*

