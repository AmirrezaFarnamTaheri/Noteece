use crate::state::DbConnection;
use core_rs::social::{
    AnalyticsOverview, SocialAccount, SocialCategory, SocialPost, TimelinePost, TimelineStats,
    WebViewSession,
};
use tauri::State;

#[tauri::command]
pub fn add_social_account_cmd(
    db: State<DbConnection>,
    space_id: String,
    platform: String,
    username: String,
) -> Result<SocialAccount, String> {
    crate::with_db!(db, conn, {
        core_rs::social::add_social_account(
            &conn,
            &space_id,
            &platform,
            &username,
            None,
            "unknown",
            &[],
        )
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_social_accounts_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<SocialAccount>, String> {
    crate::with_db!(db, conn, {
        core_rs::social::get_social_accounts(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_social_account_cmd(
    db: State<DbConnection>,
    account_id: String,
) -> Result<SocialAccount, String> {
    crate::with_db!(db, conn, {
        core_rs::social::get_social_account(&conn, &account_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Social account not found".to_string())
    })
}

#[tauri::command]
pub fn update_social_account_cmd(
    db: State<DbConnection>,
    account_id: String,
    username: String,
    cookies: Option<String>,
) -> Result<SocialAccount, String> {
    crate::with_db!(db, conn, {
        let dek_guard = db
            .dek
            .lock()
            .map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice());

        let params = core_rs::social::UpdateSocialAccountParams {
            account_id: &account_id,
            enabled: None,
            sync_frequency_minutes: None,
            display_name: None,
            username: Some(&username),
            credentials: cookies.as_deref(),
            dek,
        };

        core_rs::social::update_social_account(&conn, params).map_err(|e| e.to_string())?;

        core_rs::social::get_social_account(&conn, &account_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Social account not found".to_string())
    })
}

#[tauri::command]
pub fn delete_social_account_cmd(
    db: State<DbConnection>,
    account_id: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::social::delete_social_account(&conn, &account_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn store_social_posts_cmd(
    db: State<DbConnection>,
    account_id: String,
    posts: Vec<SocialPost>,
) -> Result<(), String> {
    crate::with_db_mut!(db, conn, {
        core_rs::social::store_social_posts(&mut conn, &account_id, posts)
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_unified_timeline_cmd(
    db: State<DbConnection>,
    space_id: String,
    limit: u32,
) -> Result<Vec<TimelinePost>, String> {
    crate::with_db!(db, conn, {
        let filters = core_rs::social::TimelineFilters {
            limit: Some(limit as i64),
            ..Default::default()
        };
        core_rs::social::get_unified_timeline(&conn, &space_id, filters).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_category_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    rules: String,
) -> Result<SocialCategory, String> {
    crate::with_db!(db, conn, {
        let filters: Option<core_rs::social::CategoryFilters> = serde_json::from_str(&rules).ok();
        core_rs::social::create_category(&conn, &space_id, &name, None, None, filters)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_categories_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<SocialCategory>, String> {
    crate::with_db!(db, conn, {
        core_rs::social::get_categories(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn assign_category_cmd(
    db: State<DbConnection>,
    post_id: String,
    category_id: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::social::assign_category(&conn, &post_id, &category_id, "manual")
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_category_cmd(db: State<DbConnection>, category_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::social::delete_category(&conn, &category_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_timeline_stats_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<TimelineStats, String> {
    crate::with_db!(db, conn, {
        core_rs::social::get_timeline_stats(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_analytics_overview_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<AnalyticsOverview, String> {
    crate::with_db!(db, conn, {
        let now = chrono::Utc::now().timestamp();
        core_rs::social::get_analytics_overview(&conn, &space_id, now - 30 * 24 * 60 * 60)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_social_posts_cmd(
    db: State<DbConnection>,
    query: String,
    space_id: String,
) -> Result<Vec<SocialPost>, String> {
    crate::with_db!(db, conn, {
        core_rs::social::search_social_posts(&conn, &query, &space_id, None)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn auto_categorize_posts_cmd(db: State<DbConnection>, space_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::social::auto_categorize_posts(&conn, &space_id).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn create_webview_session_cmd(
    db: State<DbConnection>,
    account_id: String,
) -> Result<WebViewSession, String> {
    crate::with_db!(db, conn, {
        core_rs::social::create_webview_session(&conn, &account_id, "Mozilla/5.0", &[])
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_webview_session_cmd(
    db: State<DbConnection>,
    session_id: String,
) -> Result<WebViewSession, String> {
    crate::with_db!(db, conn, {
        core_rs::social::get_webview_session(&conn, &session_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Session not found".to_string())
    })
}

#[tauri::command]
pub fn save_session_cookies_cmd(
    db: State<DbConnection>,
    session_id: String,
    cookies: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::social::save_session_cookies(&conn, &session_id, &cookies, &[])
            .map_err(|e| e.to_string())
    })
}
