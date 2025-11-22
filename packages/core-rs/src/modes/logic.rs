use chrono::Utc;
use rusqlite::{params, Connection};
use ulid::Ulid;
use crate::modes::error::PersonalModeError;
use crate::modes::models::{
    HealthMetric, HealthGoal, Transaction, Recipe, RecipeIngredient, Trip, ItineraryItem
};

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
