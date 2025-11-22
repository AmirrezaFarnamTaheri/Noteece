use rusqlite::Connection;
use crate::modes::error::PersonalModeError;

pub fn init_personal_modes_tables(conn: &Connection) -> Result<(), PersonalModeError> {
    // Health Mode Tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS health_metric (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            note_id TEXT,
            metric_type TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT NOT NULL,
            notes TEXT,
            recorded_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS health_goal (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            metric_type TEXT NOT NULL,
            target_value REAL NOT NULL,
            current_value REAL,
            unit TEXT NOT NULL,
            start_date INTEGER NOT NULL,
            end_date INTEGER,
            status TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Finance Mode Tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS `transaction` (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            note_id TEXT,
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'USD',
            category TEXT NOT NULL,
            account TEXT NOT NULL,
            description TEXT,
            date INTEGER NOT NULL,
            recurring INTEGER NOT NULL DEFAULT 0,
            recurring_frequency TEXT,
            blob_id TEXT,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS budget (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'USD',
            period TEXT NOT NULL,
            start_date INTEGER NOT NULL,
            end_date INTEGER,
            alert_threshold REAL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS finance_account (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            name TEXT NOT NULL,
            account_type TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'USD',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Recipe Mode Tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS recipe (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            note_id TEXT NOT NULL,
            name TEXT NOT NULL,
            prep_time_minutes INTEGER,
            cook_time_minutes INTEGER,
            servings INTEGER NOT NULL DEFAULT 1,
            difficulty TEXT NOT NULL DEFAULT 'medium',
            cuisine TEXT,
            diet_type TEXT,
            meal_type TEXT,
            image_blob_id TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS recipe_ingredient (
            id TEXT PRIMARY KEY,
            recipe_id TEXT NOT NULL,
            name TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            notes TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS meal_plan (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            date INTEGER NOT NULL,
            meal_type TEXT NOT NULL,
            recipe_id TEXT,
            notes TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE SET NULL
        )",
        [],
    )?;

    // Travel Mode Tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS trip (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            note_id TEXT NOT NULL,
            name TEXT NOT NULL,
            destination TEXT NOT NULL,
            start_date INTEGER NOT NULL,
            end_date INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'planning',
            budget REAL,
            currency TEXT DEFAULT 'USD',
            created_at INTEGER NOT NULL,
            FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS itinerary_item (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL,
            date INTEGER NOT NULL,
            time TEXT,
            item_type TEXT NOT NULL,
            title TEXT NOT NULL,
            location TEXT,
            notes TEXT,
            confirmation_number TEXT,
            cost REAL,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (trip_id) REFERENCES trip(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS travel_document (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            number TEXT,
            expiry_date INTEGER,
            blob_id TEXT,
            notes TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (trip_id) REFERENCES trip(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Create indexes for better query performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_health_metric_space ON health_metric(space_id, recorded_at DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_transaction_space ON `transaction`(space_id, date DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_recipe_space ON recipe(space_id, created_at DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_trip_space ON trip(space_id, start_date DESC)",
        [],
    )?;

    Ok(())
}
