use crate::db::DbError;
use crate::mode::enable_core_pack;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Space {
    pub id: Ulid,
    pub name: String,
    pub icon: Option<String>,
    pub enabled_modes_json: String,
}

pub fn create_space(conn: &mut Connection, name: &str) -> Result<Ulid, DbError> {
    log::info!("[space] Creating space with name: {}", name);
    let id = Ulid::new();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO space (id, name) VALUES (?1, ?2)",
        rusqlite::params![id.to_string(), name],
    )?;
    enable_core_pack(&tx, id)?;
    tx.commit()?;
    Ok(id)
}

pub fn get_all_spaces(conn: &Connection) -> Result<Vec<Space>, DbError> {
    log::info!("[space] Getting all spaces");
    let mut stmt = conn.prepare("SELECT id, name, icon, enabled_modes_json FROM space")?;
    let spaces = stmt
        .query_map([], |row| {
            Ok(Space {
                id: Ulid::from_string(&row.get::<_, String>(0)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                name: row.get(1)?,
                icon: row.get(2)?,
                enabled_modes_json: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<Space>, _>>()?;
    log::info!("[space] Found {} spaces", spaces.len());
    Ok(spaces)
}
