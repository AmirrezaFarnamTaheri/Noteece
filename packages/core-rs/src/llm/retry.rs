//! Auto-Retry with Exponential Backoff
//!
//! Provides robust retry mechanisms for LLM requests with:
//! - Exponential backoff with jitter
//! - Configurable retry policies
//! - Error classification (retryable vs non-retryable)
//! - Circuit breaker pattern

use std::time::Duration;
use tokio::time::sleep;

use super::error::LLMError;

/// Retry configuration
#[derive(Debug, Clone)]
pub struct RetryConfig {
    /// Maximum number of retry attempts
    pub max_retries: u32,
    /// Initial delay before first retry (ms)
    pub initial_delay_ms: u64,
    /// Maximum delay between retries (ms)
    pub max_delay_ms: u64,
    /// Multiplier for exponential backoff
    pub backoff_multiplier: f64,
    /// Whether to add jitter to delays
    pub use_jitter: bool,
    /// Jitter factor (0.0-1.0)
    pub jitter_factor: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 2.0,
            use_jitter: true,
            jitter_factor: 0.25,
        }
    }
}

impl RetryConfig {
    /// Create a conservative config for rate-limited APIs
    pub fn conservative() -> Self {
        Self {
            max_retries: 5,
            initial_delay_ms: 2000,
            max_delay_ms: 60000,
            backoff_multiplier: 2.5,
            use_jitter: true,
            jitter_factor: 0.3,
        }
    }

    /// Create an aggressive config for time-sensitive requests
    pub fn aggressive() -> Self {
        Self {
            max_retries: 2,
            initial_delay_ms: 500,
            max_delay_ms: 5000,
            backoff_multiplier: 1.5,
            use_jitter: true,
            jitter_factor: 0.1,
        }
    }

    /// Create config with no retries
    pub fn no_retry() -> Self {
        Self {
            max_retries: 0,
            ..Default::default()
        }
    }

    /// Calculate delay for a given attempt
    pub fn delay_for_attempt(&self, attempt: u32) -> Duration {
        let base_delay =
            self.initial_delay_ms as f64 * self.backoff_multiplier.powi(attempt as i32);
        let capped_delay = base_delay.min(self.max_delay_ms as f64);

        let final_delay = if self.use_jitter {
            let jitter_range = capped_delay * self.jitter_factor;
            let jitter = (rand_simple() * 2.0 - 1.0) * jitter_range;
            (capped_delay + jitter).max(0.0)
        } else {
            capped_delay
        };

        Duration::from_millis(final_delay as u64)
    }
}

/// Simple pseudo-random for jitter (no external dependency)
fn rand_simple() -> f64 {
    use std::time::SystemTime;
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .subsec_nanos();
    (nanos % 1000) as f64 / 1000.0
}

/// Classify whether an error is retryable
pub fn is_retryable(error: &LLMError) -> bool {
    match error {
        // Rate limiting is retryable
        LLMError::RateLimitExceeded => true,
        // Network errors are usually transient
        LLMError::NetworkError(_) => true,
        // Provider errors might be retryable
        LLMError::ProviderError(msg) => {
            let lower = msg.to_lowercase();
            lower.contains("timeout")
                || lower.contains("temporarily")
                || lower.contains("overloaded")
                || lower.contains("503")
                || lower.contains("502")
                || lower.contains("504")
                || lower.contains("529") // Overloaded
        }
        // These are not retryable
        LLMError::ConfigError(_) => false,
        LLMError::InvalidResponse(_) => false,
        LLMError::ValidationError(_) => false,
        LLMError::ProviderNotImplemented(_) => false,
        LLMError::CacheError(_) => false,
        LLMError::DatabaseError(_) => false,
        // Catch-all for any new variants
        _ => false,
    }
}

/// Result of a retry operation
#[derive(Debug)]
pub struct RetryResult<T> {
    /// The successful result (if any)
    pub result: Option<T>,
    /// All errors encountered
    pub errors: Vec<LLMError>,
    /// Number of attempts made
    pub attempts: u32,
    /// Total time spent (ms)
    pub total_time_ms: u64,
    /// Whether retry was successful
    pub success: bool,
}

impl<T> RetryResult<T> {
    /// Get the result or the last error
    pub fn into_result(self) -> Result<T, LLMError> {
        if let Some(result) = self.result {
            Ok(result)
        } else {
            Err(self
                .errors
                .into_iter()
                .last()
                .unwrap_or(LLMError::NetworkError("Unknown error".to_string())))
        }
    }
}

/// Execute an async operation with retry logic
pub async fn with_retry<T, F, Fut>(config: &RetryConfig, operation: F) -> RetryResult<T>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, LLMError>>,
{
    use tokio::time::Instant;

    let start = Instant::now();
    let mut errors = Vec::new();
    let mut attempt = 0u32;

    loop {
        match operation().await {
            Ok(result) => {
                return RetryResult {
                    result: Some(result),
                    errors,
                    attempts: attempt + 1,
                    total_time_ms: start.elapsed().as_millis() as u64,
                    success: true,
                };
            }
            Err(e) => {
                let should_retry = is_retryable(&e) && attempt < config.max_retries;
                errors.push(e);

                if should_retry {
                    let delay = config.delay_for_attempt(attempt);
                    log::warn!(
                        "[retry] Attempt {} failed, retrying in {:?}",
                        attempt + 1,
                        delay
                    );
                    sleep(delay).await;
                    attempt += 1;
                } else {
                    return RetryResult {
                        result: None,
                        errors,
                        attempts: attempt + 1,
                        total_time_ms: start.elapsed().as_millis() as u64,
                        success: false,
                    };
                }
            }
        }
    }
}

/// Circuit breaker state
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    /// Normal operation
    Closed,
    /// Failures detected, blocking requests
    Open,
    /// Testing if service recovered
    HalfOpen,
}

/// Circuit breaker for preventing cascade failures
pub struct CircuitBreaker {
    /// Current state
    state: CircuitState,
    /// Failure count
    failure_count: u32,
    /// Success count (for half-open)
    success_count: u32,
    /// Threshold to open circuit
    failure_threshold: u32,
    /// Successes needed to close circuit
    success_threshold: u32,
    /// Time to wait before half-open (ms)
    reset_timeout_ms: u64,
    /// Last failure timestamp
    last_failure_time: Option<u64>,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, success_threshold: u32, reset_timeout_ms: u64) -> Self {
        Self {
            state: CircuitState::Closed,
            failure_count: 0,
            success_count: 0,
            failure_threshold,
            success_threshold,
            reset_timeout_ms,
            last_failure_time: None,
        }
    }

    /// Check if request should be allowed
    pub fn should_allow(&mut self) -> bool {
        match self.state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                // Check if timeout has passed
                if let Some(last_failure) = self.last_failure_time {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64;

                    if now - last_failure >= self.reset_timeout_ms {
                        self.state = CircuitState::HalfOpen;
                        self.success_count = 0;
                        return true;
                    }
                }
                false
            }
            CircuitState::HalfOpen => true,
        }
    }

    /// Record a successful request
    pub fn record_success(&mut self) {
        match self.state {
            CircuitState::Closed => {
                self.failure_count = 0;
            }
            CircuitState::HalfOpen => {
                self.success_count += 1;
                if self.success_count >= self.success_threshold {
                    self.state = CircuitState::Closed;
                    self.failure_count = 0;
                    self.success_count = 0;
                    log::info!("[circuit] Circuit closed after recovery");
                }
            }
            CircuitState::Open => {}
        }
    }

    /// Record a failed request
    pub fn record_failure(&mut self) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        self.last_failure_time = Some(now);

        match self.state {
            CircuitState::Closed => {
                self.failure_count += 1;
                if self.failure_count >= self.failure_threshold {
                    self.state = CircuitState::Open;
                    log::warn!(
                        "[circuit] Circuit opened after {} failures",
                        self.failure_count
                    );
                }
            }
            CircuitState::HalfOpen => {
                self.state = CircuitState::Open;
                self.success_count = 0;
                log::warn!("[circuit] Circuit re-opened after half-open failure");
            }
            CircuitState::Open => {}
        }
    }

    /// Get current state
    pub fn state(&self) -> CircuitState {
        self.state
    }

    /// Reset the circuit breaker
    pub fn reset(&mut self) {
        self.state = CircuitState::Closed;
        self.failure_count = 0;
        self.success_count = 0;
        self.last_failure_time = None;
    }
}

impl Default for CircuitBreaker {
    fn default() -> Self {
        Self::new(5, 3, 30000) // Open after 5 failures, need 3 successes, 30s timeout
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retry_config_defaults() {
        let config = RetryConfig::default();
        assert_eq!(config.max_retries, 3);
        assert!(config.use_jitter);
    }

    #[test]
    fn test_delay_calculation() {
        let config = RetryConfig {
            initial_delay_ms: 1000,
            backoff_multiplier: 2.0,
            max_delay_ms: 10000,
            use_jitter: false,
            ..Default::default()
        };

        // Without jitter, delays should be predictable
        assert_eq!(config.delay_for_attempt(0).as_millis(), 1000);
        assert_eq!(config.delay_for_attempt(1).as_millis(), 2000);
        assert_eq!(config.delay_for_attempt(2).as_millis(), 4000);
        assert_eq!(config.delay_for_attempt(3).as_millis(), 8000);
        // Should cap at max
        assert_eq!(config.delay_for_attempt(10).as_millis(), 10000);
    }

    #[test]
    fn test_is_retryable() {
        assert!(is_retryable(&LLMError::RateLimitExceeded));
        assert!(is_retryable(&LLMError::NetworkError("timeout".to_string())));
        assert!(!is_retryable(&LLMError::ConfigError(
            "bad config".to_string()
        )));
    }

    #[test]
    fn test_circuit_breaker_closed() {
        let mut cb = CircuitBreaker::new(3, 2, 1000);

        assert_eq!(cb.state(), CircuitState::Closed);
        assert!(cb.should_allow());

        // Record some successes
        cb.record_success();
        cb.record_success();
        assert_eq!(cb.state(), CircuitState::Closed);
    }

    #[test]
    fn test_circuit_breaker_open() {
        let mut cb = CircuitBreaker::new(3, 2, 1000);

        // Record failures to open circuit
        cb.record_failure();
        cb.record_failure();
        assert_eq!(cb.state(), CircuitState::Closed);

        cb.record_failure();
        assert_eq!(cb.state(), CircuitState::Open);
        assert!(!cb.should_allow());
    }

    #[tokio::test]
    async fn test_with_retry_success() {
        let config = RetryConfig::no_retry();
        let call_count = std::sync::atomic::AtomicUsize::new(0);

        let result = with_retry(&config, || {
            call_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            async { Ok::<_, LLMError>("success") }
        })
        .await;

        assert!(result.success);
        assert_eq!(result.attempts, 1);
        assert_eq!(call_count.load(std::sync::atomic::Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn test_with_retry_eventual_success() {
        let config = RetryConfig {
            max_retries: 3,
            initial_delay_ms: 10, // Fast for testing
            use_jitter: false,
            ..Default::default()
        };

        let attempt = std::sync::atomic::AtomicU32::new(0);

        let result = with_retry(&config, || {
            let current = attempt.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            async move {
                if current < 2 {
                    Err(LLMError::RateLimitExceeded)
                } else {
                    Ok("success")
                }
            }
        })
        .await;

        assert!(result.success);
        assert_eq!(result.attempts, 3);
        assert_eq!(result.errors.len(), 2);
    }
}
