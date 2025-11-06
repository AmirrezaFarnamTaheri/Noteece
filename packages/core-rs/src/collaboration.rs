use rusqlite::Connection;
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum CollaborationError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
}

pub fn add_person_to_space(
    conn: &Connection,
    space_id: Ulid,
    person_id: Ulid,
    role: &str,
) -> Result<(), CollaborationError> {
    log::info!(
        "[collaboration] Adding person {} to space {} with role {}",
        person_id,
        space_id,
        role
    );
    conn.execute(
        "INSERT INTO space_people (space_id, person_id, role) VALUES (?1, ?2, ?3)",
        rusqlite::params![space_id.to_string(), person_id.to_string(), role],
    )?;
    Ok(())
}

pub fn remove_person_from_space(
    conn: &Connection,
    space_id: Ulid,
    person_id: Ulid,
) -> Result<(), CollaborationError> {
    log::info!(
        "[collaboration] Removing person {} from space {}",
        person_id,
        space_id
    );
    conn.execute(
        "DELETE FROM space_people WHERE space_id = ?1 AND person_id = ?2",
        rusqlite::params![space_id.to_string(), person_id.to_string()],
    )?;
    Ok(())
}
