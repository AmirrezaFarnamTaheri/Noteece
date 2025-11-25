//! Batch Processing for LLM Requests
//!
//! Enables efficient processing of multiple LLM requests with:
//! - Concurrent execution with configurable parallelism
//! - Progress tracking and callbacks
//! - Partial failure handling
//! - Rate limiting awareness

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::Semaphore;

use super::error::LLMError;
use super::types::{LLMRequest, LLMResponse};

/// Configuration for batch processing
#[derive(Debug, Clone)]
pub struct BatchConfig {
    /// Maximum concurrent requests
    pub max_concurrency: usize,
    /// Whether to continue on individual failures
    pub continue_on_error: bool,
    /// Maximum retries per request
    pub max_retries: u32,
    /// Delay between retries (ms)
    pub retry_delay_ms: u64,
}

impl Default for BatchConfig {
    fn default() -> Self {
        Self {
            max_concurrency: 5,
            continue_on_error: true,
            max_retries: 3,
            retry_delay_ms: 1000,
        }
    }
}

impl BatchConfig {
    /// Create a conservative config for rate-limited APIs
    pub fn conservative() -> Self {
        Self {
            max_concurrency: 2,
            continue_on_error: true,
            max_retries: 5,
            retry_delay_ms: 2000,
        }
    }

    /// Create an aggressive config for high-throughput scenarios
    pub fn aggressive() -> Self {
        Self {
            max_concurrency: 10,
            continue_on_error: true,
            max_retries: 2,
            retry_delay_ms: 500,
        }
    }
}

/// Result of a single batch item
#[derive(Debug, Clone)]
pub struct BatchItemResult {
    /// Index in the original batch
    pub index: usize,
    /// The original request
    pub request: LLMRequest,
    /// The response (if successful)
    pub response: Option<LLMResponse>,
    /// Error (if failed)
    pub error: Option<String>,
    /// Number of retries attempted
    pub retries: u32,
    /// Processing time in milliseconds
    pub duration_ms: u64,
}

impl BatchItemResult {
    /// Check if this item succeeded
    pub fn is_success(&self) -> bool {
        self.response.is_some()
    }

    /// Check if this item failed
    pub fn is_error(&self) -> bool {
        self.error.is_some()
    }
}

/// Progress tracking for batch operations
#[derive(Debug, Clone)]
pub struct BatchProgress {
    /// Total items in batch
    pub total: usize,
    /// Completed items (success + failed)
    pub completed: usize,
    /// Successfully processed
    pub succeeded: usize,
    /// Failed items
    pub failed: usize,
    /// Currently processing
    pub in_progress: usize,
}

impl BatchProgress {
    pub fn new(total: usize) -> Self {
        Self {
            total,
            completed: 0,
            succeeded: 0,
            failed: 0,
            in_progress: 0,
        }
    }

    /// Get completion percentage
    pub fn percentage(&self) -> f32 {
        if self.total == 0 {
            100.0
        } else {
            (self.completed as f32 / self.total as f32) * 100.0
        }
    }

    /// Check if batch is complete
    pub fn is_complete(&self) -> bool {
        self.completed >= self.total
    }
}

/// Batch result containing all processed items
#[derive(Debug)]
pub struct BatchResult {
    /// All item results
    pub items: Vec<BatchItemResult>,
    /// Total processing time
    pub total_duration_ms: u64,
    /// Final progress state
    pub progress: BatchProgress,
}

impl BatchResult {
    /// Get all successful responses
    pub fn successes(&self) -> Vec<&LLMResponse> {
        self.items
            .iter()
            .filter_map(|item| item.response.as_ref())
            .collect()
    }

    /// Get all failures
    pub fn failures(&self) -> Vec<&BatchItemResult> {
        self.items.iter().filter(|item| item.is_error()).collect()
    }

    /// Get success rate
    pub fn success_rate(&self) -> f32 {
        if self.items.is_empty() {
            100.0
        } else {
            (self.progress.succeeded as f32 / self.items.len() as f32) * 100.0
        }
    }

    /// Get total tokens used across all successful requests
    pub fn total_tokens(&self) -> usize {
        self.items
            .iter()
            .filter_map(|item| item.response.as_ref())
            .map(|r| r.tokens_used)
            .sum()
    }
}

/// Batch processor for LLM requests
pub struct BatchProcessor {
    config: BatchConfig,
    semaphore: Arc<Semaphore>,
    completed_count: Arc<AtomicU64>,
    success_count: Arc<AtomicU64>,
    failure_count: Arc<AtomicU64>,
}

impl BatchProcessor {
    /// Create a new batch processor
    pub fn new(config: BatchConfig) -> Self {
        let semaphore = Arc::new(Semaphore::new(config.max_concurrency));
        Self {
            config,
            semaphore,
            completed_count: Arc::new(AtomicU64::new(0)),
            success_count: Arc::new(AtomicU64::new(0)),
            failure_count: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Get current progress
    pub fn progress(&self, total: usize) -> BatchProgress {
        BatchProgress {
            total,
            completed: self.completed_count.load(Ordering::Relaxed) as usize,
            succeeded: self.success_count.load(Ordering::Relaxed) as usize,
            failed: self.failure_count.load(Ordering::Relaxed) as usize,
            in_progress: self.config.max_concurrency
                - self.semaphore.available_permits(),
        }
    }

    /// Reset counters for a new batch
    pub fn reset(&self) {
        self.completed_count.store(0, Ordering::Relaxed);
        self.success_count.store(0, Ordering::Relaxed);
        self.failure_count.store(0, Ordering::Relaxed);
    }

    /// Process a batch of requests using a provided completion function
    pub async fn process<F, Fut>(
        &self,
        requests: Vec<LLMRequest>,
        complete_fn: F,
    ) -> BatchResult
    where
        F: Fn(LLMRequest) -> Fut + Send + Sync + Clone + 'static,
        Fut: std::future::Future<Output = Result<LLMResponse, LLMError>> + Send,
    {
        use tokio::time::{Duration, Instant};

        self.reset();
        let start = Instant::now();
        let total = requests.len();

        let mut handles = Vec::with_capacity(total);

        for (index, request) in requests.into_iter().enumerate() {
            let semaphore = self.semaphore.clone();
            let completed = self.completed_count.clone();
            let succeeded = self.success_count.clone();
            let failed = self.failure_count.clone();
            let config = self.config.clone();
            let complete_fn = complete_fn.clone();

            let handle = tokio::spawn(async move {
                let _permit = semaphore.acquire().await.unwrap();
                let item_start = Instant::now();

                let mut last_error = None;
                let mut retries = 0u32;
                let mut response = None;

                // Retry loop
                for attempt in 0..=config.max_retries {
                    if attempt > 0 {
                        tokio::time::sleep(Duration::from_millis(
                            config.retry_delay_ms * (attempt as u64),
                        ))
                        .await;
                    }

                    match complete_fn(request.clone()).await {
                        Ok(resp) => {
                            response = Some(resp);
                            break;
                        }
                        Err(e) => {
                            last_error = Some(e.to_string());
                            retries = attempt;
                        }
                    }
                }

                let duration_ms = item_start.elapsed().as_millis() as u64;

                // Update counters
                completed.fetch_add(1, Ordering::Relaxed);
                if response.is_some() {
                    succeeded.fetch_add(1, Ordering::Relaxed);
                } else {
                    failed.fetch_add(1, Ordering::Relaxed);
                }

                BatchItemResult {
                    index,
                    request,
                    response,
                    error: last_error,
                    retries,
                    duration_ms,
                }
            });

            handles.push(handle);
        }

        // Wait for all tasks
        let mut items = Vec::with_capacity(total);
        for handle in handles {
            if let Ok(result) = handle.await {
                items.push(result);
            }
        }

        // Sort by original index
        items.sort_by_key(|item| item.index);

        let total_duration_ms = start.elapsed().as_millis() as u64;

        BatchResult {
            items,
            total_duration_ms,
            progress: self.progress(total),
        }
    }
}

/// Builder for creating batch requests
pub struct BatchBuilder {
    requests: Vec<LLMRequest>,
}

impl BatchBuilder {
    pub fn new() -> Self {
        Self {
            requests: Vec::new(),
        }
    }

    /// Add a single request
    pub fn add(mut self, request: LLMRequest) -> Self {
        self.requests.push(request);
        self
    }

    /// Add multiple requests
    pub fn add_all(mut self, requests: impl IntoIterator<Item = LLMRequest>) -> Self {
        self.requests.extend(requests);
        self
    }

    /// Create requests from prompts with shared settings
    pub fn from_prompts(
        prompts: impl IntoIterator<Item = impl Into<String>>,
        model: Option<String>,
        temperature: Option<f32>,
    ) -> Self {
        let requests: Vec<LLMRequest> = prompts
            .into_iter()
            .map(|p| {
                let mut req = LLMRequest::simple(p);
                if let Some(ref m) = model {
                    req = req.model(m.clone());
                }
                if let Some(t) = temperature {
                    req = req.temperature(t);
                }
                req
            })
            .collect();

        Self { requests }
    }

    /// Build and return the requests
    pub fn build(self) -> Vec<LLMRequest> {
        self.requests
    }

    /// Get the number of requests
    pub fn len(&self) -> usize {
        self.requests.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.requests.is_empty()
    }
}

impl Default for BatchBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_config_defaults() {
        let config = BatchConfig::default();
        assert_eq!(config.max_concurrency, 5);
        assert!(config.continue_on_error);
    }

    #[test]
    fn test_batch_progress() {
        let mut progress = BatchProgress::new(10);
        assert_eq!(progress.percentage(), 0.0);
        assert!(!progress.is_complete());

        progress.completed = 5;
        assert_eq!(progress.percentage(), 50.0);

        progress.completed = 10;
        assert!(progress.is_complete());
    }

    #[test]
    fn test_batch_builder() {
        let requests = BatchBuilder::new()
            .add(LLMRequest::simple("Test 1"))
            .add(LLMRequest::simple("Test 2"))
            .build();

        assert_eq!(requests.len(), 2);
    }

    #[test]
    fn test_batch_builder_from_prompts() {
        let prompts = vec!["Question 1", "Question 2", "Question 3"];
        let requests = BatchBuilder::from_prompts(prompts, Some("gpt-4".to_string()), Some(0.7))
            .build();

        assert_eq!(requests.len(), 3);
        assert_eq!(requests[0].model, Some("gpt-4".to_string()));
        assert_eq!(requests[0].temperature, Some(0.7));
    }

    #[tokio::test]
    async fn test_batch_processor_mock() {
        let processor = BatchProcessor::new(BatchConfig::default());

        let requests = vec![
            LLMRequest::simple("Test 1"),
            LLMRequest::simple("Test 2"),
        ];

        // Mock completion function
        let result = processor
            .process(requests, |req| async move {
                Ok(LLMResponse::new(
                    format!("Response to: {}", req.messages[0].content),
                    "mock-model",
                    10,
                ))
            })
            .await;

        assert_eq!(result.items.len(), 2);
        assert!(result.items.iter().all(|i| i.is_success()));
        assert_eq!(result.success_rate(), 100.0);
    }
}

