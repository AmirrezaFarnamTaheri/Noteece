// packages/core-rs/src/form.rs

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::db::DbError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormTemplate {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub fields: Vec<FormField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormField {
    pub name: String,
    pub label: String,
    pub field_type: FormFieldType,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FormFieldType {
    Text,
    Textarea,
    Number,
    Checkbox,
    Date,
    Time,
}

pub fn create_form_template(
    conn: &Connection,
    space_id: &str,
    name: &str,
    fields: Vec<FormField>,
) -> Result<FormTemplate, DbError> {
    let id = Ulid::new().to_string();
    let fields_json =
        serde_json::to_string(&fields).map_err(|e| DbError::Message(e.to_string()))?;
    conn.execute(
        "INSERT INTO form_template (id, space_id, name, fields_json) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, space_id, name, fields_json],
    )?;
    Ok(FormTemplate {
        id,
        space_id: space_id.to_string(),
        name: name.to_string(),
        fields,
    })
}

pub fn get_form_template(conn: &Connection, id: &str) -> Result<FormTemplate, DbError> {
    let mut stmt =
        conn.prepare("SELECT id, space_id, name, fields_json FROM form_template WHERE id = ?1")?;
    let mut rows = stmt.query(rusqlite::params![id])?;
    let row = rows
        .next()?
        .ok_or_else(|| DbError::Message("Form template not found".to_string()))?;
    let fields_json: String = row.get(3)?;
    let fields: Vec<FormField> =
        serde_json::from_str(&fields_json).map_err(|e| DbError::Message(e.to_string()))?;
    Ok(FormTemplate {
        id: row.get(0)?,
        space_id: row.get(1)?,
        name: row.get(2)?,
        fields,
    })
}

pub fn get_form_templates_for_space(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<FormTemplate>, DbError> {
    let mut stmt = conn
        .prepare("SELECT id, space_id, name, fields_json FROM form_template WHERE space_id = ?1")?;
    let mut rows = stmt.query(rusqlite::params![space_id])?;
    let mut templates = Vec::new();
    while let Some(row) = rows.next()? {
        let fields_json: String = row.get(3)?;
        let fields: Vec<FormField> =
            serde_json::from_str(&fields_json).map_err(|e| DbError::Message(e.to_string()))?;
        templates.push(FormTemplate {
            id: row.get(0)?,
            space_id: row.get(1)?,
            name: row.get(2)?,
            fields,
        });
    }
    Ok(templates)
}

pub fn update_form_template(
    conn: &Connection,
    id: &str,
    name: &str,
    fields: Vec<FormField>,
) -> Result<(), DbError> {
    let fields_json =
        serde_json::to_string(&fields).map_err(|e| DbError::Message(e.to_string()))?;
    conn.execute(
        "UPDATE form_template SET name = ?1, fields_json = ?2 WHERE id = ?3",
        rusqlite::params![name, fields_json, id],
    )?;
    Ok(())
}

pub fn delete_form_template(conn: &Connection, id: &str) -> Result<(), DbError> {
    conn.execute(
        "DELETE FROM form_template WHERE id = ?1",
        rusqlite::params![id],
    )?;
    Ok(())
}
