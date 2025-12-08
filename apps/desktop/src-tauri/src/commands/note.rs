use crate::state::DbConnection;
use core_rs::note::*;
use core_rs::search::{EntityType, SearchFilters, SearchQuery, SearchResult, SortOptions};
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn create_note_cmd(
    db: State<DbConnection>,
    space_id: String,
    title: String,
    content: String,
) -> Result<Note, String> {
    crate::with_db!(db, conn, {
        core_rs::note::create_note(&conn, &space_id, &title, &content).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_note_cmd(db: State<DbConnection>, id: String) -> Result<Option<Note>, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::note::get_note(&conn, core_rs::note::DbUlid(id)).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_note_content_cmd(
    db: State<DbConnection>,
    id: String,
    title: String,
    content: String,
) -> Result<(), String> {
    crate::with_db_mut!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::note::update_note_content(&mut conn, core_rs::note::DbUlid(id), &title, &content)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn trash_note_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::note::trash_note(&conn, core_rs::note::DbUlid(id)).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_all_notes_in_space_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<Note>, String> {
    crate::with_db!(db, conn, {
        core_rs::note::get_all_notes_in_space(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recent_notes_cmd(
    db: State<DbConnection>,
    space_id: String,
    limit: u32,
) -> Result<Vec<Note>, String> {
    crate::with_db!(db, conn, {
        core_rs::note::get_recent_notes(&conn, &space_id, limit).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_or_create_daily_note_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Note, String> {
    crate::with_db!(db, conn, {
        core_rs::note::get_or_create_daily_note(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_notes_cmd(
    db: State<DbConnection>,
    query: String,
    scope: Option<String>,
) -> Result<Vec<SearchResult>, String> {
    crate::with_db!(db, conn, {
        let scope_str = scope.as_deref().unwrap_or("");
        let search_query = SearchQuery {
            query,
            entity_types: vec![EntityType::Note],
            filters: SearchFilters {
                space_id: if !scope_str.is_empty() {
                    Some(Ulid::from_string(scope_str).unwrap_or_default())
                } else {
                    None
                },
                ..Default::default()
            },
            sort: SortOptions::default(),
            limit: Some(50),
            offset: None,
        };
        core_rs::search::search_all(&conn, &search_query).map_err(|e| e.to_string())
    })
}
