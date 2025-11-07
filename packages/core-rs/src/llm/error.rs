// LLM Error Types

use thiserror::Error;

#[derive(Error, Debug)]
pub enum LLMError {
    #[error("Provider error: {0}")]
    ProviderError(String),

    #[error("Provider not implemented: {0}")]
    ProviderNotImplemented(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    #[error("HTTP error: {0}")]
    HttpError(String),

    #[error("Invalid response: {0}")]
    InvalidResponse(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Token limit exceeded")]
    TokenLimitExceeded,

    #[error("Model not found: {0}")]
    ModelNotFound(String),
}
