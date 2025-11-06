use crate::db::DbError;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: Ulid,
    pub space_id: Ulid,
    pub name: String,
    pub color: Option<String>,
}

pub fn create_tag(
    conn: &Connection,
    space_id: &str,
    name: &str,
    color: Option<&str>,
) -> Result<Tag, DbError> {
    log::info!("[tag] Creating tag with name: {}", name);
    let tag = Tag {
        id: Ulid::new(),
        space_id: Ulid::from_string(space_id).unwrap(),
        name: name.to_string(),
        color: color.map(|s| s.to_string()),
    };

    conn.execute(
        "INSERT INTO tag (id, space_id, name, color) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![
            &tag.id.to_string(),
            &tag.space_id.to_string(),
            &tag.name,
            &tag.color
        ],
    )?;

    Ok(tag)
}

pub fn get_all_tags_in_space(conn: &Connection, space_id: Ulid) -> Result<Vec<Tag>, DbError> {
    log::info!("[tag] Getting all tags for space with id: {}", space_id);
    let mut stmt = conn.prepare("SELECT id, space_id, name, color FROM tag WHERE space_id = ?1")?;
    let tags = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(Tag {
                id: Ulid::from_string(&row.get::<_, String>(0)?).unwrap(),
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).unwrap(),
                name: row.get(2)?,
                color: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<Tag>, _>>()?;
    log::info!("[tag] Found {} tags", tags.len());
    Ok(tags)
}
