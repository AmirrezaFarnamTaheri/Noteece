use crate::db::DbError;
use regex::Regex;
use rusqlite::{Connection, Result};
use ulid::Ulid;

#[derive(Debug)]
pub struct Backlink {
    pub source_note_id: Ulid,
    pub target_note_id: Ulid,
}

pub fn find_backlinks(conn: &Connection, note_id: Ulid) -> Result<Vec<Backlink>, DbError> {
    log::info!("[backlink] Finding backlinks for note: {}", note_id);
    let mut stmt = conn.prepare("SELECT source_note_id FROM link WHERE target_note_id = ?1")?;
    let mut rows = stmt.query([note_id.to_string()])?;
    let mut backlinks = Vec::new();
    while let Some(row) = rows.next()? {
        backlinks.push(Backlink {
            source_note_id: Ulid::from_string(&row.get::<_, String>(0)?).unwrap(),
            target_note_id: note_id,
        });
    }
    Ok(backlinks)
}

pub fn update_links(conn: &Connection, note_id: Ulid, content: &str) -> Result<(), DbError> {
    log::info!("[backlink] Updating links for note: {}", note_id);
    conn.execute(
        "DELETE FROM link WHERE source_note_id = ?1",
        [note_id.to_string()],
    )?;
    let re = Regex::new(r"\[\[(.+?)\]\]").unwrap();
    for cap in re.captures_iter(content) {
        let target_note_id_str = &cap[1];
        if let Ok(target_note_id) = Ulid::from_string(target_note_id_str) {
            log::info!(
                "[backlink] Found link from {} to {}",
                note_id,
                target_note_id
            );
            conn.execute(
                "INSERT INTO link (source_note_id, target_note_id) VALUES (?1, ?2)",
                rusqlite::params![note_id.to_string(), target_note_id.to_string()],
            )?;
        }
    }
    Ok(())
}
