use crate::db::DbError;
use crate::note::Note;
use crate::project::Project;
use crate::task::Task;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

pub fn search_notes(conn: &Connection, query: &str, scope: &str) -> Result<Vec<Note>, DbError> {
    log::info!(
        "[search] Searching notes with query: '{}' in scope: '{}'",
        query,
        scope
    );
    let mut fts_query = "".to_string();
    let mut tags: Vec<String> = Vec::new();

    for part in query.split_whitespace() {
        if part.starts_with("tag:") {
            tags.push(part[4..].to_string());
        } else {
            if !fts_query.is_empty() {
                fts_query.push(' ');
            }
            fts_query.push_str(part);
        }
    }

    let mut sql = "
        SELECT n.id, n.space_id, n.title, n.content_md, n.created_at, n.modified_at, n.is_trashed
        FROM note n
        JOIN fts_note f ON n.id = f.note_id
    "
    .to_string();
    let mut where_clauses = vec!["n.space_id = ?1".to_string()];
    let mut params: Vec<&dyn rusqlite::ToSql> = vec![&scope];

    if !fts_query.is_empty() {
        where_clauses.push("f.fts_note MATCH ?2".to_string());
        params.push(&fts_query);
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
            params.push(tag);
        }
    }

    if !where_clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_clauses.join(" AND "));
    }

    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query(rusqlite::params_from_iter(&params))?;
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

// Advanced search structures

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub entity_types: Vec<EntityType>,
    pub filters: SearchFilters,
    pub sort: SortOptions,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EntityType {
    Note,
    Task,
    Project,
    Tag,
    TimeEntry,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchFilters {
    pub space_id: Option<Ulid>,
    pub tags: Vec<String>,
    pub date_from: Option<i64>,
    pub date_to: Option<i64>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub completed: Option<bool>,
    pub archived: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortOptions {
    pub field: SortField,
    pub direction: SortDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SortField {
    Relevance,
    CreatedAt,
    UpdatedAt,
    Title,
    Priority,
    Deadline,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub entity_type: EntityType,
    pub entity_id: String,
    pub title: String,
    pub snippet: Option<String>,
    pub relevance_score: f64,
    pub created_at: i64,
    pub updated_at: i64,
    pub metadata: serde_json::Value,
}

impl Default for SearchFilters {
    fn default() -> Self {
        SearchFilters {
            space_id: None,
            tags: vec![],
            date_from: None,
            date_to: None,
            status: None,
            priority: None,
            completed: None,
            archived: None,
        }
    }
}

impl Default for SortOptions {
    fn default() -> Self {
        SortOptions {
            field: SortField::Relevance,
            direction: SortDirection::Desc,
        }
    }
}

/// Advanced multi-entity search
pub fn search_all(conn: &Connection, query: &SearchQuery) -> Result<Vec<SearchResult>, DbError> {
    let mut results = Vec::new();

    for entity_type in &query.entity_types {
        match entity_type {
            EntityType::Note => {
                results.extend(search_notes_advanced(conn, query)?);
            }
            EntityType::Task => {
                results.extend(search_tasks_advanced(conn, query)?);
            }
            EntityType::Project => {
                results.extend(search_projects_advanced(conn, query)?);
            }
            EntityType::All => {
                results.extend(search_notes_advanced(conn, query)?);
                results.extend(search_tasks_advanced(conn, query)?);
                results.extend(search_projects_advanced(conn, query)?);
            }
            _ => {}
        }
    }

    // Sort results
    sort_results(&mut results, &query.sort);

    // Apply limit and offset
    if let Some(offset) = query.offset {
        results = results.into_iter().skip(offset).collect();
    }

    if let Some(limit) = query.limit {
        results.truncate(limit);
    }

    Ok(results)
}

/// Advanced note search
///
/// SECURITY & PERFORMANCE: Does not fetch encrypted_content column to:
/// - Reduce memory usage and I/O
/// - Avoid unnecessary exposure of sensitive encrypted data
/// - Prevent accidental plaintext processing of ciphertext
fn search_notes_advanced(
    conn: &Connection,
    query: &SearchQuery,
) -> Result<Vec<SearchResult>, DbError> {
    // Exclude encrypted_content from SELECT for security and performance
    let mut sql = String::from(
        "SELECT n.id, n.title, n.created_at, n.modified_at
         FROM note n",
    );
    let mut where_clauses = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Space filter
    if let Some(space_id) = &query.filters.space_id {
        where_clauses.push("n.space_id = ?".to_string());
        params.push(Box::new(space_id.to_string()));
    }

    // Text search - only search in title since encrypted_content is not searchable with LIKE
    if !query.query.is_empty() {
        where_clauses.push("n.title LIKE ?".to_string());
        params.push(Box::new(format!("%{}%", query.query)));
    }

    // Date filters
    if let Some(from) = query.filters.date_from {
        where_clauses.push("n.created_at >= ?".to_string());
        params.push(Box::new(from));
    }
    if let Some(to) = query.filters.date_to {
        where_clauses.push("n.created_at <= ?".to_string());
        params.push(Box::new(to));
    }

    // Archived filter
    if let Some(archived) = query.filters.archived {
        where_clauses.push("n.is_archived = ?".to_string());
        params.push(Box::new(if archived { 1 } else { 0 }));
    }

    if !where_clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_clauses.join(" AND "));
    }

    let mut results = Vec::new();
    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
    let mut rows = stmt.query(params_refs.as_slice())?;

    while let Some(row) = rows.next()? {
        let id: String = row.get(0)?;
        let title: String = row.get(1)?;
        let created_at: i64 = row.get(2)?;
        let updated_at: i64 = row.get(3)?;

        // Relevance based on title only to avoid using ciphertext
        let relevance = calculate_relevance(&title, None, &query.query);

        results.push(SearchResult {
            entity_type: EntityType::Note,
            entity_id: id.clone(),
            title,
            snippet: None,
            relevance_score: relevance,
            created_at,
            updated_at,
            metadata: serde_json::json!({ "type": "note" }),
        });
    }

    Ok(results)
}

/// Advanced task search
fn search_tasks_advanced(
    conn: &Connection,
    query: &SearchQuery,
) -> Result<Vec<SearchResult>, DbError> {
    let mut sql = String::from(
        "SELECT t.id, t.title, t.description, t.status, t.priority, t.start_at, t.completed_at, t.due_at
         FROM task t",
    );
    let mut where_clauses = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Space filter
    if let Some(space_id) = &query.filters.space_id {
        where_clauses.push("t.space_id = ?".to_string());
        params.push(Box::new(space_id.to_string()));
    }

    // Text search
    if !query.query.is_empty() {
        where_clauses.push("(t.title LIKE ? OR t.description LIKE ?)".to_string());
        let pattern = format!("%{}%", query.query);
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern));
    }

    // Status filter
    if let Some(status) = &query.filters.status {
        where_clauses.push("t.status = ?".to_string());
        params.push(Box::new(status.clone()));
    }

    // Priority filter
    if let Some(priority) = &query.filters.priority {
        where_clauses.push("t.priority = ?".to_string());
        params.push(Box::new(priority.clone()));
    }

    // Completed filter
    if let Some(completed) = query.filters.completed {
        if completed {
            where_clauses.push("t.status = 'completed'".to_string());
        } else {
            where_clauses.push("t.status != 'completed'".to_string());
        }
    }

    if !where_clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_clauses.join(" AND "));
    }

    let mut results = Vec::new();
    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
    let mut rows = stmt.query(params_refs.as_slice())?;

    while let Some(row) = rows.next()? {
        let id: String = row.get(0)?;
        let title: String = row.get(1)?;
        let description: Option<String> = row.get::<_, Option<String>>(2)?;
        let status: String = row.get(3)?;
        let priority: Option<String> = row.get::<_, Option<String>>(4)?;
        let created_at: i64 = row.get(5)?;
        let updated_at: i64 = row.get(6)?;
        let deadline: Option<i64> = row.get::<_, Option<i64>>(7)?;

        let snippet = description
            .as_ref()
            .and_then(|d| extract_snippet(d, &query.query));

        let relevance = calculate_relevance(&title, description.as_deref(), &query.query);

        results.push(SearchResult {
            entity_type: EntityType::Task,
            entity_id: id.clone(),
            title,
            snippet,
            relevance_score: relevance,
            created_at,
            updated_at,
            metadata: serde_json::json!({
                "type": "task",
                "status": status,
                "priority": priority,
                "deadline": deadline
            }),
        });
    }

    Ok(results)
}

/// Advanced project search
fn search_projects_advanced(
    conn: &Connection,
    query: &SearchQuery,
) -> Result<Vec<SearchResult>, DbError> {
    let mut sql = String::from(
        "SELECT p.id, p.title, p.goal_outcome, p.status, p.start_at, p.target_end_at
         FROM project p",
    );
    let mut where_clauses = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Space filter
    if let Some(space_id) = &query.filters.space_id {
        where_clauses.push("p.space_id = ?".to_string());
        params.push(Box::new(space_id.to_string()));
    }

    // Text search
    if !query.query.is_empty() {
        where_clauses.push("(p.name LIKE ? OR p.description LIKE ?)".to_string());
        let pattern = format!("%{}%", query.query);
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern));
    }

    // Status filter
    if let Some(status) = &query.filters.status {
        where_clauses.push("p.status = ?".to_string());
        params.push(Box::new(status.clone()));
    }

    if !where_clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_clauses.join(" AND "));
    }

    let mut results = Vec::new();
    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
    let mut rows = stmt.query(params_refs.as_slice())?;

    while let Some(row) = rows.next()? {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let description: Option<String> = row.get(2).ok();
        let status: String = row.get(3)?;
        let created_at: i64 = row.get(4)?;
        let updated_at: i64 = row.get(5)?;

        let snippet = description
            .as_ref()
            .and_then(|d| extract_snippet(d, &query.query));

        let relevance = calculate_relevance(&name, description.as_deref(), &query.query);

        results.push(SearchResult {
            entity_type: EntityType::Project,
            entity_id: id.clone(),
            title: name,
            snippet,
            relevance_score: relevance,
            created_at,
            updated_at,
            metadata: serde_json::json!({
                "type": "project",
                "status": status
            }),
        });
    }

    Ok(results)
}

/// Extract snippet around query match
fn extract_snippet(content: &str, query: &str) -> Option<String> {
    if query.is_empty() {
        return Some(content.chars().take(150).collect());
    }

    let lower_content = content.to_lowercase();
    let lower_query = query.to_lowercase();

    if let Some(pos) = lower_content.find(&lower_query) {
        let start = pos.saturating_sub(50);
        let end = (pos + query.len() + 100).min(content.len());

        let snippet = &content[start..end];
        Some(format!("...{}...", snippet))
    } else {
        Some(content.chars().take(150).collect())
    }
}

/// Calculate relevance score
fn calculate_relevance(title: &str, content: Option<&str>, query: &str) -> f64 {
    if query.is_empty() {
        return 1.0;
    }

    let mut score = 0.0;
    let lower_query = query.to_lowercase();

    // Title match (higher weight)
    let lower_title = title.to_lowercase();
    if lower_title.contains(&lower_query) {
        score += 10.0;
        // Exact match bonus
        if lower_title == lower_query {
            score += 20.0;
        }
        // Starts with bonus
        if lower_title.starts_with(&lower_query) {
            score += 5.0;
        }
    }

    // Content match
    if let Some(c) = content {
        let lower_content = c.to_lowercase();
        let matches = lower_content.matches(&lower_query).count();
        score += matches as f64 * 2.0;
    }

    score
}

/// Sort search results
fn sort_results(results: &mut [SearchResult], sort: &SortOptions) {
    results.sort_by(|a, b| {
        let cmp = match sort.field {
            SortField::Relevance => b
                .relevance_score
                .partial_cmp(&a.relevance_score)
                .unwrap_or(std::cmp::Ordering::Equal),
            SortField::CreatedAt => b.created_at.cmp(&a.created_at),
            SortField::UpdatedAt => b.updated_at.cmp(&a.updated_at),
            SortField::Title => a.title.cmp(&b.title),
            _ => std::cmp::Ordering::Equal,
        };

        match sort.direction {
            SortDirection::Asc => cmp.reverse(),
            SortDirection::Desc => cmp,
        }
    });
}
