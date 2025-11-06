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
    let re = Regex::new(r"- \[ \] @(?P<owner>\w+) (?P<title>.+)")?;
    let mut new_task_ids = Vec::new();

    for cap in re.captures_iter(note_content) {
        let owner = &cap["owner"];
        let title = &cap["title"];
        let task_id = Ulid::new().to_string();

        log::info!(
            "[meeting] Found action item: '{}' for owner: '{}'",
            title,
            owner
        );
        conn.execute(
            "INSERT INTO task (id, space_id, note_id, title, status, context) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![task_id, space_id, note_id, title, "inbox", owner],
        )?;
        new_task_ids.push(task_id);
    }

    log::info!("[meeting] Extracted {} action items", new_task_ids.len());
    Ok(new_task_ids)
}
