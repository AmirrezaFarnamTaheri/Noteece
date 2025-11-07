use chrono::Utc;
use rusqlite::{params, Connection};
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
    let filters_json = filters
        .as_ref()
        .map(|f| serde_json::to_string(f))
        .transpose()?;

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
        if let Some(filters) = category.filters {
            // Get posts that match the filters and aren't already categorized
            let mut query = String::from(
                "SELECT p.id FROM social_post p
                 JOIN social_account a ON p.account_id = a.id
                 WHERE a.space_id = ?1
                   AND p.id NOT IN (
                       SELECT post_id FROM social_post_category WHERE category_id = ?2
                   )",
            );

            let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![
                Box::new(space_id.to_string()),
                Box::new(category.id.clone()),
            ];

            // Add filter conditions
            if let Some(platforms) = filters.platforms {
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

            if let Some(keywords) = filters.keywords {
                query.push_str(" AND (");
                for (i, keyword) in keywords.iter().enumerate() {
                    if i > 0 {
                        query.push_str(" OR ");
                    }
                    query.push_str("p.content LIKE ? ESCAPE '\\'");
                    // Escape SQL LIKE special characters % and _
                    let escaped_keyword = keyword
                        .replace('\\', "\\\\")
                        .replace('%', "\\%")
                        .replace('_', "\\_");
                    params_vec.push(Box::new(format!("%{}%", escaped_keyword)));
                }
                query.push(')');
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
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::migrate(&conn).unwrap();

        // Create a test space
        conn.execute(
            "INSERT INTO space (id, name, icon, enabled_modes_json) VALUES ('test_space', 'Test', '📱', '[]')",
            [],
        )
        .unwrap();

        conn
    }

    // ===== Category CRUD Tests =====

    #[test]
    fn test_create_and_get_category() {
        let conn = setup_test_db();

        let category = create_category(
            &conn,
            "test_space",
            "Work",
            Some("#FF0000"),
            Some("💼"),
            None,
        )
        .unwrap();

        assert_eq!(category.name, "Work");
        assert_eq!(category.color, Some("#FF0000".to_string()));
        assert_eq!(category.icon, Some("💼".to_string()));
        assert_eq!(category.space_id, "test_space");
        assert!(category.filters.is_none());

        // Retrieve the category
        let retrieved = get_category(&conn, &category.id).unwrap();
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.name, "Work");
        assert_eq!(retrieved.color, Some("#FF0000".to_string()));
    }

    #[test]
    fn test_create_category_with_filters() {
        let conn = setup_test_db();

        let filters = CategoryFilters {
            platforms: Some(vec!["twitter".to_string(), "linkedin".to_string()]),
            authors: Some(vec!["user1".to_string(), "user2".to_string()]),
            keywords: Some(vec!["work".to_string(), "project".to_string()]),
        };

        let category = create_category(
            &conn,
            "test_space",
            "Filtered",
            None,
            None,
            Some(filters.clone()),
        )
        .unwrap();

        assert_eq!(category.name, "Filtered");
        assert!(category.filters.is_some());

        let retrieved_filters = category.filters.unwrap();
        assert_eq!(
            retrieved_filters.platforms.unwrap(),
            vec!["twitter".to_string(), "linkedin".to_string()]
        );
        assert_eq!(
            retrieved_filters.keywords.unwrap(),
            vec!["work".to_string(), "project".to_string()]
        );
    }

    #[test]
    fn test_get_all_categories() {
        let conn = setup_test_db();

        // Create multiple categories
        create_category(&conn, "test_space", "Work", Some("#FF0000"), None, None).unwrap();
        create_category(&conn, "test_space", "Personal", Some("#00FF00"), None, None).unwrap();
        create_category(&conn, "test_space", "News", None, Some("📰"), None).unwrap();

        let categories = get_categories(&conn, "test_space").unwrap();
        assert_eq!(categories.len(), 3);

        // Verify they're sorted by name
        assert_eq!(categories[0].name, "News");
        assert_eq!(categories[1].name, "Personal");
        assert_eq!(categories[2].name, "Work");
    }

    #[test]
    fn test_get_category_not_found() {
        let conn = setup_test_db();

        let result = get_category(&conn, "nonexistent_id").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_update_category() {
        let conn = setup_test_db();

        let category = create_category(&conn, "test_space", "Original", None, None, None).unwrap();

        // Update name
        update_category(&conn, &category.id, Some("Updated"), None, None).unwrap();

        let retrieved = get_category(&conn, &category.id).unwrap().unwrap();
        assert_eq!(retrieved.name, "Updated");

        // Update color
        update_category(&conn, &category.id, None, Some("#0000FF"), None).unwrap();

        let retrieved = get_category(&conn, &category.id).unwrap().unwrap();
        assert_eq!(retrieved.color, Some("#0000FF".to_string()));

        // Update icon
        update_category(&conn, &category.id, None, None, Some("🎯")).unwrap();

        let retrieved = get_category(&conn, &category.id).unwrap().unwrap();
        assert_eq!(retrieved.icon, Some("🎯".to_string()));

        // Update multiple at once
        update_category(
            &conn,
            &category.id,
            Some("Final"),
            Some("#FFFFFF"),
            Some("✨"),
        )
        .unwrap();

        let retrieved = get_category(&conn, &category.id).unwrap().unwrap();
        assert_eq!(retrieved.name, "Final");
        assert_eq!(retrieved.color, Some("#FFFFFF".to_string()));
        assert_eq!(retrieved.icon, Some("✨".to_string()));
    }

    #[test]
    fn test_delete_category() {
        let conn = setup_test_db();

        let category = create_category(&conn, "test_space", "ToDelete", None, None, None).unwrap();

        // Verify it exists
        assert!(get_category(&conn, &category.id).unwrap().is_some());

        // Delete it
        delete_category(&conn, &category.id).unwrap();

        // Verify it's gone
        assert!(get_category(&conn, &category.id).unwrap().is_none());
    }

    // ===== Post-Category Assignment Tests =====

    #[test]
    fn test_assign_and_get_post_categories() {
        let conn = setup_test_db();

        // Create account and post
        let dek = [0u8; 32];
        conn.execute(
            "INSERT INTO social_account (id, space_id, platform, username, display_name, credentials_encrypted, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Test post', 0, 0)",
            [],
        )
        .unwrap();

        // Create categories
        let cat1 = create_category(&conn, "test_space", "Category 1", None, None, None).unwrap();
        let cat2 = create_category(&conn, "test_space", "Category 2", None, None, None).unwrap();

        // Assign categories to post
        assign_category(&conn, "post1", &cat1.id, "user").unwrap();
        assign_category(&conn, "post1", &cat2.id, "auto").unwrap();

        // Get categories for the post
        let post_categories = get_post_categories(&conn, "post1").unwrap();
        assert_eq!(post_categories.len(), 2);

        // Verify categories are sorted by name
        assert_eq!(post_categories[0].name, "Category 1");
        assert_eq!(post_categories[1].name, "Category 2");
    }

    #[test]
    fn test_assign_category_idempotent() {
        let conn = setup_test_db();

        // Create account and post
        conn.execute(
            "INSERT INTO social_account (id, space_id, platform, username, display_name, credentials_encrypted, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Test', 0, 0)",
            [],
        )
        .unwrap();

        let category = create_category(&conn, "test_space", "Test", None, None, None).unwrap();

        // Assign twice
        assign_category(&conn, "post1", &category.id, "user").unwrap();
        assign_category(&conn, "post1", &category.id, "user").unwrap(); // Should not error

        // Should still have only one assignment
        let post_categories = get_post_categories(&conn, "post1").unwrap();
        assert_eq!(post_categories.len(), 1);
    }

    #[test]
    fn test_remove_category() {
        let conn = setup_test_db();

        // Create account and post
        conn.execute(
            "INSERT INTO social_account (id, space_id, platform, username, display_name, credentials_encrypted, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Test', 0, 0)",
            [],
        )
        .unwrap();

        let category = create_category(&conn, "test_space", "Test", None, None, None).unwrap();

        // Assign and verify
        assign_category(&conn, "post1", &category.id, "user").unwrap();
        assert_eq!(get_post_categories(&conn, "post1").unwrap().len(), 1);

        // Remove and verify
        remove_category(&conn, "post1", &category.id).unwrap();
        assert_eq!(get_post_categories(&conn, "post1").unwrap().len(), 0);
    }

    // ===== Auto-Categorization Tests =====

    #[test]
    fn test_auto_categorize_by_platform() {
        let conn = setup_test_db();

        // Create account and posts
        conn.execute(
            "INSERT INTO social_account (id, space_id, platform, username, display_name, credentials_encrypted, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_account (id, space_id, platform, username, display_name, credentials_encrypted, enabled, sync_frequency_minutes, created_at)
             VALUES ('account2', 'test_space', 'linkedin', 'user2', 'User 2', x'00', 1, 60, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Twitter post', 0, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post2', 'account2', 'linkedin', 'link1', 'user2', 'LinkedIn post', 0, 0)",
            [],
        )
        .unwrap();

        // Create category with platform filter
        let filters = CategoryFilters {
            platforms: Some(vec!["twitter".to_string()]),
            authors: None,
            keywords: None,
        };
        create_category(
            &conn,
            "test_space",
            "Twitter Only",
            None,
            None,
            Some(filters),
        )
        .unwrap();

        // Run auto-categorization
        let categorized = auto_categorize_posts(&conn, "test_space").unwrap();
        assert_eq!(categorized, 1); // Only Twitter post should be categorized

        // Verify the Twitter post was categorized
        let post_categories = get_post_categories(&conn, "post1").unwrap();
        assert_eq!(post_categories.len(), 1);
        assert_eq!(post_categories[0].name, "Twitter Only");

        // LinkedIn post should not be categorized
        let post_categories = get_post_categories(&conn, "post2").unwrap();
        assert_eq!(post_categories.len(), 0);
    }

    #[test]
    fn test_auto_categorize_by_keyword() {
        let conn = setup_test_db();

        // Create account and posts
        conn.execute(
            "INSERT INTO social_account (id, space_id, platform, username, display_name, credentials_encrypted, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Exciting work project update', 0, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post2', 'account1', 'twitter', 'tweet2', 'user1', 'Random personal stuff', 0, 0)",
            [],
        )
        .unwrap();

        // Create category with keyword filter
        let filters = CategoryFilters {
            platforms: None,
            authors: None,
            keywords: Some(vec!["work".to_string(), "project".to_string()]),
        };
        create_category(&conn, "test_space", "Work", None, None, Some(filters)).unwrap();

        // Run auto-categorization
        let categorized = auto_categorize_posts(&conn, "test_space").unwrap();
        assert_eq!(categorized, 1); // Only post with "work" keyword

        // Verify post1 was categorized
        let post_categories = get_post_categories(&conn, "post1").unwrap();
        assert_eq!(post_categories.len(), 1);
        assert_eq!(post_categories[0].name, "Work");

        // post2 should not be categorized
        let post_categories = get_post_categories(&conn, "post2").unwrap();
        assert_eq!(post_categories.len(), 0);
    }

    #[test]
    fn test_auto_categorize_keyword_with_special_chars() {
        let conn = setup_test_db();

        // Create account and post with special characters
        conn.execute(
            "INSERT INTO social_account (id, space_id, platform, username, display_name, credentials_encrypted, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'C++ programming_tutorial', 0, 0)",
            [],
        )
        .unwrap();

        // Create category with special characters in keywords
        let filters = CategoryFilters {
            platforms: None,
            authors: None,
            keywords: Some(vec!["C++".to_string(), "programming_tutorial".to_string()]),
        };
        create_category(&conn, "test_space", "Tech", None, None, Some(filters)).unwrap();

        // Run auto-categorization - should handle % and _ escaping
        let categorized = auto_categorize_posts(&conn, "test_space").unwrap();
        assert_eq!(categorized, 1);

        let post_categories = get_post_categories(&conn, "post1").unwrap();
        assert_eq!(post_categories.len(), 1);
    }

    #[test]
    fn test_auto_categorize_no_duplicate_assignments() {
        let conn = setup_test_db();

        // Create account and post
        conn.execute(
            "INSERT INTO social_account (id, space_id, platform, username, display_name, credentials_encrypted, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, created_at, collected_at)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Test content', 0, 0)",
            [],
        )
        .unwrap();

        let filters = CategoryFilters {
            platforms: Some(vec!["twitter".to_string()]),
            authors: None,
            keywords: None,
        };
        create_category(&conn, "test_space", "Twitter", None, None, Some(filters)).unwrap();

        // Run auto-categorization twice
        let categorized1 = auto_categorize_posts(&conn, "test_space").unwrap();
        assert_eq!(categorized1, 1);

        let categorized2 = auto_categorize_posts(&conn, "test_space").unwrap();
        assert_eq!(categorized2, 0); // No new assignments

        // Post should still have only one category
        let post_categories = get_post_categories(&conn, "post1").unwrap();
        assert_eq!(post_categories.len(), 1);
    }
}
