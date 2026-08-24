#!/usr/bin/env python3
"""Enrich system_topology.json for the Noteece monorepo.

Loads the existing topology, applies an authoritative enrichment pass
(verified symbols + line numbers, new nodes/edges/flows, data models,
coverage metadata), and writes the result back with stable 2-space indent.
"""
import json
import re
from datetime import datetime, timezone

SRC = "system_topology.json"

with open(SRC, encoding="utf-8") as f:
    data = json.load(f)

nodes = {n["id"]: n for n in data["nodes"]}
edges = data["edges"]
flows = data["flows"]
meta = data.setdefault("metadata", {})

# ----------------------------------------------------------------------------
# 1. Metadata enrichment
# ----------------------------------------------------------------------------
meta.update({
    "repository_url": "https://github.com/noteece/noteece",
    "analyzed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "analysis_tool": "PenguinHarness architecture analysis (codegraph + source verification)",
    "language_stats": {
        "rust": "packages/core-rs, packages/relay-server, apps/desktop/src-tauri",
        "typescript": "apps/desktop/src, apps/mobile/src, packages/automation-dsl",
        "kotlin": "apps/mobile/android/app/src/main/java, apps/mobile/android/app/src/sideload",
        "cpp": "apps/mobile/android/app/src/main/cpp",
    },
    "top_level_dirs": [
        "apps/desktop", "apps/mobile", "packages/core-rs", "packages/relay-server",
        "packages/types", "packages/ui", "packages/automation-dsl", "packages/modes",
        "packages/locale", "config", "docs", "scripts", "verification",
    ],
    "coverage_summary": {
        "nodes": None, "edges": None, "flows": None, "entry_points": len(meta.get("entry_points", []))
    },
})

# ----------------------------------------------------------------------------
# 2. Helper: replace a node citation list (verified symbols) and description
# ----------------------------------------------------------------------------
def set_citations(node_id, citations):
    nodes[node_id]["file_citations"] = citations

def set_desc(node_id, desc):
    nodes[node_id]["description"] = desc

# ----------------------------------------------------------------------------
# 3. Fill in previously-empty symbol lists with verified symbols
# ----------------------------------------------------------------------------
set_citations("core-notes", [
    {"file": "packages/core-rs/src/note.rs", "symbols": ["create_note", "get_note", "update_note_content", "trash_note", "restore_note", "get_all_notes_in_space", "get_or_create_daily_note", "get_recent_notes"]},
    {"file": "packages/core-rs/src/backlink.rs", "symbols": ["find_backlinks", "update_links"]},
    {"file": "packages/core-rs/src/tag.rs", "symbols": ["create_tag", "get_all_tags_in_space", "get_tags_with_counts"]},
    {"file": "packages/core-rs/src/versioning.rs", "symbols": ["create_snapshot", "get_snapshots", "restore_snapshot"]},
    {"file": "apps/desktop/src-tauri/src/commands/note.rs", "symbols": ["create_note_cmd", "get_note_cmd", "update_note_content_cmd", "trash_note_cmd", "get_all_notes_in_space_cmd", "get_or_create_daily_note_cmd", "search_notes_cmd"]},
    {"file": "apps/desktop/src-tauri/src/commands/tag.rs", "symbols": ["create_tag_cmd", "get_all_tags_in_space_cmd", "get_tags_with_counts_cmd"]},
])
set_desc("core-notes", "Markdown note CRUD, daily notes, backlinks (find_backlinks/update_links), tags, Lexical editor state handling, trash/restore, per-space queries and version snapshots (create_snapshot/restore_snapshot). Powers NoteEditor, Journal and the backlink graph. All writes go through core-editor's markdown block parser when the rich-text engine is used.")

set_citations("core-tasks", [
    {"file": "packages/core-rs/src/task/db.rs", "symbols": ["create_task", "get_task", "update_task", "delete_task", "get_tasks_by_project", "get_upcoming_tasks", "get_all_tasks_in_space"]},
    {"file": "packages/core-rs/src/task/query.rs", "symbols": ["TaskQuery", "new", "priority", "completed", "search", "due_before", "build"]},
    {"file": "packages/core-rs/src/time_tracking.rs", "symbols": ["start_time_entry", "stop_time_entry", "stop_all_running_entries", "get_running_entries", "get_task_time_entries", "get_time_entries_since"]},
    {"file": "apps/desktop/src-tauri/src/commands/task.rs", "symbols": ["create_task_cmd", "update_task_cmd", "delete_task_cmd", "get_tasks_by_project_cmd"]},
    {"file": "apps/desktop/src-tauri/src/commands/time_tracking.rs", "symbols": ["start_time_entry_cmd", "stop_time_entry_cmd", "get_task_time_stats_cmd"]},
])
set_desc("core-tasks", "Task lifecycle (inbox/next/in_progress/waiting/done/cancelled), priorities, recurrence (recur_rule + exdate), typed TaskQuery builder, projections, filters, dependencies, and time entries with running/stopped states (start_time_entry/stop_time_entry) and per-task/per-project stats.")

set_citations("core-projects", [
    {"file": "packages/core-rs/src/project.rs", "symbols": ["ProjectService"]},
    {"file": "packages/core-rs/src/project/db/project.rs", "symbols": ["create_project", "update_project", "get_project", "get_projects_in_space", "delete_project", "generate_project_brief"]},
    {"file": "packages/core-rs/src/project/db/milestone.rs", "symbols": []},
    {"file": "packages/core-rs/src/project/db/risk.rs", "symbols": []},
    {"file": "packages/core-rs/src/project/db/update.rs", "symbols": []},
    {"file": "packages/core-rs/src/project/db/dependency.rs", "symbols": []},
    {"file": "apps/desktop/src-tauri/src/commands/project.rs", "symbols": ["get_project_cmd", "get_project_milestones_cmd", "get_project_risks_cmd", "create_project_risk_cmd", "update_project_cmd", "delete_project_cmd"]},
])

set_citations("core-search", [
    {"file": "packages/core-rs/src/search/mod.rs", "symbols": ["search_notes"]},
    {"file": "packages/core-rs/src/search/advanced.rs", "symbols": ["search_all"]},
    {"file": "packages/core-rs/src/search/saved.rs", "symbols": ["create_saved_search", "get_saved_search", "get_saved_searches", "update_saved_search", "delete_saved_search"]},
    {"file": "apps/desktop/src-tauri/src/commands/search.rs", "symbols": ["create_saved_search_cmd", "execute_saved_search_cmd"]},
])

set_citations("core-social", [
    {"file": "packages/core-rs/src/social/account.rs", "symbols": ["add_social_account", "get_social_accounts", "get_social_account", "update_social_account", "delete_social_account", "get_decrypted_credentials"]},
    {"file": "packages/core-rs/src/social/timeline.rs", "symbols": ["get_unified_timeline", "get_category_timeline", "get_platform_timeline", "get_timeline_stats"]},
    {"file": "packages/core-rs/src/social/stream_processor.rs", "symbols": ["StreamProcessor", "new", "ingest", "analyze_buffer", "get_latest_candidate", "set_platform_hint"]},
    {"file": "packages/core-rs/src/social/processing/patterns.rs", "symbols": []},
    {"file": "packages/core-rs/src/social/processing/extractors/mod.rs", "symbols": []},
    {"file": "packages/core-rs/src/social/webview.rs", "symbols": ["create_webview_session", "save_session_cookies", "get_platform_url"]},
    {"file": "packages/core-rs/src/social/sync.rs", "symbols": []},
    {"file": "apps/desktop/src-tauri/src/commands/social.rs", "symbols": ["add_social_account_cmd", "store_social_posts_cmd", "get_unified_timeline_cmd", "auto_categorize_posts_cmd", "create_webview_session_cmd", "save_session_cookies_cmd"]},
    {"file": "config/social_selectors.json", "symbols": []},
])

set_citations("core-personal-modes", [
    {"file": "packages/core-rs/src/personal_modes.rs", "symbols": ["init_personal_modes_tables", "enable_health_mode", "enable_finance_mode", "enable_travel_mode", "create_health_metric", "get_health_metrics_since", "create_transaction", "get_transactions_since", "create_recipe", "get_recipes", "create_trip", "get_trips"]},
    {"file": "packages/core-rs/src/health.rs", "symbols": ["create_health_metric", "get_health_metrics"]},
    {"file": "packages/core-rs/src/goals.rs", "symbols": []},
    {"file": "packages/core-rs/src/habits.rs", "symbols": []},
    {"file": "packages/core-rs/src/music.rs", "symbols": []},
    {"file": "packages/core-rs/src/srs.rs", "symbols": []},
    {"file": "packages/core-rs/src/weekly_review.rs", "symbols": ["generate_weekly_review"]},
    {"file": "apps/desktop/src-tauri/src/commands/personal_modes.rs", "symbols": ["create_health_metric_cmd", "create_transaction_cmd", "create_recipe_cmd", "create_trip_cmd"]},
    {"file": "apps/desktop/src-tauri/src/commands/srs.rs", "symbols": ["get_due_cards_cmd", "review_card_cmd"]},
])
set_desc("core-personal-modes", "Personal modes: health metrics, finance transactions, travel trips, recipes, habits, goals, music library, spaced-repetition (SRS) cards and weekly review. Personal-mode tables initialized in init_personal_modes_tables() outside the versioned migration system. Mode toggles (enable_health_mode etc.) plus per-mode feature tables.")

set_citations("core-analytics", [
    {"file": "packages/core-rs/src/dashboard.rs", "symbols": ["get_dashboard_stats"]},
    {"file": "packages/core-rs/src/analytics.rs", "symbols": ["get_analytics_data", "calculate_habit_correlation"]},
    {"file": "packages/core-rs/src/foresight.rs", "symbols": ["generate_insights", "get_active_insights", "dismiss_insight", "record_feedback"]},
    {"file": "packages/core-rs/src/temporal_graph.rs", "symbols": []},
    {"file": "packages/core-rs/src/correlation/mod.rs", "symbols": []},
    {"file": "packages/core-rs/src/graph.rs", "symbols": ["get_vault_graph", "GraphNode", "GraphEdge", "GraphData"]},
    {"file": "apps/desktop/src-tauri/src/commands/analytics.rs", "symbols": ["get_analytics_data_cmd", "generate_insights_cmd", "record_feedback_cmd"]},
    {"file": "apps/desktop/src-tauri/src/commands/temporal_graph.rs", "symbols": ["build_current_graph_cmd", "get_graph_evolution_cmd"]},
])
set_desc("core-analytics", "Dashboard stats (get_dashboard_stats), analytics queries and habit correlation, Foresight insight generation with feedback loop, temporal knowledge-graph evolution, correlation detectors and the vault backlink graph (get_vault_graph).")

set_citations("core-import", [
    {"file": "packages/core-rs/src/import.rs", "symbols": ["import_from_obsidian", "import_from_notion", "export_to_json", "export_to_zip", "export_to_markdown"]},
    {"file": "apps/desktop/src-tauri/src/commands/import.rs", "symbols": ["import_from_obsidian_cmd", "import_from_notion_cmd"]},
])

set_citations("core-caldav", [
    {"file": "packages/core-rs/src/caldav/client.rs", "symbols": ["add_caldav_account", "get_caldav_accounts", "update_caldav_account", "delete_caldav_account"]},
    {"file": "packages/core-rs/src/caldav/sync.rs", "symbols": ["sync_caldav_account", "fetch_calendar_events", "map_caldav_event", "record_sync_history", "create_sync_conflict"]},
    {"file": "packages/core-rs/src/caldav/parser.rs", "symbols": ["parse_ical"]},
    {"file": "packages/core-rs/src/caldav/models.rs", "symbols": []},
    {"file": "apps/desktop/src-tauri/src/commands/caldav.rs", "symbols": ["add_caldav_account_cmd", "sync_caldav_account_cmd", "get_caldav_sync_history_cmd", "get_caldav_conflicts_cmd", "resolve_caldav_conflict_cmd"]},
])

set_citations("core-llm", [
    {"file": "packages/core-rs/src/llm/mod.rs", "symbols": ["LLMProvider", "LlmConfig", "LlmError", "redact_pii"]},
    {"file": "packages/core-rs/src/llm/config.rs", "symbols": ["LLMConfig", "privacy_first", "cloud_first", "hybrid"]},
    {"file": "packages/core-rs/src/llm/batch.rs", "symbols": ["BatchProcessor", "BatchConfig", "BatchResult"]},
    {"file": "packages/core-rs/src/llm/retry.rs", "symbols": []},
    {"file": "packages/core-rs/src/llm/priority.rs", "symbols": []},
    {"file": "packages/core-rs/src/llm/streaming.rs", "symbols": []},
    {"file": "packages/core-rs/src/llm/cost.rs", "symbols": ["CostTracker", "CostRecord", "BudgetConfig", "get_model_pricing"]},
    {"file": "packages/core-rs/src/llm/pii.rs", "symbols": ["redact_pii"]},
    {"file": "apps/desktop/src-tauri/src/commands/ai.rs", "symbols": ["check_ollama_connection_cmd", "list_ollama_models_cmd", "chat_with_ollama_cmd", "test_cloud_provider_cmd", "get_ai_config_cmd", "save_ai_config_cmd", "ingest_social_capture_cmd"]},
])

set_citations("core-ocr", [
    {"file": "packages/core-rs/src/ocr.rs", "symbols": ["init_ocr_tables", "process_image_ocr", "queue_ocr", "get_ocr_status", "process_ocr_job", "search_ocr_text"]},
    {"file": "apps/desktop/src-tauri/src/commands/ocr.rs", "symbols": ["queue_ocr_cmd", "get_ocr_status_cmd", "search_ocr_text_cmd", "process_ocr_job_cmd"]},
])

set_citations("core-backup", [
    {"file": "packages/core-rs/src/backup.rs", "symbols": ["create_backup", "create_encrypted_backup", "secure_delete"]},
    {"file": "packages/core-rs/src/db/vault_backup.rs", "symbols": []},
    {"file": "apps/desktop/src-tauri/src/commands/backup.rs", "symbols": ["create_backup_cmd", "restore_backup_cmd", "list_backups_cmd", "delete_backup_cmd", "get_backup_details_cmd"]},
])

set_citations("core-rag", [
    {"file": "packages/core-rs/src/ai/mod.rs", "symbols": []},
    {"file": "packages/core-rs/src/ai/rag.rs", "symbols": ["RagPipeline", "new", "with_llm_provider", "initialize_vector_store", "chunk_document", "search", "get_stats", "RagQuery", "RagResponse", "RagConfig"]},
])

set_citations("core-ffi", [
    {"file": "packages/core-rs/src/mobile_ffi.rs", "symbols": ["rust_init", "rust_init_agent", "rust_discover_devices", "rust_register_device", "rust_initiate_key_exchange", "rust_complete_key_exchange", "rust_start_sync", "rust_cancel_sync", "rust_get_sync_progress", "rust_get_conflicts", "rust_resolve_conflict", "rust_get_sync_history", "rust_unlock_vault"]},
    {"file": "packages/core-rs/src/jni.rs", "symbols": ["Java_com_noteece_RustBridge_ingest", "Java_com_noteece_RustBridge_anchorLatest", "Java_com_noteece_RustBridge_reset"]},
])

set_citations("core-collaboration", [
    {"file": "packages/core-rs/src/collaboration.rs", "symbols": ["init_rbac_tables", "get_space_users", "get_user_permissions", "check_permission", "invite_user", "update_user_role", "grant_permission", "revoke_permission"]},
    {"file": "apps/desktop/src-tauri/src/commands/collaboration.rs", "symbols": ["init_rbac_tables_cmd", "get_space_users_cmd", "check_permission_cmd", "invite_user_cmd", "grant_permission_cmd", "revoke_permission_cmd"]},
])

set_citations("mobile-sync-bridge", [
    {"file": "apps/mobile/src/lib/sync/sync-bridge.ts", "symbols": ["UnifiedSyncBridge", "initialize", "discoverDevices", "initiateKeyExchange", "generateHandshake", "processSyncPacket", "startSync", "getSyncProgress", "getSyncBridge", "resetSyncBridge"]},
    {"file": "apps/mobile/src/lib/jsi/sync-bridge.ts", "symbols": ["init", "discoverDevices", "registerDevice", "initiateKeyExchange", "completeKeyExchange", "startSync", "cancelSync", "getSyncProgress", "getConflicts", "resolveConflict", "getSyncHistory"]},
])

# ----------------------------------------------------------------------------
# 4. New nodes (verified against source)
# ----------------------------------------------------------------------------
new_nodes = [
    {
        "id": "core-audit",
        "name": "Audit Log Service",
        "type": "service",
        "layer": "application",
        "region": "core",
        "description": "Append-only audit trail: log_event writes AuditLog rows (user_id, action, entity_type/id, detail JSON, timestamp), get_audit_logs supports pagination, cleanup_old_entries enforces retention. Setup via setup_audit_db.",
        "file_citations": [
            {"file": "packages/core-rs/src/audit.rs", "symbols": ["log_event", "get_audit_logs", "cleanup_old_entries", "setup_audit_db", "AuditLog"]},
            {"file": "apps/desktop/src-tauri/src/commands/auth.rs", "symbols": ["create_user_cmd", "authenticate_user_cmd"]},
            {"file": "apps/desktop/src-tauri/src/commands/vault.rs", "symbols": ["unlock_vault_cmd"]},
        ],
        "runtime_config": {"ports": [], "env_dependencies": []},
    },
    {
        "id": "core-editor",
        "name": "Editor / Markdown Block Engine",
        "type": "service",
        "layer": "domain",
        "region": "core",
        "description": "Lexical-style block model: parse_markdown converts markdown to Block[] (paragraph/heading/quote/list/code), serialize_markdown renders blocks back, generate_block_id creates ULID-style block ids. Powers NoteEditor rich text and note content storage.",
        "file_citations": [
            {"file": "packages/core-rs/src/editor.rs", "symbols": ["Block", "generate_block_id", "parse_markdown", "serialize_markdown"]},
            {"file": "packages/core-rs/src/note.rs", "symbols": ["update_note_content"]},
            {"file": "apps/desktop/src/components/NoteEditor.tsx", "symbols": ["NoteEditor"]},
        ],
        "runtime_config": {"ports": [], "env_dependencies": []},
    },
    {
        "id": "core-space",
        "name": "Space Service (Vault Spaces)",
        "type": "service",
        "layer": "application",
        "region": "core",
        "description": "Vault space management: create_space generates a ULID space row, get_all_spaces lists spaces. The desktop SpaceInitializer bootstraps the default space on first unlock.",
        "file_citations": [
            {"file": "packages/core-rs/src/space.rs", "symbols": ["create_space", "get_all_spaces", "Space"]},
            {"file": "apps/desktop/src-tauri/src/commands/space.rs", "symbols": ["create_space_cmd", "get_all_spaces_cmd"]},
            {"file": "apps/desktop/src/App.tsx", "symbols": ["SpaceInitializer"]},
        ],
        "runtime_config": {"ports": [], "env_dependencies": []},
    },
    {
        "id": "core-calendar-local",
        "name": "Local Calendar (ICS Import/Export)",
        "type": "service",
        "layer": "application",
        "region": "core",
        "description": "Offline ICS import/export for a space: import_ics parses an .ics file into calendar_event rows, export_ics writes a space's events to an .ics file. Distinct from CalDAV client sync which is network-based.",
        "file_citations": [
            {"file": "packages/core-rs/src/calendar.rs", "symbols": ["import_ics", "export_ics"]},
            {"file": "apps/desktop/src-tauri/src/commands/caldav.rs", "symbols": ["get_caldav_accounts_cmd"]},
        ],
        "runtime_config": {"ports": [], "env_dependencies": []},
    },
    {
        "id": "core-form",
        "name": "Form Template Studio",
        "type": "service",
        "layer": "application",
        "region": "core",
        "description": "Structured FormTemplate/FormField models (FieldType text/number/date/select etc.) with CRUD scoped per space. Powers custom capture forms.",
        "file_citations": [
            {"file": "packages/core-rs/src/form.rs", "symbols": ["create_form_template", "get_form_template", "get_form_templates_for_space", "update_form_template", "delete_form_template", "FormTemplate", "FormField", "FormFieldType"]},
            {"file": "apps/desktop/src-tauri/src/commands/form.rs", "symbols": ["create_form_template_cmd", "get_form_templates_for_space_cmd", "delete_form_template_cmd"]},
        ],
        "runtime_config": {"ports": [], "env_dependencies": []},
    },
]
for n in new_nodes:
    if n["id"] not in nodes:
        nodes[n["id"]] = n

# ----------------------------------------------------------------------------
# 5. New edges
# ----------------------------------------------------------------------------
new_edges = [
    {"id": "e-ipc-to-audit", "source": "desktop-ipc-gateway", "target": "core-audit", "type": "sync_request", "protocol": "Internal", "payload_type": "AuditLogEntry", "description": "Sensitive commands write audit events (log_event) and the UI reads them (get_audit_logs).", "file_citations": ["apps/desktop/src-tauri/src/commands/audit.rs:1", "packages/core-rs/src/audit.rs:21", "packages/core-rs/src/audit.rs:55"]},
    {"id": "e-audit-to-db", "source": "core-audit", "target": "sqlite-vault", "type": "db_query", "protocol": "SQL", "payload_type": "audit_log rows", "description": "Append-only audit_log writes inside the encrypted vault; retention cleanup deletes rows older than the policy.", "file_citations": ["packages/core-rs/src/audit.rs:21", "packages/core-rs/src/audit.rs:86"]},
    {"id": "e-ipc-to-space", "source": "desktop-ipc-gateway", "target": "core-space", "type": "sync_request", "protocol": "Internal", "payload_type": "Space", "description": "create_space_cmd / get_all_spaces_cmd; SpaceInitializer bootstraps the default space after unlock.", "file_citations": ["apps/desktop/src-tauri/src/commands/space.rs:1", "packages/core-rs/src/space.rs:15"]},
    {"id": "e-space-to-db", "source": "core-space", "target": "sqlite-vault", "type": "db_query", "protocol": "SQL", "payload_type": "space rows", "description": "Space rows (id, name, created_at) created/read in the vault DB.", "file_citations": ["packages/core-rs/src/space.rs:15", "packages/core-rs/src/space.rs:28"]},
    {"id": "e-ipc-to-form", "source": "desktop-ipc-gateway", "target": "core-form", "type": "sync_request", "protocol": "Internal", "payload_type": "FormTemplate | FormField", "description": "Form template CRUD commands scoped per space.", "file_citations": ["apps/desktop/src-tauri/src/commands/form.rs:1", "packages/core-rs/src/form.rs:35"]},
    {"id": "e-form-to-db", "source": "core-form", "target": "sqlite-vault", "type": "db_query", "protocol": "SQL", "payload_type": "form_template / form_field rows", "description": "Templates and fields stored in vault tables.", "file_citations": ["packages/core-rs/src/form.rs:35", "packages/core-rs/src/form.rs:74"]},
    {"id": "e-ipc-to-calendar-local", "source": "desktop-ipc-gateway", "target": "core-calendar-local", "type": "sync_request", "protocol": "Internal", "payload_type": "ics file path", "description": "import_ics_cmd / export_ics_cmd route file paths into the offline calendar importer/exporter.", "file_citations": ["apps/desktop/src-tauri/src/commands/calendar.rs:1", "packages/core-rs/src/calendar.rs:9"]},
    {"id": "e-calendar-local-to-db", "source": "core-calendar-local", "target": "sqlite-vault", "type": "db_query", "protocol": "SQL", "payload_type": "calendar_event rows", "description": "import_ics persists parsed events; export_ics reads them back into an .ics text file.", "file_citations": ["packages/core-rs/src/calendar.rs:9", "packages/core-rs/src/calendar.rs:49"]},
    {"id": "e-notes-to-editor", "source": "core-notes", "target": "core-editor", "type": "dependency", "protocol": "Internal", "payload_type": "markdown <-> Block[]", "description": "Note save/load path runs parse_markdown/serialize_markdown for block-structured rich text.", "file_citations": ["packages/core-rs/src/editor.rs:16", "packages/core-rs/src/editor.rs:28"]},
    {"id": "e-editor-to-db", "source": "core-editor", "target": "sqlite-vault", "type": "db_query", "protocol": "SQL", "payload_type": "note content (markdown serialized from blocks)", "description": "Block[] serialized to markdown and persisted via note content updates.", "file_citations": ["packages/core-rs/src/editor.rs:28", "packages/core-rs/src/note.rs:152"]},
    {"id": "e-social-to-audit", "source": "core-social", "target": "core-audit", "type": "async_event", "protocol": "Internal", "payload_type": "capture audit event", "description": "Captured/anchor events and credential store operations are audit-logged.", "file_citations": ["packages/core-rs/src/audit.rs:21", "packages/core-rs/src/social/account.rs:310"]},
]
existing_edge_ids = {e["id"] for e in edges}
for e in new_edges:
    if e["id"] not in existing_edge_ids:
        edges.append(e)

# ----------------------------------------------------------------------------
# 6. New flows
# ----------------------------------------------------------------------------
new_flows = [
    {
        "id": "flow-backup-restore",
        "name": "Encrypted Backup & Restore Cycle",
        "description": "User triggers a backup from Settings: command layer invokes core backup, optional AES encryption, archive written to the filesystem, restore path reverses the process with temp-file cleanup.",
        "steps": [
            {"step_number": 1, "from": "desktop-ui", "to": "desktop-ipc-gateway", "action": "Settings > Backup calls create_backup_cmd or create_encrypted_backup_cmd", "payload": "{vault_path, backup_path, password?}", "file_citation": "apps/desktop/src-tauri/src/commands/backup.rs:1"},
            {"step_number": 2, "from": "desktop-ipc-gateway", "to": "core-backup", "action": "create_backup copies vault.sqlite3 + blobs to a versioned archive; encrypted variant derives a key and seals the archive", "payload": "BackupArchive {dir, manifest, encrypted: bool}", "file_citation": "packages/core-rs/src/backup.rs:22"},
            {"step_number": 3, "from": "core-backup", "to": "local-filesystem", "action": "Archive files written under user-chosen backup path; secure_delete wipes temporary files after encryption", "payload": "archive files (.zip / .enc)", "file_citation": "packages/core-rs/src/backup.rs:73"},
            {"step_number": 4, "from": "desktop-ipc-gateway", "to": "core-backup", "action": "restore_backup_cmd validates archive and writes vault.sqlite3 + blobs back into the vault directory", "payload": "restored vault directory", "file_citation": "packages/core-rs/src/backup.rs:136"},
        ],
    },
    {
        "id": "flow-audit-trail",
        "name": "Audit Trail & Compliance Recording",
        "description": "Sensitive actions (auth, vault, backup, social credentials) emit structured audit events persisted in the encrypted vault and surface in the AuditLogs screen.",
        "steps": [
            {"step_number": 1, "from": "desktop-ipc-gateway", "to": "core-audit", "action": "Command handlers call log_event on sensitive operations (create user, unlock, backup, credential access)", "payload": "AuditLogEntry {user_id, action, entity_type, entity_id, detail}", "file_citation": "packages/core-rs/src/audit.rs:21"},
            {"step_number": 2, "from": "core-audit", "to": "sqlite-vault", "action": "Rows appended to audit_log in the encrypted vault (never plaintext)", "payload": "INSERT INTO audit_log (...)", "file_citation": "packages/core-rs/src/audit.rs:21"},
            {"step_number": 3, "from": "desktop-ui", "to": "desktop-ipc-gateway", "action": "AuditLogs screen requests get_audit_logs(limit, offset)", "payload": "{limit, offset}", "file_citation": "packages/core-rs/src/audit.rs:55"},
            {"step_number": 4, "from": "core-audit", "to": "sqlite-vault", "action": "cleanup_old_entries prunes past retention window on a schedule", "payload": "DELETE FROM audit_log WHERE created_at < now - retention_days", "file_citation": "packages/core-rs/src/audit.rs:86"},
        ],
    },
    {
        "id": "flow-space-bootstrap",
        "name": "Space Bootstrap & Note Container Setup",
        "description": "On first unlock, SpaceInitializer ensures a default space exists; all entity CRUD (notes/tasks/projects/forms/modes) is scoped by space_id.",
        "steps": [
            {"step_number": 1, "from": "desktop-ui", "to": "desktop-ipc-gateway", "action": "SpaceInitializer calls get_all_spaces_cmd and create_space_cmd when no space exists", "payload": "[] | Space[]", "file_citation": "apps/desktop/src/App.tsx:1"},
            {"step_number": 2, "from": "desktop-ipc-gateway", "to": "core-space", "action": "create_space_cmd -> create_space(conn, name) generates a ULID", "payload": "Space {id: ULID, name}", "file_citation": "packages/core-rs/src/space.rs:15"},
            {"step_number": 3, "from": "core-space", "to": "sqlite-vault", "action": "space row inserted into encrypted vault", "payload": "INSERT INTO space (id, name)", "file_citation": "packages/core-rs/src/space.rs:15"},
            {"step_number": 4, "from": "core-space", "to": "desktop-ipc-gateway", "action": "App context holds active space id; every note/task/project command passes space_id", "payload": "space_id: ULID", "file_citation": "apps/desktop/src/hooks/useQueries.ts:1"},
        ],
    },
    {
        "id": "flow-form-templates",
        "name": "Form Template Lifecycle",
        "description": "Custom capture forms are defined as templates with typed fields, stored per space, and used by the capture UI.",
        "steps": [
            {"step_number": 1, "from": "desktop-ui", "to": "desktop-ipc-gateway", "action": "FormStudio calls create_form_template_cmd with name + fields", "payload": "FormTemplate {name, fields: FormField[]}", "file_citation": "apps/desktop/src-tauri/src/commands/form.rs:1"},
            {"step_number": 2, "from": "desktop-ipc-gateway", "to": "core-form", "action": "create_form_template validates field types and persists", "payload": "FormTemplate | DbError", "file_citation": "packages/core-rs/src/form.rs:35"},
            {"step_number": 3, "from": "core-form", "to": "sqlite-vault", "action": "Template + fields rows written per space", "payload": "form_template / form_field rows", "file_citation": "packages/core-rs/src/form.rs:35"},
            {"step_number": 4, "from": "desktop-ui", "to": "desktop-ipc-gateway", "action": "Capture UI lists templates via get_form_templates_for_space and deletes via delete_form_template", "payload": "FormTemplate[]", "file_citation": "packages/core-rs/src/form.rs:74"},
        ],
    },
]
existing_flow_ids = {f["id"] for f in flows}
for f in new_flows:
    if f["id"] not in existing_flow_ids:
        flows.append(f)

# ----------------------------------------------------------------------------
# 7. data_models & protocol section (agent navigation aid)
# ----------------------------------------------------------------------------
data["data_models"] = [
    {
        "name": "SyncDelta",
        "description": "Encrypted unit of change exchanged between peers (P2P WS, mobile TS client, relay, mobile_sync protocol).",
        "fields": {
            "entity_type": "string (note|task|project|health_metric|track|playlist|calendar_event)",
            "entity_id": "string (ULID)",
            "operation": "upsert|delete",
            "encrypted_payload": "base64 (ChaCha20-Poly1305)",
            "vector_clock": "Record<device_id, counter>",
            "signature": "HMAC-SHA256 hex",
            "updated_at": "i64 timestamp",
        },
        "file_citations": ["packages/core-rs/src/sync/models.rs", "packages/core-rs/src/sync/mobile_sync/protocol/types.rs", "apps/mobile/src/lib/sync/sync-client.ts:90"],
    },
    {
        "name": "RelayEnvelope",
        "description": "Blind-relay E2E envelope for WAN sync; relay cannot decrypt payload.",
        "fields": {
            "from_device": "string",
            "to_device": "string",
            "payload": "base64 (encrypted)",
            "ttl": "i64 seconds",
            "size": "bytes (validated)",
        },
        "file_citations": ["packages/core-rs/src/sync/relay.rs:48", "packages/relay-server/src/lib.rs:270"],
    },
    {
        "name": "Vault (DEK envelope)",
        "description": "Desktop: DEK derived from password via SQLCipher PBKDF2-HMAC-SHA512; Mobile: KEK via Argon2id wraps DEK via ChaCha20-Poly1305.",
        "fields": {
            "desktop_dek": "32 bytes in memory (SecureDek/Zeroizing)",
            "mobile_metadata": "passwordSalt, passwordHash, dekSalt, encryptedDek, dekNonce (AsyncStorage)",
            "sqlcipher_pragmas": "kdf_iter 256000, cipher_hmac_algorithm HMAC_SHA512, cipher_kdf_algorithm PBKDF2_HMAC_SHA512",
        },
        "file_citations": ["apps/desktop/src-tauri/src/db_pool.rs:22", "packages/core-rs/src/vault.rs", "apps/mobile/src/store/vault.ts:262"],
    },
    {
        "name": "LLMRequest / LLMResponse",
        "description": "Provider-neutral chat payload used by all four providers; cached by ResponseCache; costed by CostTracker.",
        "fields": {
            "model": "string",
            "messages": "[{role, content}]",
            "temperature": "f32",
            "max_tokens": "u32",
            "response": "{content, usage{input_tokens, output_tokens}}",
        },
        "file_citations": ["packages/core-rs/src/llm/types.rs", "packages/core-rs/src/llm/cache.rs:35", "packages/core-rs/src/llm/cost.rs:239"],
    },
    {
        "name": "SyncManifest (mobile TS)",
        "description": "Device state summary exchanged before delta pull/push in the TS SyncClient.",
        "fields": {
            "entries": "[{entity_type, entity_id, updated_at, deleted}]",
            "vector_clock": "Record<device_id, counter>",
            "timestamp": "i64",
        },
        "file_citations": ["apps/mobile/src/lib/sync/sync-client.ts:71"],
    },
    {
        "name": "CapturedPost",
        "description": "Heuristic output of the Rust StreamProcessor from raw accessibility text.",
        "fields": {
            "platform": "string (twitter|instagram|... )",
            "author": "string",
            "text": "string",
            "timestamp": "i64",
            "confidence": "f32",
        },
        "file_citations": ["packages/core-rs/src/social/processing/types.rs", "packages/core-rs/src/social/stream_processor.rs:144"],
    },
]
data["protocols"] = {
    "HTTP/REST": ["Tauri IPC (invoke)", "LLM provider APIs (OpenAI/Anthropic/Gemini/Ollama)", "Relay server /register /send /fetch /pending", "CalDAV WebDAV REPORT/PROPFIND"],
    "WebSocket": ["P2P sync ws://<ip>:<sync_port>/sync (tokio-tungstenite)", "Mobile TS SyncClient ws://<addr>:<port>/sync"],
    "mDNS": ["_noteece-sync._tcp.local. (Rust mdns-sd)", "noteece-sync tcp local. (react-native-zeroconf)", "_socialhub-sync._tcp.local. (mobile_sync protocol)"],
    "SQL": ["SQLCipher vault (rusqlite + r2d2 pool)", "expo-sqlite mobile DB", "FTS5 virtual tables"],
    "JNI/C-ABI": ["Java RustBridge natives -> jni.rs", "cpp NoteeceCore -> rust_* FFI", "JSI __SyncJSI install"],
    "Internal": ["Rust module calls", "TypeScript module calls", "In-process queues (LLM priority, OCR job table, relay queue)"],
    "Broadcast": ["Android intents: ACTION_START_SESSION, ACTION_SET_ACTIVE, ACTION_ANCHOR_CAPTURED"],
}

# ----------------------------------------------------------------------------
# 8. Renumber & sanity-check
# ----------------------------------------------------------------------------
data["nodes"] = [nodes[k] for k in nodes]
meta["coverage_summary"]["nodes"] = len(data["nodes"])
meta["coverage_summary"]["edges"] = len(data["edges"])
meta["coverage_summary"]["flows"] = len(data["flows"])

# Validate no duplicate node ids and all edges resolve
ids = {n["id"] for n in data["nodes"]}
assert len(ids) == len(data["nodes"]), "duplicate node ids"
for e in data["edges"]:
    assert e["source"] in ids, f"edge {e['id']} bad source {e['source']}"
    assert e["target"] in ids, f"edge {e['id']} bad target {e['target']}"
for f in data["flows"]:
    for s in f["steps"]:
        assert s["from"] in ids, f"flow {f['id']} bad from {s['from']}"
        assert s["to"] in ids, f"flow {f['id']} bad to {s['to']}"

with open(SRC, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")

print("Enriched OK:")
print("  nodes:", len(data["nodes"]))
print("  edges:", len(data["edges"]))
print("  flows:", len(data["flows"]))
print("  data_models:", len(data["data_models"]))