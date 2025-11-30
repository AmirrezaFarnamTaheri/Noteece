use crate::state::DbConnection;
use core_rs::search::*;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn create_saved_search_cmd(
    db: State<DbConnection>,
    name: String,
    query: String,
    space_id: Option<String>,
) -> Result<SavedSearch, String> {
    crate::with_db!(db, conn, {
        core_rs::search::create_saved_search(&conn, &name, &query, space_id.as_deref())
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_saved_search_cmd(db: State<DbConnection>, id: String) -> Result<SavedSearch, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::get_saved_search(&conn, id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Saved search not found".to_string())
    })
}

#[tauri::command]
pub fn get_saved_searches_cmd(
    db: State<DbConnection>,
    space_id: Option<String>,
) -> Result<Vec<SavedSearch>, String> {
    crate::with_db!(db, conn, {
        core_rs::search::get_saved_searches(&conn, space_id.as_deref()).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_saved_search_cmd(
    db: State<DbConnection>,
    id: String,
    name: String,
    query: String,
) -> Result<SavedSearch, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::update_saved_search(&conn, id, &name, &query).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_saved_search_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::delete_saved_search(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn execute_saved_search_cmd(
    db: State<DbConnection>,
    id: String,
) -> Result<Vec<SearchResult>, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        let search = core_rs::search::get_saved_search(&conn, id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Saved search not found".to_string())?;

        use core_rs::search::{EntityType, SearchFilters, SearchQuery, SortOptions};
        let space_ulid = search
            .space_id
            .as_deref()
            .map(|s| Ulid::from_string(s).unwrap_or_default());

        let query = SearchQuery {
            query: search.query,
            entity_types: vec![EntityType::Note],
            filters: SearchFilters {
                space_id: space_ulid,
                ..Default::default()
            },
            sort: SortOptions::default(),
            limit: Some(50),
            offset: None,
        };
        core_rs::search::search_all(&conn, &query).map_err(|e| e.to_string())
    })
}
