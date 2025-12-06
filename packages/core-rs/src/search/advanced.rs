use crate::db::DbError;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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
fn search_notes_advanced(
    conn: &Connection,
    query: &SearchQuery,
) -> Result<Vec<SearchResult>, DbError> {
    // Check for FTS table availability
    let has_fts: bool = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fts_note'",
            [],
            |_| Ok(true),
        )
        .unwrap_or(false);

    // Include content_md for snippets
    let mut sql = String::from(
        "SELECT n.id, n.title, n.created_at, n.modified_at, n.content_md
         FROM note n",
    );

    let mut where_clauses = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Join FTS if available and querying text
    if has_fts && !query.query.is_empty() {
        sql.push_str(" JOIN fts_note ON n.rowid = fts_note.rowid");
    }

    // Space filter
    if let Some(space_id) = &query.filters.space_id {
        where_clauses.push("n.space_id = ?".to_string());
        params.push(Box::new(space_id.to_string()));
    }

    // Text search
    if !query.query.is_empty() {
        if has_fts {
            where_clauses.push("fts_note MATCH ?".to_string());
            params.push(Box::new(query.query.clone()));
        } else {
            // Fallback to LIKE on title and content
            where_clauses.push("(n.title LIKE ? OR n.content_md LIKE ?)".to_string());
            let pattern = format!("%{}%", query.query);
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern));
        }
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
        where_clauses.push("n.is_trashed = ?".to_string());
        params.push(Box::new(if archived { 1 } else { 0 }));
    } else {
        // Default: exclude trashed
        where_clauses.push("n.is_trashed = 0".to_string());
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
        let content: String = row.get(4)?;

        // Calculate snippet and relevance
        let (snippet, relevance) = if query.query.is_empty() {
            (None, 1.0)
        } else {
            (
                extract_snippet(&content, &query.query),
                calculate_relevance(&title, Some(&content), &query.query),
            )
        };

        results.push(SearchResult {
            entity_type: EntityType::Note,
            entity_id: id.clone(),
            title,
            snippet,
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
    // Check for FTS table
    let has_fts: bool = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fts_task'",
            [],
            |_| Ok(true),
        )
        .unwrap_or(false);

    let mut sql = String::from(
        "SELECT t.id, t.title, t.description, t.status, t.priority, t.start_at, t.completed_at, t.due_at
         FROM task t",
    );
    let mut where_clauses = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if has_fts && !query.query.is_empty() {
        // Join via rowid mapping
        sql.push_str(" JOIN fts_task ON t.rowid = fts_task.rowid");
    }

    // Space filter
    if let Some(space_id) = &query.filters.space_id {
        where_clauses.push("t.space_id = ?".to_string());
        params.push(Box::new(space_id.to_string()));
    }

    // Text search
    if !query.query.is_empty() {
        if has_fts {
            where_clauses.push("fts_task MATCH ?".to_string());
            params.push(Box::new(query.query.clone()));
        } else {
            where_clauses.push("(t.title LIKE ? OR t.description LIKE ?)".to_string());
            let pattern = format!("%{}%", query.query);
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern));
        }
    }

    // Status filter
    if let Some(status) = &query.filters.status {
        where_clauses.push("t.status = ?".to_string());
        params.push(Box::new(status.clone()));
    }

    // Priority filter
    if let Some(priority) = &query.filters.priority {
        if let Ok(p_int) = priority.parse::<i32>() {
            where_clauses.push("t.priority = ?".to_string());
            params.push(Box::new(p_int));
        }
    }

    // Completed filter
    if let Some(completed) = query.filters.completed {
        if completed {
            where_clauses.push("t.status = 'done'".to_string()); // Using 'done' based on schema check constraint
        } else {
            where_clauses.push("t.status != 'done'".to_string());
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
        let priority: Option<i32> = row.get::<_, Option<i32>>(4)?; // Schema says INT
        let created_at: i64 = row.get::<_, Option<i64>>(5)?.unwrap_or(0); // task doesn't have created_at, using start_at as proxy or default
        let updated_at: i64 = 0; // No updated_at in task schema v1?
        let deadline: Option<i64> = row.get::<_, Option<i64>>(7)?;

        let (snippet, relevance) = if query.query.is_empty() {
            (None, 1.0)
        } else {
            (
                description
                    .as_ref()
                    .and_then(|d| extract_snippet(d, &query.query)),
                calculate_relevance(&title, description.as_deref(), &query.query),
            )
        };

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
    // Check for FTS table
    let has_fts: bool = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fts_project'",
            [],
            |_| Ok(true),
        )
        .unwrap_or(false);

    let mut sql = String::from(
        "SELECT p.id, p.title, p.goal_outcome, p.status, p.start_at, p.target_end_at
         FROM project p",
    );
    let mut where_clauses = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if has_fts && !query.query.is_empty() {
        // Use rowid mapping between base table and FTS table
        sql.push_str(" JOIN fts_project ON p.rowid = fts_project.rowid");
    }

    // Space filter
    if let Some(space_id) = &query.filters.space_id {
        where_clauses.push("p.space_id = ?".to_string());
        params.push(Box::new(space_id.to_string()));
    }

    // Text search
    if !query.query.is_empty() {
        if has_fts {
            where_clauses.push("fts_project MATCH ?".to_string());
            params.push(Box::new(query.query.clone()));
        } else {
            where_clauses.push("(p.title LIKE ? OR p.goal_outcome LIKE ?)".to_string());
            let pattern = format!("%{}%", query.query);
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern));
        }
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
        let goal_outcome: Option<String> = row.get(2).ok();
        let status: String = row.get(3)?;
        let start_at: i64 = row.get::<_, Option<i64>>(4)?.unwrap_or(0);
        // No updated_at in project schema v1

        let (snippet, relevance) = if query.query.is_empty() {
            (None, 1.0)
        } else {
            (
                goal_outcome
                    .as_ref()
                    .and_then(|d| extract_snippet(d, &query.query)),
                calculate_relevance(&name, goal_outcome.as_deref(), &query.query),
            )
        };

        results.push(SearchResult {
            entity_type: EntityType::Project,
            entity_id: id.clone(),
            title: name,
            snippet,
            relevance_score: relevance,
            created_at: start_at, // Use start_at as proxy
            updated_at: 0,
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
    let trimmed_query = query.trim();
    if trimmed_query.is_empty() {
        return Some(content.chars().take(150).collect());
    }

    let q_lower = query.to_lowercase();
    let content_chars: Vec<char> = content.chars().collect();
    let content_len = content_chars.len();

    // Find case-insensitive match by scanning char windows
    let mut match_start = None;
    let q_len = q_lower.chars().count();
    if q_len == 0 {
        return Some(content.chars().take(150).collect());
    }
    for i in 0..=content_len.saturating_sub(q_len) {
        let window: String = content_chars[i..i + q_len].iter().collect();
        if window.to_lowercase() == q_lower {
            match_start = Some(i);
            break;
        }
    }

    // If no match was found, we want to return the beginning of the content (fallback)
    if match_start.is_none() {
        return Some(content.chars().take(150).collect());
    }

    let start_idx = match_start.expect("Guaranteed to be Some by previous check");
    let start = start_idx.saturating_sub(50);
    let end = (start_idx + q_len + 100).min(content_len);

    let snippet: String = content_chars[start..end].iter().collect();
    let prefix = if start > 0 { "..." } else { "" };
    let suffix = if end < content_len { "..." } else { "" };
    Some(format!("{}{}{}", prefix, snippet, suffix))
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
