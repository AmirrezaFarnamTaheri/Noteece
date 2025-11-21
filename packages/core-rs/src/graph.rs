use crate::db::DbError;
use rusqlite::Connection;
use serde::Serialize;
use ulid::Ulid;

#[derive(Serialize, Debug)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub group: String, // "note", "tag", "person"
    pub val: i32,      // weight/size
}

#[derive(Serialize, Debug)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub value: i32,
}

#[derive(Serialize, Debug)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

pub fn get_vault_graph(conn: &Connection, space_id: Ulid) -> Result<GraphData, DbError> {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    // 1. Notes
    let mut stmt = conn.prepare(
        "SELECT id, title FROM note WHERE space_id = ?1 AND is_trashed = 0",
    )?;
    let note_rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(GraphNode {
            id: row.get(0)?,
            label: row.get(1)?,
            group: "note".to_string(),
            val: 10,
        })
    })?;

    for node in note_rows {
        nodes.push(node?);
    }

    // 2. Tags (as nodes)
    let mut stmt = conn.prepare("SELECT id, name FROM tag WHERE space_id = ?1")?;
    let tag_rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(GraphNode {
            id: row.get(0)?,
            label: format!("#{}", row.get::<_, String>(1)?),
            group: "tag".to_string(),
            val: 5,
        })
    })?;

    for node in tag_rows {
        nodes.push(node?);
    }

    // 3. Edges: Note -> Tag
    let mut stmt = conn.prepare(
        "SELECT nt.note_id, nt.tag_id
         FROM note_tags nt
         JOIN note n ON nt.note_id = n.id
         WHERE n.space_id = ?1",
    )?;
    let note_tag_rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(GraphEdge {
            source: row.get(0)?,
            target: row.get(1)?,
            value: 1,
        })
    })?;

    for edge in note_tag_rows {
        edges.push(edge?);
    }

    // 4. Edges: Note -> Note (Links)
    let mut stmt = conn.prepare(
        "SELECT l.source_note_id, l.target_note_id
         FROM link l
         JOIN note n ON l.source_note_id = n.id
         WHERE n.space_id = ?1",
    )?;
    let link_rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(GraphEdge {
            source: row.get(0)?,
            target: row.get(1)?,
            value: 2,
        })
    })?;

    for edge in link_rows {
        edges.push(edge?);
    }

    // 5. People (optional, if they exist in space)
    let mut stmt = conn.prepare("SELECT id, name FROM person WHERE space_id = ?1")?;
    let person_rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(GraphNode {
            id: row.get(0)?,
            label: row.get(1)?,
            group: "person".to_string(),
            val: 8,
        })
    })?;

    for node in person_rows {
        nodes.push(node?);
    }

    Ok(GraphData { nodes, edges })
}
