//! Compatibility commands for frontend IPC contracts.
//!
//! These handlers keep the string-based Tauri boundary aligned with the
//! currently shipped frontend. Each command either delegates to an existing
//! core implementation or derives its response from persisted application data.

use crate::state::DbConnection;
use chrono::{DateTime, Utc};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use tauri::{Manager, State};
use ulid::Ulid;

#[derive(Debug, Serialize)]
pub struct TaskSummary {
    id: String,
    title: String,
    status: String,
    priority: Option<i64>,
    due_date: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct NoteSummary {
    id: String,
    title: String,
    space_id: String,
    created_at: i64,
    updated_at: i64,
    is_pinned: bool,
}

#[derive(Debug, Serialize)]
pub struct FinanceDay {
    date: String,
    income: f64,
    expenses: f64,
}

#[derive(Debug, Serialize)]
pub struct FinanceExpense {
    category: String,
    amount: f64,
}

#[derive(Debug, Serialize)]
pub struct FinanceStats {
    total_income: f64,
    total_expenses: f64,
    net: f64,
    by_category: BTreeMap<String, f64>,
    daily_data: Vec<FinanceDay>,
    top_expenses: Vec<FinanceExpense>,
}

#[derive(Debug, Serialize)]
pub struct GamificationData {
    xp: i64,
    level: i64,
    xp_to_next_level: i64,
    streak_days: i64,
    streak_freezes: i64,
    max_streak: i64,
    total_tasks_completed: i64,
    total_habits_completed: i64,
    achievements_unlocked: i64,
    total_achievements: i64,
}

#[derive(Debug, Serialize)]
pub struct RagStatsResponse {
    total_notes: i64,
    total_chunks: i64,
}

#[derive(Debug, Deserialize)]
pub struct RagQueryRequest {
    question: String,
    space_id: Option<String>,
    max_context_chunks: Option<usize>,
    min_relevance_score: Option<f32>,
    include_metadata: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct RagChunk {
    note_id: String,
    content: String,
    metadata: BTreeMap<String, String>,
}

#[derive(Debug, Serialize)]
pub struct RagSource {
    chunk: RagChunk,
    score: f32,
}

#[derive(Debug, Serialize)]
pub struct RagQueryResponse {
    answer: String,
    sources: Vec<RagSource>,
    tokens_used: u32,
    model: String,
    confidence: f32,
}

#[derive(Debug, Serialize, Default)]
pub struct TimeDistribution {
    work: f64,
    personal: f64,
    health: f64,
    learning: f64,
    social: f64,
    creative: f64,
    rest: f64,
}

#[derive(Debug, Serialize)]
pub struct CorrelationPoint {
    timestamp: i64,
    date: String,
    metric1: f64,
    metric2: f64,
    correlation: f64,
    label: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TemporalPattern {
    id: String,
    name: String,
    description: String,
    strength: f64,
    start_time: i64,
    end_time: i64,
    data_points: Vec<CorrelationPoint>,
    #[serde(rename = "type")]
    pattern_type: String,
}

fn range_days(value: &str) -> i64 {
    match value {
        "week" => 7,
        "quarter" => 90,
        _ => 30,
    }
}

fn xp_for_level(level: i64) -> i64 {
    (100.0 * 1.5_f64.powi((level - 1).max(0) as i32)).floor() as i64
}

fn calculate_level(xp: i64) -> (i64, i64) {
    let mut level = 1_i64;
    let mut remaining = xp.max(0);
    loop {
        let required = xp_for_level(level);
        if remaining < required {
            return (level, required - remaining);
        }
        remaining -= required;
        level += 1;
        if level >= 100 {
            return (level, 0);
        }
    }
}

#[tauri::command]
pub fn get_task_summaries_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<TaskSummary>, String> {
    crate::with_db!(db, conn, {
        let mut stmt = conn
            .prepare(
                "SELECT id, title, status, priority, due_at FROM task \
                 WHERE space_id = ?1 ORDER BY updated_at DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([space_id], |row| {
                Ok(TaskSummary {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    status: row.get(2)?,
                    priority: row.get(3)?,
                    due_date: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn batch_update_tasks_cmd(
    db: State<DbConnection>,
    task_ids: Vec<String>,
    updates: serde_json::Value,
) -> Result<usize, String> {
    crate::with_db_mut!(db, conn, {
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let mut changed = 0_usize;
        for task_id in task_ids {
            Ulid::from_string(&task_id).map_err(|_| format!("Invalid task id: {task_id}"))?;
            let existing = tx
                .query_row(
                    "SELECT id, space_id, note_id, project_id, parent_task_id, title, description, \
                     status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, \
                     context, area, updated_at FROM task WHERE id = ?1",
                    [&task_id],
                    |row| core_rs::task::Task::try_from(row),
                )
                .optional()
                .map_err(|e| e.to_string())?;
            let mut task = match existing {
                Some(task) => task,
                None => return Err(format!("Task not found: {task_id}")),
            };
            if let Some(value) = updates.get("title").and_then(|v| v.as_str()) {
                task.title = value.to_string();
            }
            if let Some(value) = updates.get("description") {
                task.description = value.as_str().map(str::to_string);
            }
            if let Some(value) = updates.get("status").and_then(|v| v.as_str()) {
                task.status = value.to_string();
                if value == "done" && task.completed_at.is_none() {
                    task.completed_at = Some(Utc::now().timestamp());
                }
            }
            if let Some(value) = updates.get("priority") {
                task.priority = value.as_i64();
            }
            if let Some(value) = updates.get("due_date").or_else(|| updates.get("due_at")) {
                task.due_at = value.as_i64();
            }
            core_rs::task::update_task(&tx, &task).map_err(|e| e.to_string())?;
            changed += 1;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(changed)
    })
}

#[tauri::command]
pub fn get_note_summaries_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<NoteSummary>, String> {
    crate::with_db!(db, conn, {
        let mut stmt = conn
            .prepare(
                "SELECT id, title, space_id, created_at, modified_at FROM note \
                 WHERE space_id = ?1 AND is_trashed = 0 ORDER BY modified_at DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([space_id], |row| {
                Ok(NoteSummary {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    space_id: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    is_pinned: false,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_social_category_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    color: Option<String>,
    icon: Option<String>,
    keywords: Option<Vec<String>>,
) -> Result<core_rs::social::SocialCategory, String> {
    crate::with_db!(db, conn, {
        let filters = keywords.map(|keywords| core_rs::social::CategoryFilters {
            platforms: None,
            authors: None,
            keywords: Some(keywords),
        });
        core_rs::social::create_category(
            &conn,
            &space_id,
            &name,
            color.as_deref(),
            icon.as_deref(),
            filters,
        )
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_social_categories_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<core_rs::social::SocialCategory>, String> {
    crate::with_db!(db, conn, {
        core_rs::social::get_categories(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn assign_social_category_cmd(
    db: State<DbConnection>,
    post_id: String,
    category_id: String,
    assigned_by: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let source = match assigned_by.as_str() {
            "user" | "auto" | "ai" => assigned_by.as_str(),
            _ => return Err("assignedBy must be user, auto, or ai".to_string()),
        };
        core_rs::social::assign_category(&conn, &post_id, &category_id, source)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_social_category_cmd(
    db: State<DbConnection>,
    category_id: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::social::delete_category(&conn, &category_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_unified_timeline(
    db: State<DbConnection>,
    space_id: String,
    filters: serde_json::Value,
) -> Result<Vec<core_rs::social::TimelinePost>, String> {
    crate::with_db!(db, conn, {
        let platforms = filters
            .get("platforms")
            .and_then(|v| serde_json::from_value::<Vec<String>>(v.clone()).ok());
        let categories = filters
            .get("categories")
            .and_then(|v| serde_json::from_value::<Vec<String>>(v.clone()).ok());
        let after = filters
            .get("start_time")
            .or_else(|| filters.get("after"))
            .and_then(|v| v.as_i64());
        let before = filters
            .get("end_time")
            .or_else(|| filters.get("before"))
            .and_then(|v| v.as_i64());
        let limit = filters
            .get("limit")
            .and_then(|v| v.as_i64())
            .unwrap_or(20)
            .clamp(1, 200);
        let offset = filters
            .get("offset")
            .and_then(|v| v.as_i64())
            .unwrap_or(0)
            .max(0);
        let search = filters
            .get("search_query")
            .and_then(|v| v.as_str())
            .map(|v| v.to_lowercase())
            .filter(|v| !v.trim().is_empty());
        let core_filters = core_rs::social::TimelineFilters {
            platforms,
            categories,
            after,
            before,
            limit: Some((limit + offset).min(500)),
        };
        let mut posts = core_rs::social::get_unified_timeline(&conn, &space_id, core_filters)
            .map_err(|e| e.to_string())?;
        if let Some(search) = search {
            posts.retain(|post| {
                post.author.to_lowercase().contains(&search)
                    || post
                        .content
                        .as_ref()
                        .map(|content| content.to_lowercase().contains(&search))
                        .unwrap_or(false)
            });
        }
        Ok(posts
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect())
    })
}

#[tauri::command]
pub fn open_social_webview(
    app: tauri::AppHandle,
    db: State<DbConnection>,
    account_id: String,
) -> Result<String, String> {
    let account = crate::with_db!(db, conn, {
        core_rs::social::get_social_account(&conn, &account_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Social account not found".to_string())
    })?;
    let url = core_rs::social::get_platform_url(&account.platform);
    if url == "about:blank" {
        return Err(format!("Unsupported social platform: {}", account.platform));
    }
    let label = format!(
        "social-{}",
        account_id
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
            .collect::<String>()
    );
    if app.get_window(&label).is_some() {
        if let Some(window) = app.get_window(&label) {
            window.set_focus().map_err(|e| e.to_string())?;
        }
        return Ok(label);
    }
    let external_url = url
        .parse()
        .map_err(|e| format!("Invalid platform URL: {e}"))?;
    tauri::WindowBuilder::new(&app, &label, tauri::WindowUrl::External(external_url))
        .title(core_rs::social::get_platform_display_name(
            &account.platform,
        ))
        .build()
        .map_err(|e| e.to_string())?;
    Ok(label)
}

#[tauri::command]
pub fn get_sync_tasks_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<core_rs::sync_agent::SyncTask>, String> {
    crate::with_db!(db, conn, {
        let user_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let agent = core_rs::sync_agent::SyncAgent::new(
            user_id,
            "Desktop".to_string(),
            crate::config::AppConfig::sync_port(),
        );
        agent
            .get_all_sync_tasks(&conn, &space_id)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn sync_with_device_cmd(
    db: State<'_, DbConnection>,
    space_id: String,
    device_id: String,
) -> Result<(), String> {
    if space_id.trim().is_empty() {
        return Err("spaceId is required".to_string());
    }
    let sync = db
        .p2p_sync
        .lock()
        .map_err(|_| "Failed to lock P2P sync".to_string())?
        .clone()
        .ok_or_else(|| "P2P sync is not initialized".to_string())?;
    sync.start_sync(&device_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn complete_goal_cmd(
    db: State<DbConnection>,
    goal_id: String,
) -> Result<core_rs::goals::Goal, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&goal_id).map_err(|e| e.to_string())?;
        let target: f64 = conn
            .query_row("SELECT target FROM goal WHERE id = ?1", [&goal_id], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string())?;
        core_rs::goals::update_goal_progress(&conn, id, target).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_note_for_recipe_cmd(
    db: State<DbConnection>,
    space_id: String,
    title: String,
    metadata: serde_json::Value,
) -> Result<String, String> {
    crate::with_db!(db, conn, {
        let content = format!(
            "# {}\n\n```json\n{}\n```\n",
            title,
            serde_json::to_string_pretty(&metadata).map_err(|e| e.to_string())?
        );
        let note = core_rs::note::create_note(&conn, &space_id, &title, &content)
            .map_err(|e| e.to_string())?;
        Ok(note.id.to_string())
    })
}

#[tauri::command]
pub fn create_note_for_trip_cmd(
    db: State<DbConnection>,
    space_id: String,
    title: String,
    metadata: serde_json::Value,
) -> Result<String, String> {
    crate::with_db!(db, conn, {
        let content = format!(
            "# {}\n\n```json\n{}\n```\n",
            title,
            serde_json::to_string_pretty(&metadata).map_err(|e| e.to_string())?
        );
        let note = core_rs::note::create_note(&conn, &space_id, &title, &content)
            .map_err(|e| e.to_string())?;
        Ok(note.id.to_string())
    })
}

#[tauri::command]
pub fn get_finance_stats_cmd(
    db: State<DbConnection>,
    space_id: String,
    time_range: String,
) -> Result<FinanceStats, String> {
    crate::with_db!(db, conn, {
        let since = Utc::now().timestamp() - range_days(&time_range) * 86_400;
        let transactions = core_rs::personal_modes::get_transactions_since(&conn, &space_id, since)
            .map_err(|e| e.to_string())?;
        let mut total_income = 0.0;
        let mut total_expenses = 0.0;
        let mut by_category = BTreeMap::<String, f64>::new();
        let mut daily = BTreeMap::<String, (f64, f64)>::new();
        for transaction in transactions {
            let date = DateTime::from_timestamp(transaction.date, 0)
                .map(|value| value.date_naive().to_string())
                .unwrap_or_else(|| "unknown".to_string());
            let entry = daily.entry(date).or_insert((0.0, 0.0));
            if transaction.transaction_type == "income" {
                total_income += transaction.amount;
                entry.0 += transaction.amount;
            } else {
                total_expenses += transaction.amount;
                entry.1 += transaction.amount;
                *by_category.entry(transaction.category).or_insert(0.0) += transaction.amount;
            }
        }
        let mut top_expenses = by_category
            .iter()
            .map(|(category, amount)| FinanceExpense {
                category: category.clone(),
                amount: *amount,
            })
            .collect::<Vec<_>>();
        top_expenses.sort_by(|a, b| {
            b.amount
                .partial_cmp(&a.amount)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        top_expenses.truncate(5);
        let daily_data = daily
            .into_iter()
            .map(|(date, (income, expenses))| FinanceDay {
                date,
                income,
                expenses,
            })
            .collect();
        Ok(FinanceStats {
            total_income,
            total_expenses,
            net: total_income - total_expenses,
            by_category,
            daily_data,
            top_expenses,
        })
    })
}

#[tauri::command]
pub fn get_gamification_data_cmd(
    db: State<DbConnection>,
    user_id: Option<String>,
) -> Result<GamificationData, String> {
    crate::with_db!(db, conn, {
        let _ = user_id;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS gamification_state (\
                 user_id TEXT PRIMARY KEY, streak_freezes INTEGER NOT NULL DEFAULT 0\
             );",
        )
        .map_err(|e| e.to_string())?;
        let completed_tasks: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM task WHERE status = 'done'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let habit_completions: i64 = conn
            .query_row("SELECT COUNT(*) FROM habit_log", [], |row| row.get(0))
            .unwrap_or(0);
        let (current_streak, max_streak): (i64, i64) = conn
            .query_row(
                "SELECT COALESCE(MAX(streak), 0), COALESCE(MAX(longest_streak), 0) FROM habit",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|e| e.to_string())?;
        let key = user_id.unwrap_or_else(|| "default".to_string());
        let freezes: i64 = conn
            .query_row(
                "SELECT streak_freezes FROM gamification_state WHERE user_id = ?1",
                [&key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
            .unwrap_or(0);
        let xp = completed_tasks * 20 + habit_completions * 10;
        let (level, xp_to_next_level) = calculate_level(xp);
        let achievements_unlocked = [
            completed_tasks >= 1,
            completed_tasks >= 10,
            habit_completions >= 1,
            habit_completions >= 10,
            current_streak >= 7,
            max_streak >= 30,
        ]
        .iter()
        .filter(|value| **value)
        .count() as i64;
        Ok(GamificationData {
            xp,
            level,
            xp_to_next_level,
            streak_days: current_streak,
            streak_freezes: freezes,
            max_streak,
            total_tasks_completed: completed_tasks,
            total_habits_completed: habit_completions,
            achievements_unlocked,
            total_achievements: 6,
        })
    })
}

#[tauri::command]
pub fn use_streak_freeze_cmd(
    db: State<DbConnection>,
    user_id: Option<String>,
) -> Result<i64, String> {
    crate::with_db!(db, conn, {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS gamification_state (\
                 user_id TEXT PRIMARY KEY, streak_freezes INTEGER NOT NULL DEFAULT 0\
             );",
        )
        .map_err(|e| e.to_string())?;
        let key = user_id.unwrap_or_else(|| "default".to_string());
        let available: i64 = conn
            .query_row(
                "SELECT streak_freezes FROM gamification_state WHERE user_id = ?1",
                [&key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
            .unwrap_or(0);
        if available <= 0 {
            return Err("No streak freeze is available".to_string());
        }
        conn.execute(
            "UPDATE gamification_state SET streak_freezes = streak_freezes - 1 WHERE user_id = ?1",
            [&key],
        )
        .map_err(|e| e.to_string())?;
        Ok(available - 1)
    })
}

#[tauri::command]
pub fn get_rag_stats_cmd(db: State<DbConnection>) -> Result<RagStatsResponse, String> {
    crate::with_db!(db, conn, {
        let total_notes: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM note WHERE is_trashed = 0",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(RagStatsResponse {
            total_notes,
            total_chunks: total_notes,
        })
    })
}

#[tauri::command]
pub fn rag_query_cmd(
    db: State<DbConnection>,
    query: RagQueryRequest,
) -> Result<RagQueryResponse, String> {
    crate::with_db!(db, conn, {
        let question = query.question.trim();
        if question.is_empty() {
            return Err("Question cannot be empty".to_string());
        }
        let limit = query.max_context_chunks.unwrap_or(5).clamp(1, 20) as i64;
        let pattern = format!("%{}%", question.replace('%', "\\%").replace('_', "\\_"));
        let mut sql = String::from(
            "SELECT id, title, content_md FROM note WHERE is_trashed = 0 \
             AND (title LIKE ?1 ESCAPE '\\' OR content_md LIKE ?1 ESCAPE '\\')",
        );
        if query.space_id.is_some() {
            sql.push_str(" AND space_id = ?2");
        }
        sql.push_str(" ORDER BY modified_at DESC LIMIT ?3");
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let mut sources = Vec::new();
        if let Some(space_id) = query.space_id.as_ref() {
            let rows = stmt
                .query_map(rusqlite::params![pattern, space_id, limit], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                })
                .map_err(|e| e.to_string())?;
            for (index, row) in rows.enumerate() {
                let (note_id, title, content) = row.map_err(|e| e.to_string())?;
                let mut metadata = BTreeMap::new();
                if query.include_metadata.unwrap_or(true) {
                    metadata.insert("title".to_string(), title);
                }
                sources.push(RagSource {
                    chunk: RagChunk {
                        note_id,
                        content,
                        metadata,
                    },
                    score: 1.0 / (index as f32 + 1.0),
                });
            }
        } else {
            let rows = stmt
                .query_map(
                    rusqlite::params![pattern, rusqlite::types::Null, limit],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                        ))
                    },
                )
                .map_err(|e| e.to_string())?;
            for (index, row) in rows.enumerate() {
                let (note_id, title, content) = row.map_err(|e| e.to_string())?;
                let mut metadata = BTreeMap::new();
                if query.include_metadata.unwrap_or(true) {
                    metadata.insert("title".to_string(), title);
                }
                sources.push(RagSource {
                    chunk: RagChunk {
                        note_id,
                        content,
                        metadata,
                    },
                    score: 1.0 / (index as f32 + 1.0),
                });
            }
        }
        let minimum = query.min_relevance_score.unwrap_or(0.0);
        sources.retain(|source| source.score >= minimum);
        if sources.is_empty() {
            return Err("No relevant notes found".to_string());
        }
        let answer = sources
            .iter()
            .enumerate()
            .map(|(index, source)| {
                let preview = source.chunk.content.chars().take(400).collect::<String>();
                format!("[Source {}] {}", index + 1, preview)
            })
            .collect::<Vec<_>>()
            .join("\n\n");
        let confidence = sources.first().map(|source| source.score).unwrap_or(0.0);
        Ok(RagQueryResponse {
            answer,
            sources,
            tokens_used: 0,
            model: "local-retrieval".to_string(),
            confidence,
        })
    })
}

#[tauri::command]
pub fn get_time_distribution_cmd(
    db: State<DbConnection>,
    space_id: String,
    time_range: String,
) -> Result<TimeDistribution, String> {
    crate::with_db!(db, conn, {
        let since = Utc::now().timestamp() - range_days(&time_range) * 86_400;
        let now = Utc::now().timestamp();
        let mut stmt = conn
            .prepare(
                "SELECT LOWER(COALESCE(t.area, 'personal')), \
                        SUM(COALESCE(te.duration_seconds, CASE WHEN te.is_running = 1 THEN ?3 - te.started_at ELSE 0 END)) \
                 FROM time_entry te LEFT JOIN task t ON te.task_id = t.id \
                 WHERE te.space_id = ?1 AND te.started_at >= ?2 GROUP BY LOWER(COALESCE(t.area, 'personal'))",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![space_id, since, now], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            })
            .map_err(|e| e.to_string())?;
        let mut result = TimeDistribution::default();
        for row in rows {
            let (area, seconds) = row.map_err(|e| e.to_string())?;
            let hours = seconds.max(0) as f64 / 3600.0;
            match area.as_str() {
                "work" | "career" | "project" => result.work += hours,
                "health" | "fitness" => result.health += hours,
                "learning" | "study" | "education" => result.learning += hours,
                "social" | "relationships" => result.social += hours,
                "creative" | "creativity" => result.creative += hours,
                "rest" | "sleep" => result.rest += hours,
                _ => result.personal += hours,
            }
        }
        Ok(result)
    })
}

fn pearson(values: &[(i64, String, f64, f64)]) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }
    let count = values.len() as f64;
    let mean_x = values.iter().map(|value| value.2).sum::<f64>() / count;
    let mean_y = values.iter().map(|value| value.3).sum::<f64>() / count;
    let numerator = values
        .iter()
        .map(|value| (value.2 - mean_x) * (value.3 - mean_y))
        .sum::<f64>();
    let denominator_x = values
        .iter()
        .map(|value| (value.2 - mean_x).powi(2))
        .sum::<f64>();
    let denominator_y = values
        .iter()
        .map(|value| (value.3 - mean_y).powi(2))
        .sum::<f64>();
    let denominator = (denominator_x * denominator_y).sqrt();
    if denominator == 0.0 {
        0.0
    } else {
        (numerator / denominator).clamp(-1.0, 1.0)
    }
}

#[tauri::command]
pub fn get_temporal_correlations_cmd(
    db: State<DbConnection>,
    space_id: String,
    metric1: String,
    metric2: String,
    time_range: String,
) -> Result<Vec<TemporalPattern>, String> {
    crate::with_db!(db, conn, {
        let since = Utc::now().timestamp() - range_days(&time_range) * 86_400;
        let mut stmt = conn
            .prepare(
                "SELECT date(recorded_at, 'unixepoch') AS day, MIN(recorded_at), metric_type, AVG(value) \
                 FROM health_metric WHERE space_id = ?1 AND recorded_at >= ?2 \
                 AND metric_type IN (?3, ?4) GROUP BY day, metric_type ORDER BY day",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(
                rusqlite::params![space_id, since, metric1, metric2],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, f64>(3)?,
                    ))
                },
            )
            .map_err(|e| e.to_string())?;
        let mut days: BTreeMap<String, (i64, Option<f64>, Option<f64>)> = BTreeMap::new();
        for row in rows {
            let (day, timestamp, metric, value) = row.map_err(|e| e.to_string())?;
            let entry = days.entry(day).or_insert((timestamp, None, None));
            if metric == metric1 {
                entry.1 = Some(value);
            } else if metric == metric2 {
                entry.2 = Some(value);
            }
        }
        let paired = days
            .into_iter()
            .filter_map(|(date, (timestamp, first, second))| match (first, second) {
                (Some(first), Some(second)) => Some((timestamp, date, first, second)),
                _ => None,
            })
            .collect::<Vec<_>>();
        if paired.len() < 2 {
            return Ok(Vec::new());
        }
        let correlation = pearson(&paired);
        let points = paired
            .iter()
            .map(|(timestamp, date, first, second)| CorrelationPoint {
                timestamp: *timestamp,
                date: date.clone(),
                metric1: *first,
                metric2: *second,
                correlation,
                label: None,
            })
            .collect::<Vec<_>>();
        let start_time = paired.first().map(|value| value.0).unwrap_or(since);
        let end_time = paired.last().map(|value| value.0).unwrap_or(start_time);
        let pattern_type = if correlation >= 0.0 {
            "positive"
        } else {
            "negative"
        };
        Ok(vec![TemporalPattern {
            id: format!("{}-{}-{}", metric1, metric2, start_time),
            name: format!("{} vs {}", metric1, metric2),
            description: format!(
                "Pearson correlation over {} paired daily observations",
                paired.len()
            ),
            strength: correlation.abs(),
            start_time,
            end_time,
            data_points: points,
            pattern_type: pattern_type.to_string(),
        }])
    })
}

#[tauri::command]
pub fn record_insight_feedback_cmd(
    db: State<DbConnection>,
    insight_id: String,
    action_taken: bool,
    action_type: Option<String>,
    feedback_type: String,
) -> Result<(), String> {
    let _ = action_type;
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&insight_id).map_err(|e| e.to_string())?;
        let useful = action_taken && feedback_type != "dismissed";
        core_rs::foresight::record_feedback(&conn, id, useful).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn process_ocr_cmd(
    db: State<DbConnection>,
    image_path: String,
    language: Option<String>,
) -> Result<String, String> {
    let bytes = fs::read(&image_path).map_err(|e| format!("Failed to read image: {e}"))?;
    if bytes.is_empty() {
        return Err("Image file is empty".to_string());
    }
    let vault_path = db
        .vault_path
        .lock()
        .map_err(|_| "Failed to lock vault path".to_string())?
        .clone()
        .ok_or_else(|| "Vault path is not available".to_string())?;
    let dek = db
        .dek
        .lock()
        .map_err(|_| "Failed to lock DEK".to_string())?
        .clone()
        .ok_or_else(|| "Vault is locked".to_string())?;
    let blob_id = core_rs::blob::store_blob(&vault_path.to_string_lossy(), dek.as_slice(), &bytes)
        .map_err(|e| e.to_string())?;
    crate::with_db!(db, conn, {
        core_rs::ocr::queue_ocr(&conn, &blob_id).map_err(|e| e.to_string())?;
        core_rs::ocr::process_ocr_job(
            &conn,
            &blob_id,
            std::path::Path::new(&image_path),
            language.as_deref(),
        )
        .map_err(|e| e.to_string())?;
        Ok(blob_id)
    })
}
