use thiserror::Error;

#[derive(Error, Debug)]
pub enum CalDavError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Network error: {0}")]
    Network(String),
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Authentication error")]
    Authentication,
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("Sync conflict: {0}")]
    Conflict(String),
    #[error("Account not found")]
    AccountNotFound,
}
