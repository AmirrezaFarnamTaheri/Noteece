use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

use super::account::SocialError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialCategory {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub filters: Option<CategoryFilters>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryFilters {
    pub platforms: Option<Vec<String>>,
    pub authors: Option<Vec<String>>,
    pub keywords: Option<Vec<String>>,
}

/// Create a new category
pub fn create_category(
    conn: &Connection,
    space_id: &str,
    name: &str,
    color: Option<&str>,
    icon: Option<&str>,
    filters: Option<CategoryFilters>,
) -> Result<SocialCategory, SocialError> {
    log::debug!(
        "[Social::Category] Creating category '{}' in space {}",
        name,
        space_id
    );

    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp_millis();
    let filters_json = filters.as_ref().map(serde_json::to_string).transpose()?;

    conn.execute(
        "INSERT INTO social_category (
            id, space_id, name, color, icon, filters_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![&id, space_id, name, color, icon, filters_json, now],
    )
    .map_err(|e| {
        log::error!("[Social::Category] Failed to create category: {}", e);
        e
    })?;

    log::info!(
        "[Social::Category] Successfully created category {} ({})",
        id,
        name
    );

    Ok(SocialCategory {
        id: id.clone(),
        space_id: space_id.to_string(),
        name: name.to_string(),
        color: color.map(String::from),
        icon: icon.map(String::from),
        filters,
        created_at: now,
    })
}

/// Get all categories for a space
pub fn get_categories(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<SocialCategory>, SocialError> {
    log::debug!(
        "[Social::Category] Fetching categories for space {}",
        space_id
    );

    let mut stmt = conn
        .prepare(
            "SELECT id, space_id, name, color, icon, filters_json, created_at
         FROM social_category
         WHERE space_id = ?1
         ORDER BY name",
        )
        .map_err(|e| {
            log::error!("[Social::Category] Failed to prepare query: {}", e);
            e
        })?;

    let categories = stmt.query_map([space_id], |row| {
        let filters_json: Option<String> = row.get(5)?;
        let filters = filters_json.and_then(|s| serde_json::from_str(&s).ok());

        Ok(SocialCategory {
            id: row.get(0)?,
            space_id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            icon: row.get(4)?,
            filters,
            created_at: row.get(6)?,
        })
    })?;

    let mut result = Vec::new();
    for category in categories {
        result.push(category?);
    }

    log::info!(
        "[Social::Category] Retrieved {} categories for space {}",
        result.len(),
        space_id
    );

    Ok(result)
}

/// Get a single category by ID
pub fn get_category(
    conn: &Connection,
    category_id: &str,
) -> Result<Option<SocialCategory>, SocialError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, name, color, icon, filters_json, created_at
         FROM social_category
         WHERE id = ?1",
    )?;

    let result = stmt.query_row([category_id], |row| {
        let filters_json: Option<String> = row.get(5)?;
        let filters = filters_json.and_then(|s| serde_json::from_str(&s).ok());

        Ok(SocialCategory {
            id: row.get(0)?,
            space_id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            icon: row.get(4)?,
            filters,
            created_at: row.get(6)?,
        })
    });

    match result {
        Ok(category) => Ok(Some(category)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Update category
pub fn update_category(
    conn: &Connection,
    category_id: &str,
    name: Option<&str>,
    color: Option<&str>,
    icon: Option<&str>,
) -> Result<(), SocialError> {
    log::debug!("[Social::Category] Updating category {}", category_id);

    if let Some(name) = name {
        conn.execute(
            "UPDATE social_category SET name = ?1 WHERE id = ?2",
            params![name, category_id],
        )
        .map_err(|e| {
            log::error!("[Social::Category] Failed to update name: {}", e);
            e
        })?;
    }

    if let Some(color) = color {
        conn.execute(
            "UPDATE social_category SET color = ?1 WHERE id = ?2",
            params![color, category_id],
        )
        .map_err(|e| {
            log::error!("[Social::Category] Failed to update color: {}", e);
            e
        })?;
    }

    if let Some(icon) = icon {
        conn.execute(
            "UPDATE social_category SET icon = ?1 WHERE id = ?2",
            params![icon, category_id],
        )
        .map_err(|e| {
            log::error!("[Social::Category] Failed to update icon: {}", e);
            e
        })?;
    }

    log::info!(
        "[Social::Category] Successfully updated category {}",
        category_id
    );

    Ok(())
}

/// Delete a category
pub fn delete_category(conn: &Connection, category_id: &str) -> Result<(), SocialError> {
    log::warn!("[Social::Category] Deleting category {}", category_id);

    conn.execute("DELETE FROM social_category WHERE id = ?1", [category_id])
        .map_err(|e| {
            log::error!("[Social::Category] Failed to delete category: {}", e);
            e
        })?;

    log::info!(
        "[Social::Category] Successfully deleted category {}",
        category_id
    );
    Ok(())
}

/// Assign a category to a post
pub fn assign_category(
    conn: &Connection,
    post_id: &str,
    category_id: &str,
    assigned_by: &str, // 'user', 'auto', or 'ai'
) -> Result<(), SocialError> {
    log::debug!(
        "[Social::Category] Assigning category {} to post {} (by: {})",
        category_id,
        post_id,
        assigned_by
    );

    // Verify space isolation: post.space_id == category.space_id
    let post_space: Option<String> = conn
        .query_row(
            "SELECT a.space_id
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE p.id = ?1",
            params![post_id],
            |row| row.get(0),
        )
        .optional()?;
    let cat_space: Option<String> = conn
        .query_row(
            "SELECT space_id FROM social_category WHERE id = ?1",
            params![category_id],
            |row| row.get(0),
        )
        .optional()?;

    match (post_space, cat_space) {
        (Some(ps), Some(cs)) if ps == cs => {
            let now = Utc::now().timestamp_millis();
            conn.execute(
                "INSERT OR IGNORE INTO social_post_category (
                    post_id, category_id, assigned_at, assigned_by
                ) VALUES (?1, ?2, ?3, ?4)",
                params![post_id, category_id, now, assigned_by],
            )
            .map_err(|e| {
                log::error!("[Social::Category] Failed to assign category: {}", e);
                e
            })?;
            Ok(())
        }
        (Some(_), Some(_)) => Err(SocialError::InvalidInput(
            "Cross-space assignment denied".into(),
        )),
        _ => Err(SocialError::NotFound("Post or category not found".into())),
    }
}

/// Remove a category from a post
pub fn remove_category(
    conn: &Connection,
    post_id: &str,
    category_id: &str,
) -> Result<(), SocialError> {
    conn.execute(
        "DELETE FROM social_post_category
         WHERE post_id = ?1 AND category_id = ?2",
        params![post_id, category_id],
    )?;
    Ok(())
}

/// Get categories assigned to a post
pub fn get_post_categories(
    conn: &Connection,
    post_id: &str,
) -> Result<Vec<SocialCategory>, SocialError> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.space_id, c.name, c.color, c.icon, c.filters_json, c.created_at
         FROM social_category c
         JOIN social_post_category pc ON c.id = pc.category_id
         WHERE pc.post_id = ?1
         ORDER BY c.name",
    )?;

    let categories = stmt.query_map([post_id], |row| {
        let filters_json: Option<String> = row.get(5)?;
        let filters = filters_json.and_then(|s| serde_json::from_str(&s).ok());

        Ok(SocialCategory {
            id: row.get(0)?,
            space_id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            icon: row.get(4)?,
            filters,
            created_at: row.get(6)?,
        })
    })?;

    let mut result = Vec::new();
    for category in categories {
        result.push(category?);
    }

    Ok(result)
}

/// Auto-categorize posts based on rules
pub fn auto_categorize_posts(conn: &Connection, space_id: &str) -> Result<usize, SocialError> {
    log::debug!(
        "[Social::Category] Starting auto-categorization for space {}",
        space_id
    );

    let categories = get_categories(conn, space_id)?;
    let mut categorized = 0;

    for category in categories {
        if let Some(mut filters) = category.filters {
            // Normalize filters to prevent unbounded clause growth
            let normalize_list =
                |list: &mut Option<Vec<String>>, max_len: usize, min_item_len: usize| {
                    if let Some(v) = list.as_mut() {
                        v.retain(|s| !s.trim().is_empty());
                        for s in v.iter_mut() {
                            *s = s.trim().to_string();
                        }
                        v.dedup();
                        v.retain(|s| s.len() >= min_item_len);
                        if v.len() > max_len {
                            v.truncate(max_len);
                        }
                        if v.is_empty() {
                            *list = None;
                        }
                    }
                };
            normalize_list(&mut filters.platforms, 50, 1);
            normalize_list(&mut filters.keywords, 50, 2);

            // Get posts that match the filters and aren't already categorized
            let mut query = String::from(
                "SELECT p.id FROM social_post p
                 JOIN social_account a ON p.account_id = a.id
                 WHERE a.space_id = ?1
                   AND NOT EXISTS (
                       SELECT 1 FROM social_post_category spc
                       WHERE spc.post_id = p.id AND spc.category_id = ?2
                   )",
            );

            let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![
                Box::new(space_id.to_string()),
                Box::new(category.id.clone()),
            ];

            // Add filter conditions
            if let Some(platforms) = filters.platforms {
                if !platforms.is_empty() {
                    query.push_str(" AND p.platform IN (");
                    for (i, platform) in platforms.iter().enumerate() {
                        if i > 0 {
                            query.push_str(", ");
                        }
                        query.push('?');
                        params_vec.push(Box::new(platform.clone()));
                    }
                    query.push(')');
                }
            }

            if let Some(keywords) = filters.keywords {
                if !keywords.is_empty() {
                    query.push_str(" AND (");
                    let mut added = 0usize;
                    for keyword in keywords {
                        // Escape SQL LIKE specials
                        let escaped_keyword = keyword
                            .replace('\\', "\\\\")
                            .replace('%', "\\%")
                            .replace('_', "\\_");
                        // Skip effectively empty after escaping
                        if escaped_keyword.is_empty() {
                            continue;
                        }
                        if added > 0 {
                            query.push_str(" OR ");
                        }
                        query.push_str("p.content LIKE ? ESCAPE '\\'");
                        params_vec.push(Box::new(format!("%{}%", escaped_keyword)));
                        added += 1;
                    }
                    if added == 0 {
                        // no valid keywords, skip adding the clause
                    } else {
                        query.push(')');
                    }
                }
            }

            let mut stmt = conn.prepare(&query)?;
            let post_ids: Vec<String> = stmt
                .query_map(
                    rusqlite::params_from_iter(params_vec.iter().map(|b| b.as_ref())),
                    |row| row.get(0),
                )?
                .collect::<Result<Vec<_>, _>>()?;

            for post_id in post_ids {
                assign_category(conn, &post_id, &category.id, "auto")?;
                categorized += 1;
            }
        }
    }

    log::info!(
        "[Social::Category] Auto-categorized {} posts in space {}",
        categorized,
        space_id
    );

    Ok(categorized)
}

#[cfg(test)]
#[path = "tests/category_tests.rs"]
mod tests;
