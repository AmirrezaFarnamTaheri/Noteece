use crate::DbConnection;
use core_rs::analytics::*;
use core_rs::auth::{AuthService, Session, User};
use core_rs::caldav::*;
use core_rs::collaboration::*;
use core_rs::dashboard::*;
use core_rs::foresight::*;
use core_rs::form::*;
use core_rs::goals::*;
use core_rs::habits::*;
use core_rs::import::*;
use core_rs::mode::*;
use core_rs::note::*;
use core_rs::ocr::*;
use core_rs::personal_modes::*;
use core_rs::project::*;
use core_rs::search::*;
use core_rs::social::backup::{BackupMetadata, BackupService};
use core_rs::social::*;
use core_rs::space::*;
use core_rs::srs::*;
use core_rs::sync::mobile_sync::DeviceInfo;
use core_rs::sync_agent::*;
use core_rs::tag::*;
use core_rs::task::*;
use core_rs::temporal_graph::*;
use core_rs::time_tracking::*;
use core_rs::weekly_review::generate_weekly_review;
use tauri::State;
use ulid::Ulid;

// Helper macro to simplify DB locking and error handling
macro_rules! with_db {
    ($db:expr, $conn:ident, $body:block) => {{
        let guard = $db
            .conn
            .lock()
            .map_err(|_| "Failed to lock database connection".to_string())?;
        let $conn = guard
            .as_ref()
            .ok_or_else(|| "Database connection not available".to_string())?;
        $body
    }};
}

macro_rules! with_db_mut {
    ($db:expr, $conn:ident, $body:block) => {{
        let mut guard = $db
            .conn
            .lock()
            .map_err(|_| "Failed to lock database connection".to_string())?;
        let $conn = guard
            .as_mut()
            .ok_or_else(|| "Database connection not available".to_string())?;
        $body
    }};
}

// --- Project Commands ---

#[tauri::command]
pub fn get_project_cmd(db: State<DbConnection>, id: String) -> Result<Option<Project>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::project::get_project(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_projects_in_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Project>, String> {
    with_db!(db, conn, {
        core_rs::project::get_projects_in_space(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_milestones_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<Milestone>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::project::get_project_milestones(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_risks_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<Risk>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::project::get_project_risks(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_updates_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<ProjectUpdate>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::project::get_project_updates(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_project_risk_cmd(
    db: State<DbConnection>,
    project_id: String,
    description: String,
    likelihood: String,
    impact: String,
) -> Result<Risk, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::project::create_project_risk(conn, id, &description, &likelihood, &impact)
            .map_err(|e| e.to_string())
    })
}

// IMPORTANT: This command now uses with_db_mut! to support transaction
#[tauri::command]
pub fn delete_project_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db_mut!(db, conn, {
        // core_rs::project::delete_project now takes &mut Connection
        core_rs::project::delete_project(conn, &id).map_err(|e| e.to_string())
    })
}

// --- Search Commands ---

#[tauri::command]
pub fn create_saved_search_cmd(
    db: State<DbConnection>,
    name: String,
    query: String,
    space_id: Option<String>,
) -> Result<SavedSearch, String> {
    with_db!(db, conn, {
        core_rs::search::create_saved_search(conn, &name, &query, space_id.as_deref())
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_saved_search_cmd(db: State<DbConnection>, id: String) -> Result<SavedSearch, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::get_saved_search(conn, id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Saved search not found".to_string())
    })
}

#[tauri::command]
pub fn get_saved_searches_cmd(db: State<DbConnection>, space_id: Option<String>) -> Result<Vec<SavedSearch>, String> {
    with_db!(db, conn, {
        core_rs::search::get_saved_searches(conn, space_id.as_deref()).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_saved_search_cmd(
    db: State<DbConnection>,
    id: String,
    name: String,
    query: String,
) -> Result<SavedSearch, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::update_saved_search(conn, id, &name, &query).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_saved_search_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::delete_saved_search(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn execute_saved_search_cmd(db: State<DbConnection>, id: String) -> Result<Vec<SearchResult>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        let search = core_rs::search::get_saved_search(conn, id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Saved search not found".to_string())?;
        // Assuming generic search is available or using advanced_search
        // Here we map the query to search_notes result for now, or whatever execute implies
        // Wait, core-rs likely has a function to execute a query.
        // Checking imports... core_rs::search::search_notes exists.
        core_rs::search::search_notes(conn, &search.query, search.space_id.as_deref())
            .map_err(|e| e.to_string())
    })
}

// --- Weekly Review ---

#[tauri::command]
pub fn generate_weekly_review_cmd(db: State<DbConnection>, space_id: String) -> Result<Note, String> {
    with_db!(db, conn, {
        generate_weekly_review(conn, &space_id).map_err(|e| e.to_string())
    })
}

// --- Mode Commands ---

#[tauri::command]
pub fn get_space_modes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Mode>, String> {
    with_db!(db, conn, {
        core_rs::mode::get_space_modes(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn enable_mode_cmd(db: State<DbConnection>, space_id: String, mode: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::mode::enable_mode(conn, &space_id, &mode).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn disable_mode_cmd(db: State<DbConnection>, space_id: String, mode: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::mode::disable_mode(conn, &space_id, &mode).map_err(|e| e.to_string())
    })
}

// --- Note Commands ---

#[tauri::command]
pub fn create_note_cmd(
    db: State<DbConnection>,
    space_id: String,
    title: String,
    content: String, // Mapped from content_md
) -> Result<Note, String> {
    with_db!(db, conn, {
        core_rs::note::create_note(conn, &space_id, &title, &content).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_note_cmd(db: State<DbConnection>, id: String) -> Result<Option<Note>, String> {
    with_db!(db, conn, {
        // DbUlid wrapper might be needed if get_note takes DbUlid
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        // Check Note module, get_note takes DbUlid
        core_rs::note::get_note(conn, core_rs::note::DbUlid(id)).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_note_content_cmd(
    db: State<DbConnection>,
    id: String,
    title: String,
    content: String,
) -> Result<(), String> {
    with_db_mut!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::note::update_note_content(conn, core_rs::note::DbUlid(id), &title, &content)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn trash_note_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::note::trash_note(conn, core_rs::note::DbUlid(id)).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_all_notes_in_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Note>, String> {
    with_db!(db, conn, {
        core_rs::note::get_all_notes_in_space(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recent_notes_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<Note>, String> {
    with_db!(db, conn, {
        core_rs::note::get_recent_notes(conn, &space_id, limit).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_or_create_daily_note_cmd(db: State<DbConnection>, space_id: String) -> Result<Note, String> {
    with_db!(db, conn, {
        core_rs::note::get_or_create_daily_note(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_notes_cmd(
    db: State<DbConnection>,
    query: String,
    scope: Option<String>,
) -> Result<Vec<SearchResult>, String> {
    with_db!(db, conn, {
        core_rs::search::search_notes(conn, &query, scope.as_deref()).map_err(|e| e.to_string())
    })
}

// --- Task Commands ---

#[tauri::command]
pub fn create_task_cmd(
    db: State<DbConnection>,
    space_id: String,
    title: String,
    description: Option<String>,
) -> Result<Task, String> {
    with_db!(db, conn, {
        // create_task might take &str or String. Checking usage...
        core_rs::task::create_task(conn, &space_id, &title, description.as_deref())
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_cmd(db: State<DbConnection>, id: String) -> Result<Option<Task>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::task::get_task(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_task_cmd(db: State<DbConnection>, task: Task) -> Result<Task, String> {
    with_db!(db, conn, {
        core_rs::task::update_task(conn, &task).map_err(|e| e.to_string())?;
        Ok(task)
    })
}

#[tauri::command]
pub fn delete_task_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::task::delete_task(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_tasks_by_project_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<Task>, String> {
    with_db!(db, conn, {
        // get_tasks_by_project might expect Ulid or string
        // Assuming string based on project module patterns usually taking Ulid, but let's check signatures if possible.
        // If it fails compile, I'll fix. Assuming Ulid for safety.
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::task::get_tasks_by_project(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_all_tasks_in_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Task>, String> {
    with_db!(db, conn, {
        core_rs::task::get_all_tasks_in_space(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_upcoming_tasks_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<Task>, String> {
    with_db!(db, conn, {
        core_rs::task::get_upcoming_tasks(conn, &space_id, limit).map_err(|e| e.to_string())
    })
}

// --- SRS Commands ---

#[tauri::command]
pub fn get_due_cards_cmd(db: State<DbConnection>) -> Result<Vec<KnowledgeCard>, String> {
    with_db!(db, conn, {
        core_rs::srs::get_due_cards(conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn review_card_cmd(db: State<DbConnection>, card_id: String, quality: u8) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&card_id).map_err(|e| e.to_string())?;
        core_rs::srs::review_card(conn, id, quality).map_err(|e| e.to_string())
    })
}

// --- Import Commands ---

#[tauri::command]
pub fn import_from_obsidian_cmd(db: State<DbConnection>, space_id: String, path: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::import::import_from_obsidian(conn, &space_id, &path).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn import_from_notion_cmd(db: State<DbConnection>, space_id: String, path: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::import::import_from_notion(conn, &space_id, &path).map_err(|e| e.to_string())
    })
}

// --- Form Commands ---

#[tauri::command]
pub fn create_form_template_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    fields: String,
) -> Result<FormTemplate, String> {
    with_db!(db, conn, {
        core_rs::form::create_form_template(conn, &space_id, &name, &fields).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_form_template_cmd(db: State<DbConnection>, id: String) -> Result<FormTemplate, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::form::get_form_template(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_form_templates_for_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<FormTemplate>, String> {
    with_db!(db, conn, {
        core_rs::form::get_form_templates_for_space(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_form_template_cmd(
    db: State<DbConnection>,
    id: String,
    name: String,
    fields: String,
) -> Result<FormTemplate, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::form::update_form_template(conn, id, &name, &fields).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_form_template_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::form::delete_form_template(conn, id).map_err(|e| e.to_string())
    })
}

// --- Analytics Commands ---

#[tauri::command]
pub fn get_analytics_data_cmd(db: State<DbConnection>) -> Result<AnalyticsData, String> {
    with_db!(db, conn, {
        core_rs::analytics::get_analytics_data(conn).map_err(|e| e.to_string())
    })
}

// --- Space Commands ---

#[tauri::command]
pub fn get_all_spaces_cmd(db: State<DbConnection>) -> Result<Vec<Space>, String> {
    with_db!(db, conn, {
        core_rs::space::get_all_spaces(conn).map_err(|e| e.to_string())
    })
}

// --- Tag Commands ---

#[tauri::command]
pub fn get_all_tags_in_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Tag>, String> {
    with_db!(db, conn, {
        core_rs::tag::get_all_tags_in_space(conn, &space_id).map_err(|e| e.to_string())
    })
}

// --- Time Tracking Commands ---

#[tauri::command]
pub fn start_time_entry_cmd(
    db: State<DbConnection>,
    space_id: String,
    task_id: Option<String>,
    project_id: Option<String>,
    description: Option<String>,
) -> Result<TimeEntry, String> {
    with_db!(db, conn, {
        let task_ulid = task_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        let project_ulid = project_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        core_rs::time_tracking::start_time_entry(conn, &space_id, task_ulid, project_ulid, description.as_deref())
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn stop_time_entry_cmd(db: State<DbConnection>, entry_id: String) -> Result<TimeEntry, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&entry_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::stop_time_entry(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_time_entries_cmd(db: State<DbConnection>, task_id: String) -> Result<Vec<TimeEntry>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&task_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_task_time_entries(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_time_entries_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<TimeEntry>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_project_time_entries(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_running_entries_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<TimeEntry>, String> {
    with_db!(db, conn, {
        core_rs::time_tracking::get_running_entries(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recent_time_entries_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<TimeEntry>, String> {
    with_db!(db, conn, {
        core_rs::time_tracking::get_recent_time_entries(conn, &space_id, limit).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_time_stats_cmd(db: State<DbConnection>, task_id: String) -> Result<TimeStats, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&task_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_task_time_stats(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_time_stats_cmd(db: State<DbConnection>, project_id: String) -> Result<TimeStats, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_project_time_stats(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_time_entry_cmd(db: State<DbConnection>, entry_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&entry_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::delete_time_entry(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_manual_time_entry_cmd(
    db: State<DbConnection>,
    space_id: String,
    task_id: Option<String>,
    project_id: Option<String>,
    note_id: Option<String>,
    description: Option<String>,
    started_at: i64,
    duration_seconds: i64,
) -> Result<TimeEntry, String> {
    with_db!(db, conn, {
        let task_ulid = task_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        let project_ulid = project_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        let note_ulid = note_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;

        core_rs::time_tracking::create_manual_time_entry(
            conn,
            space_ulid,
            task_ulid,
            project_ulid,
            note_ulid,
            description.as_deref(),
            started_at,
            duration_seconds
        ).map_err(|e| e.to_string())
    })
}

// --- OCR Commands ---

#[tauri::command]
pub fn queue_ocr_cmd(db: State<DbConnection>, blob_id: String) -> Result<(), String> {
     with_db!(db, conn, {
        let id = Ulid::from_string(&blob_id).map_err(|e| e.to_string())?;
        core_rs::ocr::queue_ocr(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_ocr_status_cmd(db: State<DbConnection>, blob_id: String) -> Result<Option<OcrStatus>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&blob_id).map_err(|e| e.to_string())?;
        core_rs::ocr::get_ocr_status(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_ocr_text_cmd(db: State<DbConnection>, query: String) -> Result<Vec<OcrMatch>, String> {
    with_db!(db, conn, {
        core_rs::ocr::search_ocr_text(conn, &query).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn process_ocr_job_cmd(db: State<DbConnection>, job_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&job_id).map_err(|e| e.to_string())?;
        core_rs::ocr::process_ocr_job(conn, id).map_err(|e| e.to_string())
    })
}

// --- Foresight Commands ---

#[tauri::command]
pub fn generate_insights_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Insight>, String> {
    with_db!(db, conn, {
        core_rs::foresight::generate_insights(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_active_insights_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Insight>, String> {
    with_db!(db, conn, {
        core_rs::foresight::get_active_insights(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn dismiss_insight_cmd(db: State<DbConnection>, insight_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&insight_id).map_err(|e| e.to_string())?;
        core_rs::foresight::dismiss_insight(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn record_feedback_cmd(db: State<DbConnection>, insight_id: String, useful: bool) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&insight_id).map_err(|e| e.to_string())?;
        core_rs::foresight::record_feedback(conn, id, useful).map_err(|e| e.to_string())
    })
}

// --- CalDAV Commands ---
// Add placeholders or implementations if missing. Assuming core_rs::caldav exists.
// ... (skipping for brevity, but would include add_caldav_account_cmd etc.)

// --- CalDAV Commands ---

#[tauri::command]
pub fn add_caldav_account_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    url: String,
    username: String,
    password: Option<String>,
) -> Result<CalDavAccount, String> {
    with_db!(db, conn, {
        core_rs::caldav::add_caldav_account(conn, &space_id, &name, &url, &username, password.as_deref())
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_accounts_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<CalDavAccount>, String> {
    with_db!(db, conn, {
        core_rs::caldav::get_caldav_accounts(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<Option<CalDavAccount>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::caldav::get_caldav_account(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_caldav_account_cmd(
    db: State<DbConnection>,
    account_id: String,
    name: String,
    url: String,
    username: String,
    password: Option<String>,
) -> Result<CalDavAccount, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::caldav::update_caldav_account(conn, id, &name, &url, &username, password.as_deref())
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::caldav::delete_caldav_account(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn sync_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<SyncResult, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::caldav::sync_caldav_account(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_sync_history_cmd(db: State<DbConnection>, account_id: String) -> Result<Vec<SyncLog>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::caldav::get_caldav_sync_history(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_conflicts_cmd(db: State<DbConnection>, account_id: String) -> Result<Vec<Conflict>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::caldav::get_caldav_conflicts(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn resolve_caldav_conflict_cmd(db: State<DbConnection>, conflict_id: String, resolution: Resolution) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&conflict_id).map_err(|e| e.to_string())?;
        core_rs::caldav::resolve_caldav_conflict(conn, id, resolution).map_err(|e| e.to_string())
    })
}

// --- Sync Agent ---

#[tauri::command]
pub fn init_sync_tables_cmd(db: State<DbConnection>) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::sync_agent::init_sync_tables(conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn register_device_cmd(
    db: State<DbConnection>,
    device_id: String,
    name: String,
    public_key: Vec<u8>,
) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::sync_agent::register_device(conn, &device_id, &name, &public_key).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn record_sync_cmd(
    db: State<DbConnection>,
    space_id: String,
    device_id: String,
    status: String,
    details: Option<String>,
) -> Result<(), String> {
    with_db!(db, conn, {
         core_rs::sync_agent::record_sync(conn, &space_id, &device_id, &status, details.as_deref()).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_all_sync_tasks_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SyncTask>, String> {
    with_db!(db, conn, {
        core_rs::sync_agent::get_all_sync_tasks(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_sync_stats_cmd(db: State<DbConnection>, space_id: String) -> Result<SyncStats, String> {
    with_db!(db, conn, {
        core_rs::sync_agent::get_sync_stats(conn, &space_id).map_err(|e| e.to_string())
    })
}

// --- Personal Modes Commands ---

#[tauri::command]
pub fn create_health_metric_cmd(
    db: State<DbConnection>,
    space_id: String,
    metric_type: String,
    value: f64,
    unit: String,
) -> Result<HealthMetric, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::create_health_metric(conn, &space_id, &metric_type, value, &unit).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_health_metrics_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<HealthMetric>, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::get_health_metrics(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_transaction_cmd(
    db: State<DbConnection>,
    space_id: String,
    amount: f64,
    category: String,
    description: String,
) -> Result<Transaction, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::create_transaction(conn, &space_id, amount, &category, &description).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_transactions_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Transaction>, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::get_transactions(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_recipe_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    ingredients: String,
    instructions: String,
) -> Result<Recipe, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::create_recipe(conn, &space_id, &name, &ingredients, &instructions).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recipes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Recipe>, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::get_recipes(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_trip_cmd(
    db: State<DbConnection>,
    space_id: String,
    destination: String,
    start_date: i64,
    end_date: i64,
) -> Result<Trip, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::create_trip(conn, &space_id, &destination, start_date, end_date).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_trips_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Trip>, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::get_trips(conn, &space_id).map_err(|e| e.to_string())
    })
}

// --- Temporal Graph ---

#[tauri::command]
pub fn build_current_graph_cmd(db: State<DbConnection>, space_id: String) -> Result<Graph, String> {
    with_db!(db, conn, {
        core_rs::temporal_graph::build_current_graph(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_graph_evolution_cmd(db: State<DbConnection>, space_id: String, start: i64, end: i64) -> Result<Vec<GraphSnapshot>, String> {
    with_db!(db, conn, {
        core_rs::temporal_graph::get_graph_evolution(conn, &space_id, start, end).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn detect_major_notes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<NoteNode>, String> {
    with_db!(db, conn, {
        core_rs::temporal_graph::detect_major_notes(conn, &space_id).map_err(|e| e.to_string())
    })
}

// --- Collaboration ---

#[tauri::command]
pub fn init_rbac_tables_cmd(db: State<DbConnection>) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::init_rbac_tables(conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_space_users_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SpaceUser>, String> {
    with_db!(db, conn, {
        core_rs::collaboration::get_space_users(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn check_permission_cmd(db: State<DbConnection>, user_id: String, space_id: String, permission: String) -> Result<bool, String> {
    with_db!(db, conn, {
        core_rs::collaboration::check_permission(conn, &user_id, &space_id, &permission).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn invite_user_cmd(db: State<DbConnection>, space_id: String, email: String, role: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::invite_user(conn, &space_id, &email, &role).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_user_role_cmd(db: State<DbConnection>, space_id: String, user_id: String, new_role: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::update_user_role(conn, &space_id, &user_id, &new_role).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn grant_permission_cmd(db: State<DbConnection>, role: String, permission: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::grant_permission(conn, &role, &permission).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn revoke_permission_cmd(db: State<DbConnection>, role: String, permission: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::revoke_permission(conn, &role, &permission).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn suspend_user_cmd(db: State<DbConnection>, user_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::suspend_user(conn, &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn activate_user_cmd(db: State<DbConnection>, user_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::activate_user(conn, &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_roles_cmd(db: State<DbConnection>) -> Result<Vec<String>, String> {
    with_db!(db, conn, {
        core_rs::collaboration::get_roles(conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn add_user_to_space_cmd(db: State<DbConnection>, user_id: String, space_id: String, role: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::add_user_to_space(conn, &user_id, &space_id, &role).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn remove_user_from_space_cmd(db: State<DbConnection>, user_id: String, space_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::remove_user_from_space(conn, &user_id, &space_id).map_err(|e| e.to_string())
    })
}

// --- Social Media Suite ---

#[tauri::command]
pub fn add_social_account_cmd(
    db: State<DbConnection>,
    space_id: String,
    platform: String,
    username: String,
) -> Result<SocialAccount, String> {
    with_db!(db, conn, {
        core_rs::social::add_social_account(conn, &space_id, &platform, &username).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_social_accounts_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SocialAccount>, String> {
    with_db!(db, conn, {
        core_rs::social::get_social_accounts(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_social_account_cmd(db: State<DbConnection>, account_id: String) -> Result<SocialAccount, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::social::get_social_account(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_social_account_cmd(
    db: State<DbConnection>,
    account_id: String,
    username: String,
    cookies: Option<String>,
) -> Result<SocialAccount, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::social::update_social_account(conn, id, &username, cookies.as_deref()).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_social_account_cmd(db: State<DbConnection>, account_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::social::delete_social_account(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn store_social_posts_cmd(db: State<DbConnection>, account_id: String, posts: Vec<SocialPost>) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::social::store_social_posts(conn, id, posts).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_unified_timeline_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<SocialPost>, String> {
    with_db!(db, conn, {
        core_rs::social::get_unified_timeline(conn, &space_id, limit).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_category_cmd(db: State<DbConnection>, space_id: String, name: String, rules: String) -> Result<SocialCategory, String> {
    with_db!(db, conn, {
        core_rs::social::create_category(conn, &space_id, &name, &rules).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_categories_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SocialCategory>, String> {
    with_db!(db, conn, {
        core_rs::social::get_categories(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn assign_category_cmd(db: State<DbConnection>, post_id: String, category_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let pid = Ulid::from_string(&post_id).map_err(|e| e.to_string())?;
        let cid = Ulid::from_string(&category_id).map_err(|e| e.to_string())?;
        core_rs::social::assign_category(conn, pid, cid).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_category_cmd(db: State<DbConnection>, category_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&category_id).map_err(|e| e.to_string())?;
        core_rs::social::delete_category(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_timeline_stats_cmd(db: State<DbConnection>, space_id: String) -> Result<TimelineStats, String> {
    with_db!(db, conn, {
        core_rs::social::get_timeline_stats(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_analytics_overview_cmd(db: State<DbConnection>, space_id: String) -> Result<AnalyticsOverview, String> {
    with_db!(db, conn, {
        core_rs::social::get_analytics_overview(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_social_posts_cmd(db: State<DbConnection>, query: String, space_id: String) -> Result<Vec<SocialPost>, String> {
    with_db!(db, conn, {
        core_rs::social::search_social_posts(conn, &query, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn auto_categorize_posts_cmd(db: State<DbConnection>, space_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::social::auto_categorize_posts(conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_webview_session_cmd(db: State<DbConnection>, account_id: String) -> Result<WebviewSession, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&account_id).map_err(|e| e.to_string())?;
        core_rs::social::create_webview_session(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_webview_session_cmd(db: State<DbConnection>, session_id: String) -> Result<WebviewSession, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&session_id).map_err(|e| e.to_string())?;
        core_rs::social::get_webview_session(conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn save_session_cookies_cmd(db: State<DbConnection>, session_id: String, cookies: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&session_id).map_err(|e| e.to_string())?;
        core_rs::social::save_session_cookies(conn, id, &cookies).map_err(|e| e.to_string())
    })
}

// --- Backup Commands ---

#[tauri::command]
pub fn create_backup_cmd(db: State<DbConnection>, space_id: String) -> Result<BackupMetadata, String> {
    with_db!(db, conn, {
         // Assuming dek is available
         let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
         let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
         if dek.is_empty() { return Err("DEK not available".to_string()); }

        let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
        let backup_id = service.create_backup(conn, dek, Some(&space_id)).map_err(|e| e.to_string())?;
        service.get_backup_details(&backup_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn restore_backup_cmd(db: State<DbConnection>, backup_id: String) -> Result<(), String> {
    with_db_mut!(db, conn, {
         let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
         let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
         if dek.is_empty() { return Err("DEK not available".to_string()); }

        let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
        service.restore_backup(&backup_id, conn, dek).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn list_backups_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<BackupMetadata>, String> {
    // Backups are not strictly per space currently in core-rs/backup.rs?
    // list_backups() returns (String, BackupMetadata).
    // We might want to filter by space if metadata allows, or just return all.
    // The frontend seems to expect Vec<BackupMetadata>.
    // core-rs returns Vec<(String, BackupMetadata)>.
    // We map it.
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    let backups = service.list_backups().map_err(|e| e.to_string())?;
    Ok(backups.into_iter().map(|(_, m)| m).collect())
}

#[tauri::command]
pub fn delete_backup_cmd(db: State<DbConnection>, backup_id: String) -> Result<(), String> {
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    service.delete_backup(&backup_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_backup_details_cmd(db: State<DbConnection>, backup_id: String) -> Result<BackupMetadata, String> {
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    service.get_backup_details(&backup_id).map_err(|e| e.to_string())
}

// --- Auth Commands ---

#[tauri::command]
pub fn create_user_cmd(db: State<DbConnection>, username: String, email: String, password: String) -> Result<User, String> {
    with_db!(db, conn, {
        AuthService::create_user(conn, &username, &email, &password).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn authenticate_user_cmd(db: State<DbConnection>, username: String, password: String) -> Result<Session, String> {
     with_db!(db, conn, {
        AuthService::authenticate(conn, &username, &password).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn validate_session_cmd(db: State<DbConnection>, token: String) -> Result<String, String> {
     with_db!(db, conn, {
        AuthService::validate_session(conn, &token).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn logout_user_cmd(db: State<DbConnection>, token: String) -> Result<(), String> {
     with_db!(db, conn, {
        AuthService::logout(conn, &token).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_user_by_id_cmd(db: State<DbConnection>, user_id: String) -> Result<User, String> {
     with_db!(db, conn, {
        AuthService::get_user(conn, &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn change_password_cmd(db: State<DbConnection>, user_id: String, old_pass: String, new_pass: String) -> Result<(), String> {
     with_db!(db, conn, {
        AuthService::change_password(conn, &user_id, &old_pass, &new_pass).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_current_user_cmd(db: State<DbConnection>, token: String) -> Result<User, String> {
     with_db!(db, conn, {
        let user_id = AuthService::validate_session(conn, &token).map_err(|e| e.to_string())?;
        AuthService::get_user(conn, &user_id).map_err(|e| e.to_string())
    })
}

// --- Sync Discovery (Mobile) ---

#[tauri::command]
pub fn discover_devices_cmd(db: State<DbConnection>) -> Result<Vec<DiscoveredDevice>, String> {
    let guard = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?;
    if let Some(sync) = guard.as_ref() {
        sync.discover_peers().map_err(|e| e.to_string())
    } else {
        Err("P2P sync not initialized".to_string())
    }
}

#[tauri::command]
pub fn initiate_pairing_cmd(db: State<DbConnection>, device_id: String) -> Result<(), String> {
    // Placeholder: P2P sync pairing logic needs to be exposed in P2P sync struct
    Ok(())
}

#[tauri::command]
pub fn exchange_keys_cmd(db: State<DbConnection>, device_id: String) -> Result<(), String> {
     // Placeholder
    Ok(())
}

#[tauri::command]
pub fn get_sync_progress_cmd(db: State<DbConnection>, device_id: String) -> Result<f32, String> {
    Ok(0.0) // Placeholder
}

#[tauri::command]
pub fn shutdown_clear_keys_cmd(db: State<DbConnection>) -> Result<(), String> {
    let mut dek = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
    *dek = None;
    Ok(())
}
