//! LLM Error Types
//!
//! Comprehensive error handling for LLM operations

use thiserror::Error;

/// All possible LLM errors
#[derive(Error, Debug)]
pub enum LLMError {
    /// Provider returned an error
    #[error("Provider error: {0}")]
    ProviderError(String),

    /// Provider not yet implemented
    #[error("Provider not implemented: {0}")]
    ProviderNotImplemented(String),

    /// Configuration error
    #[error("Configuration error: {0}")]
    ConfigError(String),

    /// Network/connection error
    #[error("Network error: {0}")]
    NetworkError(String),

    /// JSON serialization/deserialization error
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    /// Database error
    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    /// HTTP error
    #[error("HTTP error: {0}")]
    HttpError(String),

    /// Invalid response from provider
    #[error("Invalid response: {0}")]
    InvalidResponse(String),

    /// Rate limit exceeded
    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    /// Token limit exceeded
    #[error("Token limit exceeded")]
    TokenLimitExceeded,

    /// Model not found
    #[error("Model not found: {0}")]
    ModelNotFound(String),

    /// Validation error
    #[error("Validation error: {0}")]
    ValidationError(String),

    /// Cache error
    #[error("Cache error: {0}")]
    CacheError(String),

    /// Timeout error
    #[error("Timeout: {0}")]
    Timeout(String),

    /// Budget exceeded
    #[error("Budget exceeded: {0}")]
    BudgetExceeded(String),

    /// Circuit breaker open
    #[error("Circuit breaker open - service unavailable")]
    CircuitBreakerOpen,

    /// Queue full
    #[error("Request queue full")]
    QueueFull,

    /// Request cancelled
    #[error("Request cancelled")]
    Cancelled,

    /// Content filtered
    #[error("Content filtered: {0}")]
    ContentFiltered(String),

    /// Streaming error
    #[error("Streaming error: {0}")]
    StreamingError(String),
}

impl LLMError {
    /// Check if this error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            LLMError::RateLimitExceeded
                | LLMError::NetworkError(_)
                | LLMError::Timeout(_)
                | LLMError::ProviderError(ref msg) if is_transient_error(msg)
        )
    }

    /// Check if this is a client error (bad request)
    pub fn is_client_error(&self) -> bool {
        matches!(
            self,
            LLMError::ConfigError(_)
                | LLMError::ValidationError(_)
                | LLMError::TokenLimitExceeded
                | LLMError::ContentFiltered(_)
        )
    }

    /// Check if this is a server/provider error
    pub fn is_server_error(&self) -> bool {
        matches!(
            self,
            LLMError::ProviderError(_)
                | LLMError::RateLimitExceeded
                | LLMError::CircuitBreakerOpen
        )
    }
}

/// Check if an error message indicates a transient error
fn is_transient_error(msg: &str) -> bool {
    let lower = msg.to_lowercase();
    lower.contains("timeout")
        || lower.contains("temporarily")
        || lower.contains("overloaded")
        || lower.contains("503")
        || lower.contains("502")
        || lower.contains("504")
        || lower.contains("529")
        || lower.contains("retry")
}

/// Result type alias for LLM operations
pub type LLMResult<T> = Result<T, LLMError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_retryable() {
        assert!(LLMError::RateLimitExceeded.is_retryable());
        assert!(LLMError::NetworkError("connection reset".to_string()).is_retryable());
        assert!(LLMError::Timeout("request timed out".to_string()).is_retryable());

        assert!(!LLMError::ConfigError("bad config".to_string()).is_retryable());
        assert!(!LLMError::ValidationError("invalid json".to_string()).is_retryable());
    }

    #[test]
    fn test_error_client() {
        assert!(LLMError::ConfigError("test".to_string()).is_client_error());
        assert!(LLMError::ValidationError("test".to_string()).is_client_error());
        assert!(LLMError::TokenLimitExceeded.is_client_error());

        assert!(!LLMError::RateLimitExceeded.is_client_error());
    }

    #[test]
    fn test_error_server() {
        assert!(LLMError::ProviderError("server error".to_string()).is_server_error());
        assert!(LLMError::RateLimitExceeded.is_server_error());
        assert!(LLMError::CircuitBreakerOpen.is_server_error());

        assert!(!LLMError::ConfigError("test".to_string()).is_server_error());
    }

    #[test]
    fn test_transient_detection() {
        assert!(LLMError::ProviderError("timeout occurred".to_string()).is_retryable());
        assert!(LLMError::ProviderError("503 Service Unavailable".to_string()).is_retryable());
        assert!(!LLMError::ProviderError("invalid api key".to_string()).is_retryable());
    }
}
