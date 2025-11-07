use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

use super::account::SocialError;
use crate::crypto::{decrypt_string, encrypt_string};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebViewSession {
    pub id: String,
    pub account_id: String,
    pub platform: String,
    pub cookies: Option<String>,      // Encrypted
    pub session_data: Option<String>, // Encrypted
    pub created_at: i64,
    pub last_used: i64,
}

/// Create a new WebView session for an account
pub fn create_webview_session(
    conn: &Connection,
    account_id: &str,
    platform: &str,
    dek: &[u8],
) -> Result<WebViewSession, SocialError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp_millis();

    conn.execute(
        "INSERT INTO social_webview_session (
            id, account_id, platform, cookies, session_data, created_at, last_used
        ) VALUES (?1, ?2, ?3, NULL, NULL, ?4, ?5)",
        params![&id, account_id, platform, now, now],
    )?;

    Ok(WebViewSession {
        id: id.clone(),
        account_id: account_id.to_string(),
        platform: platform.to_string(),
        cookies: None,
        session_data: None,
        created_at: now,
        last_used: now,
    })
}

/// Get WebView session for an account
pub fn get_webview_session(
    conn: &Connection,
    account_id: &str,
) -> Result<Option<WebViewSession>, SocialError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, platform, cookies, session_data, created_at, last_used
         FROM social_webview_session
         WHERE account_id = ?1
         ORDER BY last_used DESC
         LIMIT 1",
    )?;

    let result = stmt.query_row([account_id], |row| {
        Ok(WebViewSession {
            id: row.get(0)?,
            account_id: row.get(1)?,
            platform: row.get(2)?,
            cookies: row.get(3)?,
            session_data: row.get(4)?,
            created_at: row.get(5)?,
            last_used: row.get(6)?,
        })
    });

    match result {
        Ok(session) => Ok(Some(session)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Save cookies for a WebView session
pub fn save_session_cookies(
    conn: &Connection,
    session_id: &str,
    cookies_json: &str,
    dek: &[u8],
) -> Result<(), SocialError> {
    let encrypted_cookies = encrypt_string(cookies_json, dek)?;
    let now = Utc::now().timestamp_millis();

    conn.execute(
        "UPDATE social_webview_session SET cookies = ?1, last_used = ?2 WHERE id = ?3",
        params![&encrypted_cookies, now, session_id],
    )?;

    Ok(())
}

/// Save session storage data for a WebView session
pub fn save_session_data(
    conn: &Connection,
    session_id: &str,
    session_data_json: &str,
    dek: &[u8],
) -> Result<(), SocialError> {
    let encrypted_data = encrypt_string(session_data_json, dek)?;
    let now = Utc::now().timestamp_millis();

    conn.execute(
        "UPDATE social_webview_session SET session_data = ?1, last_used = ?2 WHERE id = ?3",
        params![&encrypted_data, now, session_id],
    )?;

    Ok(())
}

/// Get decrypted cookies for a session
pub fn get_session_cookies(
    conn: &Connection,
    session_id: &str,
    dek: &[u8],
) -> Result<Option<String>, SocialError> {
    let mut stmt = conn.prepare("SELECT cookies FROM social_webview_session WHERE id = ?1")?;

    let result: Result<Option<String>, rusqlite::Error> =
        stmt.query_row([session_id], |row| row.get(0));

    match result {
        Ok(Some(encrypted)) => {
            let decrypted = decrypt_string(&encrypted, dek)?;
            Ok(Some(decrypted))
        }
        Ok(None) => Ok(None),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Get decrypted session data
pub fn get_session_data(
    conn: &Connection,
    session_id: &str,
    dek: &[u8],
) -> Result<Option<String>, SocialError> {
    let mut stmt = conn.prepare("SELECT session_data FROM social_webview_session WHERE id = ?1")?;

    let result: Result<Option<String>, rusqlite::Error> =
        stmt.query_row([session_id], |row| row.get(0));

    match result {
        Ok(Some(encrypted)) => {
            let decrypted = decrypt_string(&encrypted, dek)?;
            Ok(Some(decrypted))
        }
        Ok(None) => Ok(None),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Update last used timestamp for a session
pub fn update_session_last_used(conn: &Connection, session_id: &str) -> Result<(), SocialError> {
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE social_webview_session SET last_used = ?1 WHERE id = ?2",
        params![now, session_id],
    )?;
    Ok(())
}

/// Delete a WebView session
pub fn delete_webview_session(conn: &Connection, session_id: &str) -> Result<(), SocialError> {
    conn.execute(
        "DELETE FROM social_webview_session WHERE id = ?1",
        [session_id],
    )?;
    Ok(())
}

/// Delete all sessions for an account
pub fn delete_account_sessions(conn: &Connection, account_id: &str) -> Result<(), SocialError> {
    conn.execute(
        "DELETE FROM social_webview_session WHERE account_id = ?1",
        [account_id],
    )?;
    Ok(())
}

/// Get platform URL for opening WebView
pub fn get_platform_url(platform: &str) -> &'static str {
    match platform {
        "twitter" => "https://twitter.com",
        "instagram" => "https://instagram.com",
        "facebook" => "https://facebook.com",
        "youtube" => "https://youtube.com",
        "reddit" => "https://reddit.com",
        "linkedin" => "https://linkedin.com",
        "tiktok" => "https://tiktok.com",
        "discord" => "https://discord.com/app",
        "telegram" => "https://web.telegram.org",
        "whatsapp" => "https://web.whatsapp.com",
        "spotify" => "https://open.spotify.com",
        "soundcloud" => "https://soundcloud.com",
        "pinterest" => "https://pinterest.com",
        "mastodon" => "https://mastodon.social",
        "bluesky" => "https://bsky.app",
        _ => "about:blank",
    }
}

/// Get platform name for window title
pub fn get_platform_display_name(platform: &str) -> &'static str {
    match platform {
        "twitter" => "Twitter / X",
        "instagram" => "Instagram",
        "facebook" => "Facebook",
        "youtube" => "YouTube",
        "reddit" => "Reddit",
        "linkedin" => "LinkedIn",
        "tiktok" => "TikTok",
        "discord" => "Discord",
        "telegram" => "Telegram",
        "whatsapp" => "WhatsApp",
        "spotify" => "Spotify",
        "soundcloud" => "SoundCloud",
        "pinterest" => "Pinterest",
        "mastodon" => "Mastodon",
        "bluesky" => "Bluesky",
        _ => "Social Media",
    }
}
