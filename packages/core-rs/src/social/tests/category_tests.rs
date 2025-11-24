use super::*;
use rusqlite::Connection;

fn setup_test_db() -> Connection {
    let mut conn = Connection::open_in_memory().expect("Failed to open in-memory DB");
    crate::db::migrate(&mut conn).expect("Migration failed");

    // Create a test space
    conn.execute(
        "INSERT INTO space (id, name, icon, enabled_modes_json) VALUES ('test_space', 'Test', '📱', '[]')",
        [],
    )
    .expect("Failed to insert test space");

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
    .expect("Failed to create category");

    assert_eq!(category.name, "Work");
    assert_eq!(category.color, Some("#FF0000".to_string()));
    assert_eq!(category.icon, Some("💼".to_string()));
    assert_eq!(category.space_id, "test_space");
    assert!(category.filters.is_none());

    // Retrieve the category
    let retrieved = get_category(&conn, &category.id).expect("Failed to get category");
    assert!(retrieved.is_some());
    let retrieved = retrieved.expect("Category should exist");
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
    .expect("Failed to create category");

    assert_eq!(category.name, "Filtered");
    assert!(category.filters.is_some());

    let retrieved_filters = category.filters.expect("Filters should exist");
    assert_eq!(
        retrieved_filters.platforms.expect("Platforms should exist"),
        vec!["twitter".to_string(), "linkedin".to_string()]
    );
    assert_eq!(
        retrieved_filters.keywords.expect("Keywords should exist"),
        vec!["work".to_string(), "project".to_string()]
    );
}

#[test]
fn test_get_all_categories() {
    let conn = setup_test_db();

    // Create multiple categories
    create_category(&conn, "test_space", "Work", Some("#FF0000"), None, None)
        .expect("Create failed");
    create_category(&conn, "test_space", "Personal", Some("#00FF00"), None, None)
        .expect("Create failed");
    create_category(&conn, "test_space", "News", None, Some("📰"), None)
        .expect("Create failed");

    let categories = get_categories(&conn, "test_space").expect("Failed to get categories");
    assert_eq!(categories.len(), 3);

    // Verify they're sorted by name
    assert_eq!(categories[0].name, "News");
    assert_eq!(categories[1].name, "Personal");
    assert_eq!(categories[2].name, "Work");
}

#[test]
fn test_get_category_not_found() {
    let conn = setup_test_db();

    let result = get_category(&conn, "nonexistent_id").expect("Get failed");
    assert!(result.is_none());
}

#[test]
fn test_update_category() {
    let conn = setup_test_db();

    let category = create_category(&conn, "test_space", "Original", None, None, None)
        .expect("Create failed");

    // Update name
    update_category(&conn, &category.id, Some("Updated"), None, None).expect("Update failed");

    let retrieved = get_category(&conn, &category.id)
        .expect("Get failed")
        .expect("Not found");
    assert_eq!(retrieved.name, "Updated");

    // Update color
    update_category(&conn, &category.id, None, Some("#0000FF"), None).expect("Update failed");

    let retrieved = get_category(&conn, &category.id)
        .expect("Get failed")
        .expect("Not found");
        assert_eq!(retrieved.color, Some("#0000FF".to_string()));

    // Update icon
    update_category(&conn, &category.id, None, None, Some("🎯")).expect("Update failed");

    let retrieved = get_category(&conn, &category.id)
        .expect("Get failed")
        .expect("Not found");
    assert_eq!(retrieved.icon, Some("🎯".to_string()));

    // Update multiple at once
    update_category(
        &conn,
        &category.id,
        Some("Final"),
        Some("#FFFFFF"),
        Some("✨"),
    )
    .expect("Update failed");

    let retrieved = get_category(&conn, &category.id)
        .expect("Get failed")
        .expect("Not found");
    assert_eq!(retrieved.name, "Final");
    assert_eq!(retrieved.color, Some("#FFFFFF".to_string()));
    assert_eq!(retrieved.icon, Some("✨".to_string()));
}

#[test]
fn test_delete_category() {
    let conn = setup_test_db();

    let category = create_category(&conn, "test_space", "ToDelete", None, None, None)
        .expect("Create failed");

    // Verify it exists
    assert!(get_category(&conn, &category.id)
        .expect("Get failed")
        .is_some());

    // Delete it
    delete_category(&conn, &category.id).expect("Delete failed");

    // Verify it's gone
    assert!(get_category(&conn, &category.id)
        .expect("Get failed")
        .is_none());
}

// ===== Post-Category Assignment Tests =====

#[test]
fn test_assign_and_get_post_categories() {
    let conn = setup_test_db();

    // Create account and post
    let _dek = [0u8; 32];
    conn.execute(
        "INSERT INTO social_account (id, space_id, platform, username, display_name, encrypted_credentials, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
        [],
    )
    .expect("Insert account failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Test post', 0, 0, '{}')",
        [],
    )
    .expect("Insert post failed");

    // Create categories
    let cat1 = create_category(&conn, "test_space", "Category 1", None, None, None)
        .expect("Create cat1 failed");
    let cat2 = create_category(&conn, "test_space", "Category 2", None, None, None)
        .expect("Create cat2 failed");

    // Assign categories to post
    assign_category(&conn, "post1", &cat1.id, "user").expect("Assign cat1 failed");
    assign_category(&conn, "post1", &cat2.id, "auto").expect("Assign cat2 failed");

    // Get categories for the post
    let post_categories = get_post_categories(&conn, "post1").expect("Get categories failed");
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
        "INSERT INTO social_account (id, space_id, platform, username, display_name, encrypted_credentials, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
        [],
    )
    .expect("Insert account failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Test', 0, 0, '{}')",
        [],
    )
    .expect("Insert post failed");

    let category = create_category(&conn, "test_space", "Test", None, None, None)
        .expect("Create cat failed");

    // Assign twice
    assign_category(&conn, "post1", &category.id, "user").expect("First assign failed");
    assign_category(&conn, "post1", &category.id, "user").expect("Second assign failed"); // Should not error

    // Should still have only one assignment
    let post_categories = get_post_categories(&conn, "post1").expect("Get categories failed");
    assert_eq!(post_categories.len(), 1);
}

#[test]
fn test_remove_category() {
    let conn = setup_test_db();

    // Create account and post
    conn.execute(
        "INSERT INTO social_account (id, space_id, platform, username, display_name, encrypted_credentials, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
        [],
    )
    .expect("Insert account failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Test', 0, 0, '{}')",
        [],
    )
    .expect("Insert post failed");

    let category = create_category(&conn, "test_space", "Test", None, None, None)
        .expect("Create cat failed");

    // Assign and verify
    assign_category(&conn, "post1", &category.id, "user").expect("Assign failed");
    assert_eq!(
        get_post_categories(&conn, "post1")
            .expect("Get failed")
            .len(),
        1
    );

    // Remove and verify
    remove_category(&conn, "post1", &category.id).expect("Remove failed");
    assert_eq!(
        get_post_categories(&conn, "post1")
            .expect("Get failed")
            .len(),
        0
    );
}

// ===== Auto-Categorization Tests =====

#[test]
fn test_auto_categorize_by_platform() {
    let conn = setup_test_db();

    // Create account and posts
    conn.execute(
        "INSERT INTO social_account (id, space_id, platform, username, display_name, encrypted_credentials, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
        [],
    )
    .expect("Insert account1 failed");

    conn.execute(
        "INSERT INTO social_account (id, space_id, platform, username, display_name, encrypted_credentials, enabled, sync_frequency_minutes, created_at)
             VALUES ('account2', 'test_space', 'linkedin', 'user2', 'User 2', x'00', 1, 60, 0)",
        [],
    )
    .expect("Insert account2 failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Twitter post', 0, 0, '{}')",
        [],
    )
    .expect("Insert post1 failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post2', 'account2', 'linkedin', 'link1', 'user2', 'LinkedIn post', 0, 0, '{}')",
        [],
    )
    .expect("Insert post2 failed");

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
    .expect("Create cat failed");

    // Run auto-categorization
    let categorized =
        auto_categorize_posts(&conn, "test_space").expect("Auto-categorize failed");
    assert_eq!(categorized, 1); // Only Twitter post should be categorized

    // Verify the Twitter post was categorized
    let post_categories = get_post_categories(&conn, "post1").expect("Get cat failed");
    assert_eq!(post_categories.len(), 1);
    assert_eq!(post_categories[0].name, "Twitter Only");

    // LinkedIn post should not be categorized
    let post_categories = get_post_categories(&conn, "post2").expect("Get cat failed");
    assert_eq!(post_categories.len(), 0);
}

#[test]
fn test_auto_categorize_by_keyword() {
    let conn = setup_test_db();

    // Create account and posts
    conn.execute(
        "INSERT INTO social_account (id, space_id, platform, username, display_name, encrypted_credentials, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
        [],
    )
    .expect("Insert account failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Exciting work project update', 0, 0, '{}')",
        [],
    )
    .expect("Insert post1 failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post2', 'account1', 'twitter', 'tweet2', 'user1', 'Random personal stuff', 0, 0, '{}')",
        [],
    )
    .expect("Insert post2 failed");

    // Create category with keyword filter
    let filters = CategoryFilters {
        platforms: None,
        authors: None,
        keywords: Some(vec!["work".to_string(), "project".to_string()]),
    };
    create_category(&conn, "test_space", "Work", None, None, Some(filters))
        .expect("Create cat failed");

    // Run auto-categorization
    let categorized =
        auto_categorize_posts(&conn, "test_space").expect("Auto-categorize failed");
    assert_eq!(categorized, 1); // Only post with "work" keyword

    // Verify post1 was categorized
    let post_categories = get_post_categories(&conn, "post1").expect("Get cat failed");
    assert_eq!(post_categories.len(), 1);
    assert_eq!(post_categories[0].name, "Work");

    // post2 should not be categorized
    let post_categories = get_post_categories(&conn, "post2").expect("Get cat failed");
    assert_eq!(post_categories.len(), 0);
}

#[test]
fn test_auto_categorize_keyword_with_special_chars() {
    let conn = setup_test_db();

    // Create account and post with special characters
    conn.execute(
        "INSERT INTO social_account (id, space_id, platform, username, display_name, encrypted_credentials, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
        [],
    )
    .expect("Insert account failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'C++ programming_tutorial', 0, 0, '{}')",
        [],
    )
    .expect("Insert post failed");

    // Create category with special characters in keywords
    let filters = CategoryFilters {
        platforms: None,
        authors: None,
        keywords: Some(vec!["C++".to_string(), "programming_tutorial".to_string()]),
    };
    create_category(&conn, "test_space", "Tech", None, None, Some(filters))
        .expect("Create cat failed");

    // Run auto-categorization - should handle % and _ escaping
    let categorized =
        auto_categorize_posts(&conn, "test_space").expect("Auto-categorize failed");
    assert_eq!(categorized, 1);

    let post_categories = get_post_categories(&conn, "post1").expect("Get cat failed");
    assert_eq!(post_categories.len(), 1);
}

#[test]
fn test_auto_categorize_no_duplicate_assignments() {
    let conn = setup_test_db();

    // Create account and post
    conn.execute(
        "INSERT INTO social_account (id, space_id, platform, username, display_name, encrypted_credentials, enabled, sync_frequency_minutes, created_at)
             VALUES ('account1', 'test_space', 'twitter', 'user1', 'User 1', x'00', 1, 60, 0)",
        [],
    )
    .expect("Insert account failed");

    conn.execute(
        "INSERT INTO social_post (id, account_id, platform, platform_post_id, author, content, timestamp, fetched_at, raw_json)
             VALUES ('post1', 'account1', 'twitter', 'tweet1', 'user1', 'Test content', 0, 0, '{}')",
        [],
    )
    .expect("Insert post failed");

    let filters = CategoryFilters {
        platforms: Some(vec!["twitter".to_string()]),
        authors: None,
        keywords: None,
    };
    create_category(&conn, "test_space", "Twitter", None, None, Some(filters))
        .expect("Create cat failed");

    // Run auto-categorization twice
    let categorized1 =
        auto_categorize_posts(&conn, "test_space").expect("Auto-categorize 1 failed");
        assert_eq!(categorized1, 1);

    let categorized2 =
        auto_categorize_posts(&conn, "test_space").expect("Auto-categorize 2 failed");
    assert_eq!(categorized2, 0); // No new assignments

    // Post should still have only one category
    let post_categories = get_post_categories(&conn, "post1").expect("Get cat failed");
    assert_eq!(post_categories.len(), 1);
}
