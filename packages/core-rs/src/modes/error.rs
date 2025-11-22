use thiserror::Error;

#[derive(Error, Debug)]
pub enum PersonalModeError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Parse error: {0}")]
    Parse(String),
}
