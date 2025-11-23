use crate::db::DbError;
use crate::mode::{disable_mode, enable_mode, Mode};
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

// --- Constants ---

pub const MODE_TRAVEL: &str = "travel";
pub const MODE_FINANCE: &str = "finance";
pub const MODE_HEALTH: &str = "health";

pub fn init_personal_modes_tables(conn: &Connection) -> Result<(), DbError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS health_metric (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            metric_type TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT NOT NULL,
            notes TEXT,
            recorded_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS transaction_log (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            category TEXT NOT NULL,
            account_id TEXT NOT NULL,
            date INTEGER NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS recipe (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            note_id TEXT NOT NULL,
            name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            difficulty TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS trip (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            note_id TEXT NOT NULL,
            name TEXT NOT NULL,
            destination TEXT NOT NULL,
            start_date INTEGER NOT NULL,
            end_date INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    Ok(())
}

// --- Structs ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HealthMetric {
    pub id: String,
    pub space_id: String,
    pub metric_type: String,
    pub value: f64,
    pub unit: String,
    pub notes: Option<String>,
    pub recorded_at: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: String,
    pub space_id: String,
    pub transaction_type: String, // 'income' or 'expense'
    pub amount: f64,
    pub currency: String,
    pub category: String,
    pub account_id: String,
    pub date: i64,
    pub description: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Recipe {
    pub id: String,
    pub space_id: String,
    pub note_id: String, // Link to the note containing the full recipe
    pub name: String,
    pub rating: i32,        // 1-5
    pub difficulty: String, // 'easy', 'medium', 'hard'
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Trip {
    pub id: String,
    pub space_id: String,
    pub note_id: String, // Link to main trip note
    pub name: String,
    pub destination: String,
    pub start_date: i64,
    pub end_date: i64,
    pub created_at: i64,
}

// --- Mode Helpers ---

pub fn get_travel_mode() -> Mode {
    Mode {
        id: MODE_TRAVEL.to_string(),
        name: "Travel".to_string(),
    }
}

pub fn get_finance_mode() -> Mode {
    Mode {
        id: MODE_FINANCE.to_string(),
        name: "Finance".to_string(),
    }
}

pub fn get_health_mode() -> Mode {
    Mode {
        id: MODE_HEALTH.to_string(),
        name: "Health".to_string(),
    }
}

pub fn enable_travel_mode(conn: &Connection, space_id: &str) -> Result<(), DbError> {
    enable_mode(conn, space_id, &get_travel_mode())
}

pub fn disable_travel_mode(conn: &Connection, space_id: &str) -> Result<(), DbError> {
    disable_mode(conn, space_id, &get_travel_mode())
}

pub fn enable_finance_mode(conn: &Connection, space_id: &str) -> Result<(), DbError> {
    enable_mode(conn, space_id, &get_finance_mode())
}

pub fn disable_finance_mode(conn: &Connection, space_id: &str) -> Result<(), DbError> {
    disable_mode(conn, space_id, &get_finance_mode())
}

pub fn enable_health_mode(conn: &Connection, space_id: &str) -> Result<(), DbError> {
    enable_mode(conn, space_id, &get_health_mode())
}

pub fn disable_health_mode(conn: &Connection, space_id: &str) -> Result<(), DbError> {
    disable_mode(conn, space_id, &get_health_mode())
}

// --- Health Logic ---

pub fn create_health_metric(
    conn: &Connection,
    space_id: Ulid,
    metric_type: &str,
    value: f64,
    unit: &str,
    recorded_at: i64,
    notes: Option<&str>,
    _id: Option<Ulid>,
) -> Result<HealthMetric, DbError> {
    let id = Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO health_metric (id, space_id, metric_type, value, unit, notes, recorded_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
        rusqlite::params![
            &id,
            space_id.to_string(),
            metric_type,
            value,
            unit,
            notes,
            recorded_at,
            now
        ],
    )?;

    Ok(HealthMetric {
        id,
        space_id: space_id.to_string(),
        metric_type: metric_type.to_string(),
        value,
        unit: unit.to_string(),
        notes: notes.map(|s| s.to_string()),
        recorded_at,
        created_at: now,
        updated_at: now,
    })
}

pub fn get_health_metrics(
    conn: &Connection,
    space_id: Ulid,
    limit: i64,
    metric_type: Option<&str>,
) -> Result<Vec<HealthMetric>, DbError> {
    // Avoid incompatible closure types by executing different logic paths entirely
    // or by boxing the iterator (which is complex with rusqlite).
    // Simplest: Duplicate the query execution block to return Vec directly.

    if let Some(mt) = metric_type {
        let mut stmt = conn.prepare("SELECT id, space_id, metric_type, value, unit, notes, recorded_at, created_at, updated_at FROM health_metric WHERE space_id = ?1 AND metric_type = ?2 ORDER BY recorded_at DESC LIMIT ?3")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), mt, limit], |row| {
            Ok(HealthMetric {
                id: row.get(0)?,
                space_id: row.get(1)?,
                metric_type: row.get(2)?,
                value: row.get(3)?,
                unit: row.get(4)?,
                notes: row.get(5)?,
                recorded_at: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
    } else {
        let mut stmt = conn.prepare("SELECT id, space_id, metric_type, value, unit, notes, recorded_at, created_at, updated_at FROM health_metric WHERE space_id = ?1 ORDER BY recorded_at DESC LIMIT ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), limit], |row| {
            Ok(HealthMetric {
                id: row.get(0)?,
                space_id: row.get(1)?,
                metric_type: row.get(2)?,
                value: row.get(3)?,
                unit: row.get(4)?,
                notes: row.get(5)?,
                recorded_at: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
    }
}

pub fn get_health_metrics_since(
    conn: &Connection,
    space_id: &str, // Changed to &str to match usage in correlation.rs
    since: i64,
) -> Result<Vec<HealthMetric>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, metric_type, value, unit, notes, recorded_at, created_at, updated_at
         FROM health_metric
         WHERE space_id = ?1 AND recorded_at >= ?2
         ORDER BY recorded_at ASC",
    )?;

    let rows = stmt.query_map(rusqlite::params![space_id, since], |row| {
        Ok(HealthMetric {
            id: row.get(0)?,
            space_id: row.get(1)?,
            metric_type: row.get(2)?,
            value: row.get(3)?,
            unit: row.get(4)?,
            notes: row.get(5)?,
            recorded_at: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

// --- Finance Logic ---

pub fn create_transaction(
    conn: &Connection,
    space_id: Ulid,
    transaction_type: &str,
    amount: f64,
    currency: &str,
    category: &str,
    account_id: &str,
    date: i64,
    description: Option<&str>,
) -> Result<Transaction, DbError> {
    let id = Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO transaction_log (id, space_id, type, amount, currency, category, account_id, date, description, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            &id,
            space_id.to_string(),
            transaction_type,
            amount,
            currency,
            category,
            account_id,
            date,
            description,
            now
        ],
    )?;

    Ok(Transaction {
        id,
        space_id: space_id.to_string(),
        transaction_type: transaction_type.to_string(),
        amount,
        currency: currency.to_string(),
        category: category.to_string(),
        account_id: account_id.to_string(),
        date,
        description: description.map(|s| s.to_string()),
        created_at: now,
    })
}

pub fn get_transactions(
    conn: &Connection,
    space_id: Ulid,
    limit: i64,
) -> Result<Vec<Transaction>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, type, amount, currency, category, account_id, date, description, created_at
         FROM transaction_log
         WHERE space_id = ?1
         ORDER BY date DESC LIMIT ?2"
    )?;

    let rows = stmt.query_map(rusqlite::params![space_id.to_string(), limit], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            space_id: row.get(1)?,
            transaction_type: row.get(2)?,
            amount: row.get(3)?,
            currency: row.get(4)?,
            category: row.get(5)?,
            account_id: row.get(6)?,
            date: row.get(7)?,
            description: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

pub fn get_transactions_since(
    conn: &Connection,
    space_id: &str, // Changed to &str
    since: i64,
) -> Result<Vec<Transaction>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, type, amount, currency, category, account_id, date, description, created_at
         FROM transaction_log
         WHERE space_id = ?1 AND date >= ?2
         ORDER BY date ASC"
    )?;

    let rows = stmt.query_map(rusqlite::params![space_id, since], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            space_id: row.get(1)?,
            transaction_type: row.get(2)?,
            amount: row.get(3)?,
            currency: row.get(4)?,
            category: row.get(5)?,
            account_id: row.get(6)?,
            date: row.get(7)?,
            description: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

// --- Recipe Logic ---

pub fn create_recipe(
    conn: &Connection,
    space_id: Ulid,
    note_id: &str,
    name: &str,
    rating: i32,
    difficulty: &str,
) -> Result<Recipe, DbError> {
    let id = Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO recipe (id, space_id, note_id, name, rating, difficulty, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            &id,
            space_id.to_string(),
            note_id,
            name,
            rating,
            difficulty,
            now
        ],
    )?;

    Ok(Recipe {
        id,
        space_id: space_id.to_string(),
        note_id: note_id.to_string(),
        name: name.to_string(),
        rating,
        difficulty: difficulty.to_string(),
        created_at: now,
    })
}

pub fn get_recipes(conn: &Connection, space_id: Ulid, limit: i64) -> Result<Vec<Recipe>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, note_id, name, rating, difficulty, created_at
         FROM recipe
         WHERE space_id = ?1
         ORDER BY created_at DESC LIMIT ?2",
    )?;

    let rows = stmt.query_map(rusqlite::params![space_id.to_string(), limit], |row| {
        Ok(Recipe {
            id: row.get(0)?,
            space_id: row.get(1)?,
            note_id: row.get(2)?,
            name: row.get(3)?,
            rating: row.get(4)?,
            difficulty: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

// --- Trip Logic ---

pub fn create_trip(
    conn: &Connection,
    space_id: Ulid,
    note_id: &str,
    name: &str,
    destination: &str,
    start_date: i64,
    end_date: i64,
) -> Result<Trip, DbError> {
    let id = Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO trip (id, space_id, note_id, name, destination, start_date, end_date, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![&id, space_id.to_string(), note_id, name, destination, start_date, end_date, now],
    )?;

    Ok(Trip {
        id,
        space_id: space_id.to_string(),
        note_id: note_id.to_string(),
        name: name.to_string(),
        destination: destination.to_string(),
        start_date,
        end_date,
        created_at: now,
    })
}

pub fn get_trips(conn: &Connection, space_id: Ulid, limit: i64) -> Result<Vec<Trip>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, note_id, name, destination, start_date, end_date, created_at
         FROM trip
         WHERE space_id = ?1
         ORDER BY start_date DESC LIMIT ?2",
    )?;

    let rows = stmt.query_map(rusqlite::params![space_id.to_string(), limit], |row| {
        Ok(Trip {
            id: row.get(0)?,
            space_id: row.get(1)?,
            note_id: row.get(2)?,
            name: row.get(3)?,
            destination: row.get(4)?,
            start_date: row.get(5)?,
            end_date: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}
