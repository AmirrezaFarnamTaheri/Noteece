use crate::state::DbConnection;
use core_rs::personal_modes::*;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn create_health_metric_cmd(
    db: State<DbConnection>,
    space_id: String,
    metric_type: String,
    value: f64,
    unit: String,
) -> Result<HealthMetric, String> {
    crate::with_db!(db, conn, {
        let params = core_rs::personal_modes::CreateHealthMetricParams {
            space_id: Ulid::from_string(&space_id).map_err(|e| e.to_string())?,
            metric_type: &metric_type,
            value,
            unit: &unit,
            recorded_at: chrono::Utc::now().timestamp(),
            notes: None,
            _id: None,
        };
        core_rs::personal_modes::create_health_metric(&conn, params).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_health_metrics_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<HealthMetric>, String> {
    crate::with_db!(db, conn, {
        core_rs::personal_modes::get_health_metrics(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, 100, None).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_transaction_cmd(
    db: State<DbConnection>,
    space_id: String,
    amount: f64,
    category: String,
    description: String,
) -> Result<Transaction, String> {
    crate::with_db!(db, conn, {
        let params = core_rs::personal_modes::CreateTransactionParams {
            space_id: Ulid::from_string(&space_id).map_err(|e| e.to_string())?,
            transaction_type: "expense",
            amount,
            currency: "USD",
            category: &category,
            account_id: "default",
            date: chrono::Utc::now().timestamp(),
            description: Some(&description),
        };
        core_rs::personal_modes::create_transaction(&conn, params).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_transactions_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Transaction>, String> {
    crate::with_db!(db, conn, {
        core_rs::personal_modes::get_transactions(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, 100).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_recipe_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    ingredients: String,
    instructions: String,
) -> Result<Recipe, String> {
    crate::with_db!(db, conn, {
        let note = core_rs::note::create_note(&conn, &space_id, &name, &instructions).map_err(|e| e.to_string())?;
        core_rs::personal_modes::create_recipe(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, &note.id.to_string(), &name, 4, "medium").map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recipes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Recipe>, String> {
    crate::with_db!(db, conn, {
        core_rs::personal_modes::get_recipes(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, 100).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_trip_cmd(
    db: State<DbConnection>,
    space_id: String,
    destination: String,
    start_date: i64,
    end_date: i64,
) -> Result<Trip, String> {
    crate::with_db!(db, conn, {
        let note = core_rs::note::create_note(&conn, &space_id, &format!("Trip to {}", destination), "").map_err(|e| e.to_string())?;
        core_rs::personal_modes::create_trip(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, &note.id.to_string(), &format!("Trip to {}", destination), &destination, start_date, end_date).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_trips_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Trip>, String> {
    crate::with_db!(db, conn, {
        core_rs::personal_modes::get_trips(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, 100).map_err(|e| e.to_string())
    })
}

// Goal & Habit Commands
use core_rs::goals::*;
use core_rs::habits::*;

#[tauri::command]
pub fn create_goal_cmd(db: State<DbConnection>, space_id: String, title: String, target: f64, category: String) -> Result<Goal, String> {
    crate::with_db!(db, conn, {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::goals::create_goal(&conn, space_id, &title, target, &category).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_goals_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Goal>, String> {
    crate::with_db!(db, conn, {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::goals::get_goals(&conn, space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_goal_progress_cmd(db: State<DbConnection>, goal_id: String, current: f64) -> Result<Goal, String> {
    crate::with_db!(db, conn, {
        let goal_id = Ulid::from_string(&goal_id).map_err(|e| e.to_string())?;
        core_rs::goals::update_goal_progress(&conn, goal_id, current).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_goal_cmd(db: State<DbConnection>, goal_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&goal_id).map_err(|e| e.to_string())?;
        core_rs::goals::delete_goal(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_habit_cmd(db: State<DbConnection>, space_id: String, name: String, frequency: String) -> Result<Habit, String> {
    crate::with_db!(db, conn, {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::habits::create_habit(&conn, space_id, &name, &frequency).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_habits_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Habit>, String> {
    crate::with_db!(db, conn, {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::habits::get_habits(&conn, space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn complete_habit_cmd(db: State<DbConnection>, habit_id: String) -> Result<Habit, String> {
    crate::with_db!(db, conn, {
        let habit_id = Ulid::from_string(&habit_id).map_err(|e| e.to_string())?;
        core_rs::habits::complete_habit(&conn, habit_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_habit_cmd(db: State<DbConnection>, habit_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let habit_id = Ulid::from_string(&habit_id).map_err(|e| e.to_string())?;
        core_rs::habits::delete_habit(&conn, habit_id).map_err(|e| e.to_string())
    })
}
