use serde::{Deserialize, Serialize};

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
