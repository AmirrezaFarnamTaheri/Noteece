pub mod advanced;
pub mod saved;

use crate::db::DbError;
use crate::note::Note;
use rusqlite::{Connection, Result};

pub use advanced::{
    search_all, EntityType, SearchFilters, SearchQuery, SearchResult, SortDirection, SortField,
    SortOptions,
};
pub use saved::{
    create_saved_search, delete_saved_search, get_saved_search, get_saved_searches,
    update_saved_search, SavedSearch,
};

pub fn search_notes(conn: &Connection, query: &str, scope: &str) -> Result<Vec<Note>, DbError> {
    log::info!(
        "[search] Searching notes with query: '{}' in scope: '{}'",
        query,
        scope
    );
    let mut fts_query = "".to_string();
    let mut tags: Vec<String> = Vec::new();

    for part in query.split_whitespace() {
        if let Some(stripped) = part.strip_prefix("tag:") {
            tags.push(stripped.to_string());
        } else {
            if !fts_query.is_empty() {
                fts_query.push(' ');
            }
            fts_query.push_str(part);
        }
    }

    // Determine if FTS5 table exists (safe fallback)
    let has_fts: bool = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fts_note'",
            [],
            |_| Ok(true),
        )
        .map_err(|e| {
            log::warn!("[search] Failed to check for FTS table: {}", e);
            e
        })
        .unwrap_or(false);

    let mut sql = String::from(
        "SELECT n.id, n.space_id, n.title, n.content_md, n.created_at, n.modified_at, n.is_trashed
        FROM note n",
    );

    let mut where_clauses = vec!["n.space_id = ?1".to_string()];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(scope.to_string())];

    // LIKE query fallback string must live long enough, but we can Box it.
    let like_query_val = format!("%{}%", fts_query);

    if !fts_query.is_empty() {
        if has_fts {
            // Join FTS table on rowid; fts_note.rowid corresponds to base table rowid
            sql.push_str(" JOIN fts_note ON n.rowid = fts_note.rowid");
            where_clauses.push("fts_note MATCH ?2".to_string());
            params.push(Box::new(fts_query.clone()));
        } else {
            where_clauses.push("(n.title LIKE ?2 OR n.content_md LIKE ?2)".to_string());
            params.push(Box::new(like_query_val));
        }
    }

    if !tags.is_empty() {
        sql.push_str(
            "
            JOIN note_tags nt ON n.id = nt.note_id
            JOIN tag t ON nt.tag_id = t.id
        ",
        );
        let tag_placeholders = tags.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        where_clauses.push(format!("t.name IN ({})", tag_placeholders));
        for tag in &tags {
            params.push(Box::new(tag.clone()));
        }
    }

    if !where_clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_clauses.join(" AND "));
    }

    let mut stmt = conn.prepare(&sql)?;
    // Convert Vec<Box<dyn ToSql>> to slice of &dyn ToSql for query
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
    let mut rows = stmt.query(params_refs.as_slice())?;

    let mut results = Vec::new();
    while let Some(row) = rows.next()? {
        results.push(Note {
            id: row.get(0)?,
            space_id: row.get(1)?,
            title: row.get(2)?,
            content_md: row.get(3)?,
            created_at: row.get(4)?,
            modified_at: row.get(5)?,
            is_trashed: row.get(6)?,
        });
    }
    Ok(results)
}
