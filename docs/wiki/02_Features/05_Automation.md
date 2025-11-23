# Automation (Planned)

## Vision

Noteece aims to introduce a powerful **Automation DSL (Domain Specific Language)** to allow users to script workflows within their second brain. This feature is currently in the **Design Phase**.

## The Automation DSL

The goal is to provide a safe, sandboxed scripting environment (likely based on **Rhai** or **Lua**) that interacts with the Noteece Core API.

### Potential Use Cases

1.  **Daily Review Generator:**
    ```javascript
    on("daily_cron", () => {
        const yesterday = date.yesterday();
        const done = tasks.find({ status: "done", date: yesterday });
        const note = notes.create(`Review: ${yesterday}`);
        note.append(done.format_list());
    });
    ```

2.  **Automatic Tagging:**
    ```javascript
    on("note_save", (note) => {
        if (note.content.includes("Project X")) {
            note.add_tag("project/x");
        }
    });
    ```

3.  **External Integrations:**
    fetch data from external APIs (weather, stocks) and append to a "Morning Briefing" note.

## Security Constraints

Since automation involves running user-defined code, security is paramount.

- **Sandboxing:** Scripts must run in a strictly isolated environment with no access to the host file system or network (unless explicitly whitelisted).
- **Permissions:** A permission system (similar to Android) will require users to grant scripts access to specific capabilities (e.g., "Read Notes", "Write Tasks").
- **Resource Limits:** Execution time and memory usage will be capped to prevent infinite loops from freezing the app.

## Implementation Plan

1.  **Phase 1:** Define the AST and Core API bindings in Rust.
2.  **Phase 2:** Integrate an embedded scripting engine (likely `Rhai` for its Rust integration).
3.  **Phase 3:** Build a UI for managing scripts and triggers.
4.  **Phase 4:** Community repository for sharing scripts.
