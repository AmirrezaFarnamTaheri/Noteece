/**
 * Social Media Sync Scheduler
 *
 * Manages background synchronization of social media accounts
 */
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use super::account::{SocialAccount, SocialError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncTask {
    pub account_id: String,
    pub platform: String,
    pub username: String,
    pub last_sync: Option<i64>,
    pub sync_frequency_minutes: i64,
    pub next_sync: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub account_id: String,
    pub status: String, // "pending", "in_progress", "completed", "failed"
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub error_message: Option<String>,
    pub posts_extracted: i64,
}

/// Get accounts that need syncing based on their sync frequency
pub fn get_accounts_needing_sync(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<SyncTask>, SocialError> {
    log::debug!(
        "[Social::Sync] Getting accounts needing sync for space {}",
        space_id
    );

    let now = Utc::now().timestamp_millis();

    let mut stmt = conn.prepare(
        "SELECT id, platform, username, last_sync, sync_frequency_minutes
         FROM social_account
         WHERE space_id = ?1 AND enabled = 1
         ORDER BY last_sync ASC NULLS FIRST",
    )?;

    let tasks = stmt
        .query_map([space_id], |row| {
            let account_id: String = row.get(0)?;
            let platform: String = row.get(1)?;
            let username: String = row.get(2)?;
            let last_sync: Option<i64> = row.get(3)?;
            let sync_frequency_minutes: i64 = row.get(4)?;

            // Calculate next sync time (convert minutes to milliseconds)
            let next_sync = if let Some(last) = last_sync {
                last + (sync_frequency_minutes * 60 * 1000)
            } else {
                0 // Never synced, sync immediately
            };

            Ok(SyncTask {
                account_id,
                platform,
                username,
                last_sync,
                sync_frequency_minutes,
                next_sync,
            })
        })?
        .filter_map(Result::ok)
        .filter(|task| task.next_sync <= now)
        .collect();

    log::info!(
        "[Social::Sync] Found {} accounts needing sync in space {}",
        tasks.len(),
        space_id
    );

    Ok(tasks)
}

/// Get all accounts for a space regardless of sync status
pub fn get_all_sync_tasks(conn: &Connection, space_id: &str) -> Result<Vec<SyncTask>, SocialError> {
    log::debug!(
        "[Social::Sync] Getting all sync tasks for space {}",
        space_id
    );

    let mut stmt = conn.prepare(
        "SELECT id, platform, username, last_sync, sync_frequency_minutes
         FROM social_account
         WHERE space_id = ?1 AND enabled = 1
         ORDER BY platform, username",
    )?;

    let tasks = stmt
        .query_map([space_id], |row| {
            let account_id: String = row.get(0)?;
            let platform: String = row.get(1)?;
            let username: String = row.get(2)?;
            let last_sync: Option<i64> = row.get(3)?;
            let sync_frequency_minutes: i64 = row.get(4)?;

            let next_sync = if let Some(last) = last_sync {
                last + (sync_frequency_minutes * 60 * 1000)
            } else {
                0
            };

            Ok(SyncTask {
                account_id,
                platform,
                username,
                last_sync,
                sync_frequency_minutes,
                next_sync,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    log::info!(
        "[Social::Sync] Retrieved {} sync tasks for space {}",
        tasks.len(),
        space_id
    );

    Ok(tasks)
}

/// Record sync start
pub fn start_sync(conn: &Connection, account_id: &str) -> Result<(), SocialError> {
    log::debug!("[Social::Sync] Starting sync for account {}", account_id);

    let now = Utc::now().timestamp_millis();

    conn.execute(
        "INSERT INTO social_sync_history (
            id, account_id, sync_time, posts_synced, sync_duration_ms, status
        ) VALUES (?1, ?2, ?3, 0, 0, 'in_progress')",
        params![ulid::Ulid::new().to_string(), account_id, now,],
    )?;

    log::info!("[Social::Sync] Sync started for account {}", account_id);

    Ok(())
}

/// Record sync completion
pub fn complete_sync(
    conn: &Connection,
    account_id: &str,
    posts_synced: i64,
    duration_ms: i64,
) -> Result<(), SocialError> {
    log::debug!(
        "[Social::Sync] Completing sync for account {} - posts: {}, duration: {}ms",
        account_id,
        posts_synced,
        duration_ms
    );

    let now = Utc::now().timestamp_millis();

    // Update the most recent in_progress sync record
    conn.execute(
        "UPDATE social_sync_history
         SET status = 'completed',
             posts_synced = ?1,
             sync_duration_ms = ?2
         WHERE account_id = ?3
           AND status = 'in_progress'
           AND sync_time = (
               SELECT MAX(sync_time)
               FROM social_sync_history
               WHERE account_id = ?3 AND status = 'in_progress'
           )",
        params![posts_synced, duration_ms, account_id],
    )?;

    // Update account's last_sync timestamp
    conn.execute(
        "UPDATE social_account SET last_sync = ?1 WHERE id = ?2",
        params![now, account_id],
    )?;

    log::info!(
        "[Social::Sync] Sync completed for account {} - synced {} posts in {}ms",
        account_id,
        posts_synced,
        duration_ms
    );

    Ok(())
}

/// Record sync failure
pub fn fail_sync(
    conn: &Connection,
    account_id: &str,
    error_message: &str,
) -> Result<(), SocialError> {
    log::warn!(
        "[Social::Sync] Sync failed for account {}: {}",
        account_id,
        error_message
    );

    // Update the most recent in_progress sync record
    conn.execute(
        "UPDATE social_sync_history
         SET status = 'failed'
         WHERE account_id = ?1
           AND status = 'in_progress'
           AND sync_time = (
               SELECT MAX(sync_time)
               FROM social_sync_history
               WHERE account_id = ?1 AND status = 'in_progress'
           )",
        params![account_id],
    )?;

    log::error!(
        "[Social::Sync] Recorded sync failure for account {}",
        account_id
    );

    Ok(())
}

/// Get sync history for an account
pub fn get_sync_history(
    conn: &Connection,
    account_id: &str,
    limit: i64,
) -> Result<Vec<SyncStatus>, SocialError> {
    log::debug!(
        "[Social::Sync] Getting sync history for account {} (limit: {})",
        account_id,
        limit
    );

    let mut stmt = conn.prepare(
        "SELECT account_id, sync_time, posts_synced, sync_duration_ms, status
         FROM social_sync_history
         WHERE account_id = ?1
         ORDER BY sync_time DESC
         LIMIT ?2",
    )?;

    let history = stmt
        .query_map(params![account_id, limit], |row| {
            let account_id: String = row.get(0)?;
            let sync_time: i64 = row.get(1)?;
            let posts_synced: i64 = row.get(2)?;
            let sync_duration: i64 = row.get(3)?;
            let status: String = row.get(4)?;

            Ok(SyncStatus {
                account_id,
                status,
                started_at: Some(sync_time),
                completed_at: if status == "completed" {
                    Some(sync_time + (sync_duration / 1000))
                } else {
                    None
                },
                error_message: None,
                posts_extracted: posts_synced,
            })
        })?
        .filter_map(Result::ok)
        .collect();

    log::info!(
        "[Social::Sync] Retrieved {} sync history records for account {}",
        history.len(),
        account_id
    );

    Ok(history)
}

/// Get sync statistics for a space
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStats {
    pub total_accounts: i64,
    pub accounts_synced_today: i64,
    pub total_syncs_today: i64,
    pub average_posts_per_sync: f64,
    pub last_sync_time: Option<i64>,
}

pub fn get_sync_stats(conn: &Connection, space_id: &str) -> Result<SyncStats, SocialError> {
    log::debug!("[Social::Sync] Getting sync stats for space {}", space_id);

    let now = Utc::now().timestamp_millis();
    let today_start = now - (now % 86400000); // Start of current day (milliseconds in a day)

    // Total accounts
    let total_accounts: i64 = conn.query_row(
        "SELECT COUNT(*) FROM social_account WHERE space_id = ?1 AND enabled = 1",
        [space_id],
        |row| row.get(0),
    )?;

    // Accounts synced today
    let accounts_synced_today: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT account_id)
         FROM social_sync_history sh
         JOIN social_account sa ON sh.account_id = sa.id
         WHERE sa.space_id = ?1 AND sh.sync_time >= ?2",
        params![space_id, today_start],
        |row| row.get(0),
    )?;

    // Total syncs today
    let total_syncs_today: i64 = conn.query_row(
        "SELECT COUNT(*)
         FROM social_sync_history sh
         JOIN social_account sa ON sh.account_id = sa.id
         WHERE sa.space_id = ?1 AND sh.sync_time >= ?2",
        params![space_id, today_start],
        |row| row.get(0),
    )?;

    // Average posts per sync
    let average_posts_per_sync: f64 = conn.query_row(
        "SELECT COALESCE(AVG(posts_synced), 0.0)
         FROM social_sync_history sh
         JOIN social_account sa ON sh.account_id = sa.id
         WHERE sa.space_id = ?1 AND sh.status = 'completed'",
        [space_id],
        |row| row.get(0),
    )?;

    // Last sync time
    let last_sync_time: Option<i64> = conn
        .query_row(
            "SELECT MAX(sync_time)
             FROM social_sync_history sh
             JOIN social_account sa ON sh.account_id = sa.id
             WHERE sa.space_id = ?1",
            [space_id],
            |row| row.get(0),
        )
        .ok();

    log::info!(
        "[Social::Sync] Sync stats for space {}: {} total accounts, {} synced today ({} syncs), avg {:.1} posts/sync",
        space_id,
        total_accounts,
        accounts_synced_today,
        total_syncs_today,
        average_posts_per_sync
    );

    Ok(SyncStats {
        total_accounts,
        accounts_synced_today,
        total_syncs_today,
        average_posts_per_sync,
        last_sync_time,
    })
}
