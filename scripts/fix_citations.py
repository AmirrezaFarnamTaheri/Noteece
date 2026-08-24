#!/usr/bin/env python3
"""Fix invalid citations found by the cross-check in system_topology.json."""
import json

SRC = "system_topology.json"
data = json.load(open(SRC, encoding="utf-8"))
n_by_id = {n["id"]: n for n in data["nodes"]}

# --- desktop-services-ts: real auth.ts symbols ---
for c in n_by_id["desktop-services-ts"]["file_citations"]:
    if c["file"] == "apps/desktop/src/services/auth.ts":
        c["symbols"] = ["AuthService", "register", "login", "logout", "validateSession", "getCurrentUserId", "changePassword"]

# --- desktop-ipc-gateway: commands/mod.rs is a flat pub mod list ---
for c in n_by_id["desktop-ipc-gateway"]["file_citations"]:
    if c["file"] == "apps/desktop/src-tauri/src/commands/mod.rs":
        c["symbols"] = ["pub mod vault", "pub mod sync", "pub mod ai", "pub mod note", "pub mod social", "pub mod auth", "pub mod task", "pub mod project", "pub mod caldav", "pub mod collaboration"]

# --- core-projects: project.rs only re-exports ---
for c in n_by_id["core-projects"]["file_citations"]:
    if c["file"] == "packages/core-rs/src/project.rs":
        c["symbols"] = ["pub use db::*", "pub use models::*"]

# --- core-analytics: generate/record feedback live in commands/foresight.rs ---
for c in n_by_id["core-analytics"]["file_citations"]:
    if c["file"] == "apps/desktop/src-tauri/src/commands/analytics.rs":
        c["symbols"] = ["get_analytics_data_cmd", "get_dashboard_stats_cmd"]
    if c["file"] == "apps/desktop/src-tauri/src/commands/temporal_graph.rs":
        c["symbols"] = ["build_current_graph_cmd", "get_graph_evolution_cmd"]
n_by_id["core-analytics"]["file_citations"].append(
    {"file": "apps/desktop/src-tauri/src/commands/foresight.rs",
     "symbols": ["generate_insights_cmd", "get_active_insights_cmd", "dismiss_insight_cmd", "record_feedback_cmd"]}
)

# --- core-space: only get_all_spaces_cmd exists in the command module ---
for c in n_by_id["core-space"]["file_citations"]:
    if c["file"] == "apps/desktop/src-tauri/src/commands/space.rs":
        c["symbols"] = ["get_all_spaces_cmd"]

# --- core-notes: tag command has no create_tag_cmd; use real ones ---
for c in n_by_id["core-notes"]["file_citations"]:
    if c["file"] == "apps/desktop/src-tauri/src/commands/tag.rs":
        c["symbols"] = ["get_all_tags_in_space_cmd", "get_tags_with_counts_cmd"]

# --- core-audit / core-calendar-local: drop ghost command-module citations ---
for c in n_by_id["core-audit"]["file_citations"]:
    if "commands/audit.rs" in c["file"]:
        c["file"] = "packages/core-rs/src/audit.rs"
        c["symbols"] = ["log_event"]
for c in n_by_id["core-calendar-local"]["file_citations"]:
    if "commands/calendar.rs" in c["file"]:
        c["file"] = "packages/core-rs/src/calendar.rs"
        c["symbols"] = ["import_ics", "export_ics"]

# --- edges: replace ghost files with real ones ---
for e in data["edges"]:
    if e["id"] == "e-ipc-to-audit":
        e["file_citations"] = ["apps/desktop/src-tauri/src/commands/auth.rs:51",
                               "apps/desktop/src-tauri/src/commands/vault.rs:57",
                               "packages/core-rs/src/audit.rs:21"]
    if e["id"] == "e-ipc-to-calendar-local":
        e["file_citations"] = ["packages/core-rs/src/calendar.rs:9",
                               "apps/desktop/src-tauri/src/commands/caldav.rs:1"]

for n in data["nodes"]:
    n["file_citations"] = [c for c in n["file_citations"] if c["file"] != "apps/desktop/src-tauri/src/commands/audit.rs"]

json.dump(data, open(SRC, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("Fixes applied.")