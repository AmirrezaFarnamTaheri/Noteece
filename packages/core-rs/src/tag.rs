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
    let space_ulid = Ulid::from_string(space_id)
        .map_err(|e| DbError::Message(format!("Invalid space ID: {}", e)))?;

    let tag = Tag {
        id: Ulid::new(),
        space_id: space_ulid,
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
                id: Ulid::from_string(&row.get::<_, String>(0)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                name: row.get(2)?,
                color: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<Tag>, _>>()?;
    log::info!("[tag] Found {} tags", tags.len());
    Ok(tags)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagWithCount {
    pub tag: Tag,
    pub note_count: i64,
}

pub fn get_tags_with_counts(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<TagWithCount>, DbError> {
    log::info!("[tag] Getting tags with counts for space: {}", space_id);
    let mut stmt = conn.prepare(
        "SELECT t.id, t.space_id, t.name, t.color, COUNT(nt.note_id) as note_count
         FROM tag t
         LEFT JOIN note_tags nt ON t.id = nt.tag_id
         WHERE t.space_id = ?1
         GROUP BY t.id
         ORDER BY note_count DESC",
    )?;

    let tags = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(TagWithCount {
                tag: Tag {
                    id: Ulid::from_string(&row.get::<_, String>(0)?)
                        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                    space_id: Ulid::from_string(&row.get::<_, String>(1)?)
                        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                },
                note_count: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<TagWithCount>, _>>()?;

    Ok(tags)
}
