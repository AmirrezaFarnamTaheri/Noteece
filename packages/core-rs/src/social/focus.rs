/**
 * Focus Modes & Automation Module
 *
 * Provides focus mode presets with platform restrictions, time limits,
 * and automation rules to help users maintain healthy social media habits.
 */
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use super::account::SocialError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusMode {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub is_active: bool,
    pub blocked_platforms: Vec<String>,
    pub allowed_platforms: Vec<String>,
    pub time_limits: Vec<TimeLimit>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeLimit {
    pub platform: String,
    pub daily_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationRule {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub trigger_type: TriggerType,
    pub trigger_value: String,
    pub action_type: ActionType,
    pub action_value: String,
    pub enabled: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TriggerType {
    TimeOfDay,    // e.g., "09:00"
    DayOfWeek,    // e.g., "monday"
    PlatformOpen, // e.g., "twitter"
    CategoryPost, // e.g., "work"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    ActivateFocusMode, // value = focus_mode_id
    DisableSync,       // value = platform
    SendNotification,  // value = message
    AutoCategorize,    // value = category_id
}

/// Create a focus mode
pub fn create_focus_mode(
    conn: &Connection,
    space_id: &str,
    name: &str,
    description: Option<&str>,
    icon: Option<&str>,
    blocked_platforms: Vec<String>,
    allowed_platforms: Vec<String>,
) -> Result<FocusMode, SocialError> {
    log::debug!(
        "[Social::Focus] Creating focus mode '{}' for space {} - blocked: {:?}, allowed: {:?}",
        name,
        space_id,
        blocked_platforms,
        allowed_platforms
    );

    let id = ulid::Ulid::new().to_string();
    let now = Utc::now().timestamp_millis();

    let blocked_json = serde_json::to_string(&blocked_platforms)?;
    let allowed_json = serde_json::to_string(&allowed_platforms)?;

    conn.execute(
        "INSERT INTO social_focus_mode (
            id, space_id, name, description, icon, is_active,
            blocked_platforms, allowed_platforms, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8)",
        params![
            &id,
            space_id,
            name,
            description,
            icon,
            &blocked_json,
            &allowed_json,
            now
        ],
    )?;

    log::info!(
        "[Social::Focus] Created focus mode '{}' with ID {}",
        name,
        id
    );

    Ok(FocusMode {
        id,
        space_id: space_id.to_string(),
        name: name.to_string(),
        description: description.map(String::from),
        icon: icon.map(String::from),
        is_active: false,
        blocked_platforms,
        allowed_platforms,
        time_limits: Vec::new(),
        created_at: now,
    })
}

/// Get all focus modes for a space
pub fn get_focus_modes(conn: &Connection, space_id: &str) -> Result<Vec<FocusMode>, SocialError> {
    log::debug!("[Social::Focus] Getting focus modes for space {}", space_id);

    let mut stmt = conn.prepare(
        "SELECT id, space_id, name, description, icon, is_active,
                blocked_platforms, allowed_platforms, created_at
         FROM social_focus_mode
         WHERE space_id = ?1
         ORDER BY created_at DESC",
    )?;

    let modes = stmt
        .query_map([space_id], |row| {
            let blocked_json: String = row.get(6)?;
            let allowed_json: String = row.get(7)?;

            Ok(FocusMode {
                id: row.get(0)?,
                space_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                icon: row.get(4)?,
                is_active: row.get::<_, i32>(5)? == 1,
                blocked_platforms: serde_json::from_str(&blocked_json).unwrap_or_default(),
                allowed_platforms: serde_json::from_str(&allowed_json).unwrap_or_default(),
                time_limits: Vec::new(), // Load separately if needed
                created_at: row.get(8)?,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    log::info!(
        "[Social::Focus] Retrieved {} focus modes for space {}",
        modes.len(),
        space_id
    );

    Ok(modes)
}

/// Activate a focus mode (deactivates all others)
pub fn activate_focus_mode(
    conn: &Connection,
    focus_mode_id: &str,
    space_id: &str,
) -> Result<(), SocialError> {
    log::debug!(
        "[Social::Focus] Activating focus mode {} in space {}",
        focus_mode_id,
        space_id
    );

    // Use transaction for atomic activation with validation
    let tx = conn.transaction()?;

    // Deactivate all focus modes in the space
    tx.execute(
        "UPDATE social_focus_mode SET is_active = 0 WHERE space_id = ?1",
        [space_id],
    )?;

    // Activate the requested mode and validate it belongs to the correct space
    let rows = tx.execute(
        "UPDATE social_focus_mode SET is_active = 1 WHERE id = ?1 AND space_id = ?2",
        params![focus_mode_id, space_id],
    )?;

    if rows == 0 {
        tx.rollback()?;
        return Err(SocialError::Platform(format!(
            "Focus mode {} not found in space {}",
            focus_mode_id, space_id
        )));
    }

    tx.commit()?;

    log::info!(
        "[Social::Focus] Activated focus mode {} in space {}",
        focus_mode_id,
        space_id
    );

    Ok(())
}

/// Deactivate all focus modes
pub fn deactivate_all_focus_modes(conn: &Connection, space_id: &str) -> Result<(), SocialError> {
    log::debug!(
        "[Social::Focus] Deactivating all focus modes in space {}",
        space_id
    );

    conn.execute(
        "UPDATE social_focus_mode SET is_active = 0 WHERE space_id = ?1",
        [space_id],
    )?;

    log::info!(
        "[Social::Focus] Deactivated all focus modes in space {}",
        space_id
    );

    Ok(())
}

/// Check if a platform is blocked by active focus mode
pub fn is_platform_blocked(
    conn: &Connection,
    space_id: &str,
    platform: &str,
) -> Result<bool, SocialError> {
    log::debug!(
        "[Social::Focus] Checking if platform {} is blocked in space {}",
        platform,
        space_id
    );

    let mut stmt = conn.prepare(
        "SELECT blocked_platforms FROM social_focus_mode
         WHERE space_id = ?1 AND is_active = 1 LIMIT 1",
    )?;

    let result = stmt.query_row([space_id], |row| {
        let blocked_json: String = row.get(0)?;
        Ok(blocked_json)
    });

    let is_blocked = match result {
        Ok(blocked_json) => {
            let blocked: Vec<String> = serde_json::from_str(&blocked_json).unwrap_or_default();
            blocked.contains(&platform.to_string())
        }
        Err(_) => false, // No active focus mode
    };

    log::debug!(
        "[Social::Focus] Platform {} is {} in space {}",
        platform,
        if is_blocked { "blocked" } else { "allowed" },
        space_id
    );

    Ok(is_blocked)
}

/// Create preset focus modes for a space
pub fn create_preset_focus_modes(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<FocusMode>, SocialError> {
    log::debug!(
        "[Social::Focus] Creating preset focus modes for space {}",
        space_id
    );

    let mut presets = Vec::new();

    // Deep Work Mode
    presets.push(create_focus_mode(
        conn,
        space_id,
        "Deep Work",
        Some("Block all social media, allow work platforms"),
        Some("🧠"),
        vec![
            "twitter".to_string(),
            "instagram".to_string(),
            "tiktok".to_string(),
            "facebook".to_string(),
            "reddit".to_string(),
        ],
        vec!["linkedin".to_string(), "slack".to_string()],
    )?);

    // Social Time Mode
    presets.push(create_focus_mode(
        conn,
        space_id,
        "Social Time",
        Some("Limited access to social platforms"),
        Some("👥"),
        vec![],
        vec![
            "twitter".to_string(),
            "instagram".to_string(),
            "facebook".to_string(),
        ],
    )?);

    // Learning Mode
    presets.push(create_focus_mode(
        conn,
        space_id,
        "Learning",
        Some("Educational content only"),
        Some("📚"),
        vec![
            "instagram".to_string(),
            "tiktok".to_string(),
            "tinder".to_string(),
        ],
        vec!["youtube".to_string(), "reddit".to_string()],
    )?);

    // Detox Mode
    presets.push(create_focus_mode(
        conn,
        space_id,
        "Detox",
        Some("Block all social media"),
        Some("🌿"),
        vec![
            "twitter".to_string(),
            "instagram".to_string(),
            "tiktok".to_string(),
            "facebook".to_string(),
            "reddit".to_string(),
            "youtube".to_string(),
            "linkedin".to_string(),
        ],
        vec![],
    )?);

    log::info!(
        "[Social::Focus] Created {} preset focus modes for space {}",
        presets.len(),
        space_id
    );

    Ok(presets)
}

/// Create an automation rule
pub fn create_automation_rule(
    conn: &Connection,
    space_id: &str,
    name: &str,
    trigger_type: TriggerType,
    trigger_value: &str,
    action_type: ActionType,
    action_value: &str,
) -> Result<String, SocialError> {
    log::debug!(
        "[Social::Focus] Creating automation rule '{}' for space {} - trigger: {:?}({}), action: {:?}({})",
        name,
        space_id,
        trigger_type,
        trigger_value,
        action_type,
        action_value
    );

    let id = ulid::Ulid::new().to_string();
    let now = Utc::now().timestamp_millis();

    let trigger_type_str = match trigger_type {
        TriggerType::TimeOfDay => "time_of_day",
        TriggerType::DayOfWeek => "day_of_week",
        TriggerType::PlatformOpen => "platform_open",
        TriggerType::CategoryPost => "category_post",
    };

    let action_type_str = match action_type {
        ActionType::ActivateFocusMode => "activate_focus_mode",
        ActionType::DisableSync => "disable_sync",
        ActionType::SendNotification => "send_notification",
        ActionType::AutoCategorize => "auto_categorize",
    };

    conn.execute(
        "INSERT INTO social_automation_rule (
            id, space_id, name, trigger_type, trigger_value,
            action_type, action_value, enabled, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)",
        params![
            &id,
            space_id,
            name,
            trigger_type_str,
            trigger_value,
            action_type_str,
            action_value,
            now
        ],
    )?;

    log::info!(
        "[Social::Focus] Created automation rule '{}' with ID {}",
        name,
        id
    );

    Ok(id)
}

/// Get automation rules for a space
pub fn get_automation_rules(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<AutomationRule>, SocialError> {
    log::debug!(
        "[Social::Focus] Getting automation rules for space {}",
        space_id
    );

    let mut stmt = conn.prepare(
        "SELECT id, space_id, name, trigger_type, trigger_value,
                action_type, action_value, enabled, created_at
         FROM social_automation_rule
         WHERE space_id = ?1
         ORDER BY created_at DESC",
    )?;

    let rules = stmt
        .query_map([space_id], |row| {
            let trigger_type_str: String = row.get(3)?;
            let action_type_str: String = row.get(5)?;

            let trigger_type = match trigger_type_str.as_str() {
                "time_of_day" => TriggerType::TimeOfDay,
                "day_of_week" => TriggerType::DayOfWeek,
                "platform_open" => TriggerType::PlatformOpen,
                "category_post" => TriggerType::CategoryPost,
                _ => TriggerType::TimeOfDay,
            };

            let action_type = match action_type_str.as_str() {
                "activate_focus_mode" => ActionType::ActivateFocusMode,
                "disable_sync" => ActionType::DisableSync,
                "send_notification" => ActionType::SendNotification,
                "auto_categorize" => ActionType::AutoCategorize,
                _ => ActionType::SendNotification,
            };

            Ok(AutomationRule {
                id: row.get(0)?,
                space_id: row.get(1)?,
                name: row.get(2)?,
                trigger_type,
                trigger_value: row.get(4)?,
                action_type,
                action_value: row.get(6)?,
                enabled: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    log::info!(
        "[Social::Focus] Retrieved {} automation rules for space {}",
        rules.len(),
        space_id
    );

    Ok(rules)
}

/// Delete a focus mode
pub fn delete_focus_mode(conn: &Connection, focus_mode_id: &str) -> Result<(), SocialError> {
    log::debug!("[Social::Focus] Deleting focus mode {}", focus_mode_id);

    conn.execute(
        "DELETE FROM social_focus_mode WHERE id = ?1",
        [focus_mode_id],
    )?;

    log::info!("[Social::Focus] Deleted focus mode {}", focus_mode_id);

    Ok(())
}

/// Toggle automation rule
pub fn toggle_automation_rule(
    conn: &Connection,
    rule_id: &str,
    enabled: bool,
) -> Result<(), SocialError> {
    log::debug!(
        "[Social::Focus] Toggling automation rule {} to {}",
        rule_id,
        if enabled { "enabled" } else { "disabled" }
    );

    conn.execute(
        "UPDATE social_automation_rule SET enabled = ?1 WHERE id = ?2",
        params![if enabled { 1 } else { 0 }, rule_id],
    )?;

    log::info!(
        "[Social::Focus] Automation rule {} is now {}",
        rule_id,
        if enabled { "enabled" } else { "disabled" }
    );

    Ok(())
}
