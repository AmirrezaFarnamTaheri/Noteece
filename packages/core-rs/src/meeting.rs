use regex::Regex;
use rusqlite::Connection;
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum MeetingError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("Regex error: {0}")]
    Regex(#[from] regex::Error),
}

pub fn extract_action_items(
    conn: &Connection,
    space_id: &str,
    note_id: &str,
    note_content: &str,
) -> Result<Vec<String>, MeetingError> {
    log::info!("[meeting] Extracting action items from note: {}", note_id);
    // Updated regex:
    // - Matches both `[ ]` and `[x]` for status.
    // - Makes the `@owner` tag optional.
    let re = Regex::new(r"- \[(?P<status_char> |x)\] (?:@(?P<owner>\w+) )?(?P<title>.+)")?;
    let mut new_task_ids = Vec::new();

    for cap in re.captures_iter(note_content) {
        let title = cap.name("title").map_or("", |m| m.as_str()).trim();
        if title.is_empty() {
            continue;
        }

        // Default to "unassigned" if no owner is captured
        let owner = cap.name("owner").map_or("unassigned", |m| m.as_str());

        // Determine status based on the character in brackets
        let status = match cap.name("status_char") {
            Some(m) if m.as_str() == "x" => "done",
            _ => "inbox",
        };

        let task_id = Ulid::new().to_string();

        log::info!(
            "[meeting] Found action item: '{}' for owner: '{}' with status: '{}'",
            title,
            owner,
            status
        );
        conn.execute(
            "INSERT INTO task (id, space_id, note_id, title, status, context) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![task_id, space_id, note_id, title, status, owner],
        )?;
        new_task_ids.push(task_id);
    }

    log::info!("[meeting] Extracted {} action items", new_task_ids.len());
    Ok(new_task_ids)
}
