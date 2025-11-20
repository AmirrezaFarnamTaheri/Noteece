use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum PersonalModeError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Parse error: {0}")]
    Parse(String),
}

// ============================================================================
// HEALTH MODE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMetric {
    pub id: String,
    pub space_id: String,
    pub note_id: Option<String>,
    pub metric_type: String, // weight, blood_pressure, heart_rate, steps, sleep, water_intake, etc.
    pub value: f64,
    pub unit: String,
    pub notes: Option<String>,
    pub recorded_at: i64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthGoal {
    pub id: String,
    pub space_id: String,
    pub metric_type: String,
    pub target_value: f64,
    pub current_value: Option<f64>,
    pub unit: String,
    pub start_date: i64,
    pub end_date: Option<i64>,
    pub status: String, // active, completed, paused
    pub created_at: i64,
}

// ============================================================================
// FINANCE MODE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub space_id: String,
    pub note_id: Option<String>,
    pub transaction_type: String, // income, expense, transfer
    pub amount: f64,
    pub currency: String,
    pub category: String,
    pub account: String,
    pub description: Option<String>,
    pub date: i64,
    pub recurring: bool,
    pub recurring_frequency: Option<String>, // daily, weekly, monthly, yearly
    pub blob_id: Option<String>,             // receipt attachment
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Budget {
    pub id: String,
    pub space_id: String,
    pub category: String,
    pub amount: f64,
    pub currency: String,
    pub period: String, // weekly, monthly, yearly
    pub start_date: i64,
    pub end_date: Option<i64>,
    pub alert_threshold: Option<f64>, // percentage (e.g., 80.0 for 80%)
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceAccount {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub account_type: String, // checking, savings, credit, investment
    pub balance: f64,
    pub currency: String,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// RECIPE MODE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recipe {
    pub id: String,
    pub space_id: String,
    pub note_id: String,
    pub name: String,
    pub prep_time_minutes: Option<i32>,
    pub cook_time_minutes: Option<i32>,
    pub servings: i32,
    pub difficulty: String, // easy, medium, hard
    pub cuisine: Option<String>,
    pub diet_type: Option<String>, // vegetarian, vegan, gluten-free, etc.
    pub meal_type: Option<String>, // breakfast, lunch, dinner, snack, dessert
    pub image_blob_id: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecipeIngredient {
    pub id: String,
    pub recipe_id: String,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub notes: Option<String>,
    pub order_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MealPlan {
    pub id: String,
    pub space_id: String,
    pub date: i64,         // Date of the meal
    pub meal_type: String, // breakfast, lunch, dinner, snack
    pub recipe_id: Option<String>,
    pub notes: Option<String>,
    pub created_at: i64,
}

// ============================================================================
// TRAVEL MODE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trip {
    pub id: String,
    pub space_id: String,
    pub note_id: String,
    pub name: String,
    pub destination: String,
    pub start_date: i64,
    pub end_date: i64,
    pub status: String, // planning, upcoming, active, completed, cancelled
    pub budget: Option<f64>,
    pub currency: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItineraryItem {
    pub id: String,
    pub trip_id: String,
    pub date: i64,
    pub time: Option<String>, // HH:MM format
    pub item_type: String,    // flight, accommodation, activity, transport, meal
    pub title: String,
    pub location: Option<String>,
    pub notes: Option<String>,
    pub confirmation_number: Option<String>,
    pub cost: Option<f64>,
    pub order_index: i32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TravelDocument {
    pub id: String,
    pub trip_id: String,
    pub doc_type: String, // passport, visa, insurance, ticket, booking
    pub number: Option<String>,
    pub expiry_date: Option<i64>,
    pub blob_id: Option<String>,
    pub notes: Option<String>,
    pub created_at: i64,
}

// ============================================================================
// INITIALIZATION
// ============================================================================

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

// ============================================================================
// HEALTH MODE FUNCTIONS
// ============================================================================

pub fn create_health_metric(
    conn: &Connection,
    space_id: Ulid,
    metric_type: &str,
    value: f64,
    unit: &str,
    recorded_at: i64,
    note_id: Option<&str>,
    notes: Option<&str>,
) -> Result<HealthMetric, PersonalModeError> {
    if value < 0.0 {
        return Err(PersonalModeError::Validation(
            "Value must be positive".to_string(),
        ));
    }

    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();
    let note_id_param: Option<String> = note_id.map(|s| s.to_string());
    let notes_param: Option<String> = notes.map(|s| s.to_string());
    let recorded_at_i64: i64 = recorded_at as i64;
    let now_i64: i64 = now as i64;

    conn.execute(
        "INSERT INTO health_metric (id, space_id, note_id, metric_type, value, unit, notes, recorded_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            &id,
            &space_id.to_string(),
            &note_id_param,
            &metric_type,
            &value,
            &unit,
            &notes_param,
            &recorded_at_i64,
            &now_i64
        ],
    )?;

    Ok(HealthMetric {
        id,
        space_id: space_id.to_string(),
        note_id: note_id.map(String::from),
        metric_type: metric_type.to_string(),
        value,
        unit: unit.to_string(),
        notes: notes.map(String::from),
        recorded_at,
        created_at: now,
    })
}

pub fn get_health_metrics(
    conn: &Connection,
    space_id: Ulid,
    limit: u32,
    metric_type: Option<&str>,
) -> Result<Vec<HealthMetric>, PersonalModeError> {
    let sid = space_id.to_string();
    let lim = limit as i64;

    let mut result = Vec::new();

    if let Some(mt) = metric_type {
        let mut stmt = conn.prepare(
            "SELECT id, space_id, note_id, metric_type, value, unit, notes, recorded_at, created_at
             FROM health_metric WHERE space_id = ?1 AND metric_type = ?2
             ORDER BY recorded_at DESC LIMIT ?3",
        )?;
        let metrics = stmt.query_map(params![sid, mt, lim], |row| {
            Ok(HealthMetric {
                id: row.get(0)?,
                space_id: row.get(1)?,
                note_id: row.get(2)?,
                metric_type: row.get(3)?,
                value: row.get(4)?,
                unit: row.get(5)?,
                notes: row.get(6)?,
                recorded_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;
        for metric in metrics {
            result.push(metric?);
        }
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, space_id, note_id, metric_type, value, unit, notes, recorded_at, created_at
             FROM health_metric WHERE space_id = ?1
             ORDER BY recorded_at DESC LIMIT ?2",
        )?;
        let metrics = stmt.query_map(params![sid, lim], |row| {
            Ok(HealthMetric {
                id: row.get(0)?,
                space_id: row.get(1)?,
                note_id: row.get(2)?,
                metric_type: row.get(3)?,
                value: row.get(4)?,
                unit: row.get(5)?,
                notes: row.get(6)?,
                recorded_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;
        for metric in metrics {
            result.push(metric?);
        }
    }

    Ok(result)
}

pub fn get_health_metrics_since(
    conn: &Connection,
    space_id: &str,
    since_timestamp: i64,
) -> Result<Vec<HealthMetric>, PersonalModeError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, note_id, metric_type, value, unit, notes, recorded_at, created_at
         FROM health_metric WHERE space_id = ?1 AND recorded_at >= ?2
         ORDER BY recorded_at DESC",
    )?;
    let metrics = stmt.query_map(params![space_id, since_timestamp], |row| {
        Ok(HealthMetric {
            id: row.get(0)?,
            space_id: row.get(1)?,
            note_id: row.get(2)?,
            metric_type: row.get(3)?,
            value: row.get(4)?,
            unit: row.get(5)?,
            notes: row.get(6)?,
            recorded_at: row.get(7)?,
            created_at: row.get(8)?,
        })
    })?;
    let mut result = Vec::new();
    for metric in metrics {
        result.push(metric?);
    }
    Ok(result)
}

pub fn create_health_goal(
    conn: &Connection,
    space_id: Ulid,
    metric_type: &str,
    target_value: f64,
    unit: &str,
    start_date: i64,
    end_date: Option<i64>,
) -> Result<HealthGoal, PersonalModeError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO health_goal (id, space_id, metric_type, target_value, unit, start_date, end_date, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', ?8)",
        params![
            &id,
            &space_id.to_string(),
            metric_type,
            target_value,
            unit,
            start_date,
            end_date, // NULL when None
            now
        ],
    )?;

    Ok(HealthGoal {
        id,
        space_id: space_id.to_string(),
        metric_type: metric_type.to_string(),
        target_value,
        current_value: None,
        unit: unit.to_string(),
        start_date,
        end_date,
        status: "active".to_string(),
        created_at: now,
    })
}

// ============================================================================
// FINANCE MODE FUNCTIONS
// ============================================================================

pub fn create_transaction(
    conn: &Connection,
    space_id: Ulid,
    transaction_type: &str,
    amount: f64,
    currency: &str,
    category: &str,
    account: &str,
    date: i64,
    description: Option<&str>,
) -> Result<Transaction, PersonalModeError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO `transaction` (id, space_id, transaction_type, amount, currency, category, account, description, date, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        [
            &id,
            &space_id.to_string(),
            transaction_type,
            &amount.to_string(),
            currency,
            category,
            account,
            &description.unwrap_or("").to_string(),
            &date.to_string(),
            &now.to_string(),
        ],
    )?;

    Ok(Transaction {
        id,
        space_id: space_id.to_string(),
        note_id: None,
        transaction_type: transaction_type.to_string(),
        amount,
        currency: currency.to_string(),
        category: category.to_string(),
        account: account.to_string(),
        description: description.map(String::from),
        date,
        recurring: false,
        recurring_frequency: None,
        blob_id: None,
        created_at: now,
    })
}

pub fn get_transactions(
    conn: &Connection,
    space_id: Ulid,
    limit: u32,
) -> Result<Vec<Transaction>, PersonalModeError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, note_id, transaction_type, amount, currency, category, account,
                description, date, recurring, recurring_frequency, blob_id, created_at
         FROM `transaction` WHERE space_id = ?1
         ORDER BY date DESC LIMIT ?2",
    )?;

    let transactions = stmt.query_map([&space_id.to_string(), &limit.to_string()], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            space_id: row.get(1)?,
            note_id: row.get(2)?,
            transaction_type: row.get(3)?,
            amount: row.get(4)?,
            currency: row.get(5)?,
            category: row.get(6)?,
            account: row.get(7)?,
            description: row.get(8)?,
            date: row.get(9)?,
            recurring: row.get::<_, i32>(10)? == 1,
            recurring_frequency: row.get(11)?,
            blob_id: row.get(12)?,
            created_at: row.get(13)?,
        })
    })?;

    let mut result = Vec::new();
    for transaction in transactions {
        result.push(transaction?);
    }
    Ok(result)
}

pub fn get_transactions_since(
    conn: &Connection,
    space_id: &str,
    since_timestamp: i64,
) -> Result<Vec<Transaction>, PersonalModeError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, note_id, transaction_type, amount, currency, category, account,
                description, date, recurring, recurring_frequency, blob_id, created_at
         FROM `transaction` WHERE space_id = ?1 AND date >= ?2
         ORDER BY date DESC",
    )?;

    let transactions = stmt.query_map(params![space_id, since_timestamp], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            space_id: row.get(1)?,
            note_id: row.get(2)?,
            transaction_type: row.get(3)?,
            amount: row.get(4)?,
            currency: row.get(5)?,
            category: row.get(6)?,
            account: row.get(7)?,
            description: row.get(8)?,
            date: row.get(9)?,
            recurring: row.get::<_, i32>(10)? == 1,
            recurring_frequency: row.get(11)?,
            blob_id: row.get(12)?,
            created_at: row.get(13)?,
        })
    })?;

    let mut result = Vec::new();
    for transaction in transactions {
        result.push(transaction?);
    }
    Ok(result)
}

// ============================================================================
// RECIPE MODE FUNCTIONS
// ============================================================================

pub fn create_recipe(
    conn: &Connection,
    space_id: Ulid,
    note_id: &str,
    name: &str,
    servings: i32,
    difficulty: &str,
) -> Result<Recipe, PersonalModeError> {
    if servings <= 0 {
        return Err(PersonalModeError::Validation(
            "Servings must be positive".to_string(),
        ));
    }

    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO recipe (id, space_id, note_id, name, servings, difficulty, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        [
            &id,
            &space_id.to_string(),
            note_id,
            name,
            &servings.to_string(),
            difficulty,
            &now.to_string(),
        ],
    )?;

    Ok(Recipe {
        id,
        space_id: space_id.to_string(),
        note_id: note_id.to_string(),
        name: name.to_string(),
        prep_time_minutes: None,
        cook_time_minutes: None,
        servings,
        difficulty: difficulty.to_string(),
        cuisine: None,
        diet_type: None,
        meal_type: None,
        image_blob_id: None,
        created_at: now,
    })
}

pub fn add_recipe_ingredient(
    conn: &Connection,
    recipe_id: &str,
    name: &str,
    quantity: f64,
    unit: &str,
    order_index: i32,
) -> Result<RecipeIngredient, PersonalModeError> {
    let id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO recipe_ingredient (id, recipe_id, name, quantity, unit, order_index)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        [
            &id,
            recipe_id,
            name,
            &quantity.to_string(),
            unit,
            &order_index.to_string(),
        ],
    )?;

    Ok(RecipeIngredient {
        id,
        recipe_id: recipe_id.to_string(),
        name: name.to_string(),
        quantity,
        unit: unit.to_string(),
        notes: None,
        order_index,
    })
}

pub fn get_recipes(
    conn: &Connection,
    space_id: Ulid,
    limit: u32,
) -> Result<Vec<Recipe>, PersonalModeError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, note_id, name, prep_time_minutes, cook_time_minutes, servings,
                difficulty, cuisine, diet_type, meal_type, image_blob_id, created_at
         FROM recipe WHERE space_id = ?1
         ORDER BY created_at DESC LIMIT ?2",
    )?;

    let recipes = stmt.query_map([&space_id.to_string(), &limit.to_string()], |row| {
        Ok(Recipe {
            id: row.get(0)?,
            space_id: row.get(1)?,
            note_id: row.get(2)?,
            name: row.get(3)?,
            prep_time_minutes: row.get(4)?,
            cook_time_minutes: row.get(5)?,
            servings: row.get(6)?,
            difficulty: row.get(7)?,
            cuisine: row.get(8)?,
            diet_type: row.get(9)?,
            meal_type: row.get(10)?,
            image_blob_id: row.get(11)?,
            created_at: row.get(12)?,
        })
    })?;

    let mut result = Vec::new();
    for recipe in recipes {
        result.push(recipe?);
    }
    Ok(result)
}

// ============================================================================
// TRAVEL MODE FUNCTIONS
// ============================================================================

pub fn create_trip(
    conn: &Connection,
    space_id: Ulid,
    note_id: &str,
    name: &str,
    destination: &str,
    start_date: i64,
    end_date: i64,
) -> Result<Trip, PersonalModeError> {
    if end_date < start_date {
        return Err(PersonalModeError::Validation(
            "End date must be after start date".to_string(),
        ));
    }

    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO trip (id, space_id, note_id, name, destination, start_date, end_date, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'planning', ?8)",
        [
            &id,
            &space_id.to_string(),
            note_id,
            name,
            destination,
            &start_date.to_string(),
            &end_date.to_string(),
            &now.to_string(),
        ],
    )?;

    Ok(Trip {
        id,
        space_id: space_id.to_string(),
        note_id: note_id.to_string(),
        name: name.to_string(),
        destination: destination.to_string(),
        start_date,
        end_date,
        status: "planning".to_string(),
        budget: None,
        currency: None,
        created_at: now,
    })
}

pub fn add_itinerary_item(
    conn: &Connection,
    trip_id: &str,
    date: i64,
    item_type: &str,
    title: &str,
    order_index: i32,
) -> Result<ItineraryItem, PersonalModeError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO itinerary_item (id, trip_id, date, item_type, title, order_index, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        [
            &id,
            trip_id,
            &date.to_string(),
            item_type,
            title,
            &order_index.to_string(),
            &now.to_string(),
        ],
    )?;

    Ok(ItineraryItem {
        id,
        trip_id: trip_id.to_string(),
        date,
        time: None,
        item_type: item_type.to_string(),
        title: title.to_string(),
        location: None,
        notes: None,
        confirmation_number: None,
        cost: None,
        order_index,
        created_at: now,
    })
}

pub fn get_trips(
    conn: &Connection,
    space_id: Ulid,
    limit: u32,
) -> Result<Vec<Trip>, PersonalModeError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, note_id, name, destination, start_date, end_date, status, budget, currency, created_at
         FROM trip WHERE space_id = ?1
         ORDER BY start_date DESC LIMIT ?2",
    )?;

    let trips = stmt.query_map([&space_id.to_string(), &limit.to_string()], |row| {
        Ok(Trip {
            id: row.get(0)?,
            space_id: row.get(1)?,
            note_id: row.get(2)?,
            name: row.get(3)?,
            destination: row.get(4)?,
            start_date: row.get(5)?,
            end_date: row.get(6)?,
            status: row.get(7)?,
            budget: row.get(8)?,
            currency: row.get(9)?,
            created_at: row.get(10)?,
        })
    })?;

    let mut result = Vec::new();
    for trip in trips {
        result.push(trip?);
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_metric_validation() {
        // Negative values should be rejected
        assert!(matches!(
            create_health_metric(
                &Connection::open_in_memory().unwrap(),
                Ulid::new(),
                "weight",
                -10.0,
                "kg",
                0,
                None,
                None
            ),
            Err(PersonalModeError::Validation(_))
        ));
    }

    #[test]
    fn test_recipe_servings_validation() {
        // Zero or negative servings should be rejected
        assert!(matches!(
            create_recipe(
                &Connection::open_in_memory().unwrap(),
                Ulid::new(),
                "note_id",
                "Test Recipe",
                0,
                "easy"
            ),
            Err(PersonalModeError::Validation(_))
        ));
    }
}
