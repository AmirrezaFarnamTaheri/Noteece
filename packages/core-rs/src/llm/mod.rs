//! LLM Integration Module
//!
//! Provides unified interface for interacting with Language Models (both local and cloud).
//!
//! ## Features
//!
//! - **Multi-Provider Support**: Ollama (local), OpenAI, Claude, Gemini
//! - **Automatic Fallback**: Configurable fallback chain between providers
//! - **Response Caching**: SQLite-based persistent cache
//! - **Streaming Responses**: Real-time token-by-token output
//! - **Batch Processing**: Concurrent execution with rate limiting
//! - **Response Validation**: JSON schema, length, and content validation
//! - **Token Counting**: Pre-request token estimation
//! - **Cost Tracking**: Per-request and aggregate cost monitoring
//! - **Auto-Retry**: Exponential backoff with circuit breaker
//! - **Request Prioritization**: Priority queues with aging

pub mod batch;
pub mod cache;
pub mod config;
pub mod cost;
pub mod error;
pub mod priority;
pub mod providers;
pub mod retry;
pub mod streaming;
pub mod tokenizer;
pub mod types;
pub mod validation;

pub use batch::{BatchBuilder, BatchConfig, BatchProcessor, BatchResult};
pub use config::LLMConfig;
pub use cost::{CostRecord, CostStats, CostTracker};
pub use error::{LLMError, LLMResult};
pub use priority::{AsyncPriorityQueue, PrioritizedRequest, Priority, PriorityQueue};
pub use providers::{ClaudeProvider, GeminiProvider, LLMProvider, OllamaProvider, OpenAIProvider};
pub use retry::{with_retry, CircuitBreaker, RetryConfig};
pub use streaming::{StreamChunk, StreamCollector, StreamHandler, StreamRequest};
pub use tokenizer::{ModelLimits, SimpleTokenCounter, TokenCount, TokenCounter};
pub use types::{LLMRequest, LLMResponse, Message, Role};
pub use validation::{
    CompositeValidator, ContentFilter, JsonValidator, LengthValidator, ResponseValidator,
    ValidationResult,
};

use rusqlite::Connection;

/// Main LLM client that manages providers and routing
pub struct LLMClient {
    config: LLMConfig,
    cache: cache::ResponseCache,
}

impl LLMClient {
    /// Create a new LLM client with the given configuration
    pub fn new(config: LLMConfig, db_conn: &Connection) -> Result<Self, LLMError> {
        log::info!(
            "[LLM] Initializing LLM client with provider: {:?}",
            config.default_provider
        );

        let cache = cache::ResponseCache::new(db_conn)?;

        Ok(Self { config, cache })
    }

    /// Generate a completion using the configured provider with automatic fallback
    pub async fn complete(&self, request: LLMRequest) -> Result<LLMResponse, LLMError> {
        log::debug!(
            "[LLM] Processing request - model: {:?}, messages: {}, use_cache: {}",
            request.model,
            request.messages.len(),
            self.config.use_cache
        );

        // Check cache first if enabled
        if self.config.use_cache {
            if let Some(cached) = self.cache.get(&request)? {
                log::info!("[LLM] Cache hit for request");
                return Ok(cached);
            }
        }

        // Try primary provider
        let result = self
            .try_provider(&self.config.default_provider, &request)
            .await;

        match result {
            Ok(response) => {
                // Cache successful response
                if self.config.use_cache {
                    self.cache.set(&request, &response)?;
                }

                log::info!(
                    "[LLM] Successfully generated completion - tokens: {}",
                    response.tokens_used
                );
                Ok(response)
            }
            Err(e) => {
                log::warn!("[LLM] Primary provider failed: {}", e);

                // Try fallback chain
                for fallback_provider in &self.config.fallback_chain {
                    log::debug!("[LLM] Trying fallback provider: {:?}", fallback_provider);

                    match self.try_provider(fallback_provider, &request).await {
                        Ok(response) => {
                            if self.config.use_cache {
                                self.cache.set(&request, &response)?;
                            }

                            log::info!(
                                "[LLM] Fallback provider succeeded - tokens: {}",
                                response.tokens_used
                            );
                            return Ok(response);
                        }
                        Err(fallback_err) => {
                            log::warn!("[LLM] Fallback provider failed: {}", fallback_err);
                            continue;
                        }
                    }
                }

                // All providers failed
                log::error!("[LLM] All providers failed");
                Err(e)
            }
        }
    }

    /// Try a specific provider
    async fn try_provider(
        &self,
        provider_type: &providers::ProviderType,
        request: &LLMRequest,
    ) -> Result<LLMResponse, LLMError> {
        let provider: Box<dyn LLMProvider> = match provider_type {
            providers::ProviderType::Ollama => {
                Box::new(OllamaProvider::new(self.config.ollama_base_url.clone())?)
            }
            providers::ProviderType::OpenAI => Box::new(OpenAIProvider::new(
                self.config
                    .openai_api_key
                    .clone()
                    .ok_or(LLMError::ConfigError(
                        "OpenAI API key not configured".to_string(),
                    ))?,
            )?),
            providers::ProviderType::Claude => Box::new(ClaudeProvider::new(
                self.config
                    .anthropic_api_key
                    .clone()
                    .ok_or(LLMError::ConfigError(
                        "Anthropic API key not configured".to_string(),
                    ))?,
            )?),
            providers::ProviderType::Gemini => Box::new(GeminiProvider::new(
                self.config
                    .google_api_key
                    .clone()
                    .ok_or(LLMError::ConfigError(
                        "Google API key not configured".to_string(),
                    ))?,
            )?),
        };

        provider.complete(request).await
    }

    /// Get available models from a provider
    pub async fn list_models(
        &self,
        provider_type: &providers::ProviderType,
    ) -> Result<Vec<String>, LLMError> {
        log::debug!("[LLM] Listing models for provider: {:?}", provider_type);

        let provider: Box<dyn LLMProvider> = match provider_type {
            providers::ProviderType::Ollama => {
                Box::new(OllamaProvider::new(self.config.ollama_base_url.clone())?)
            }
            providers::ProviderType::OpenAI => Box::new(OpenAIProvider::new(
                self.config
                    .openai_api_key
                    .clone()
                    .ok_or(LLMError::ConfigError(
                        "OpenAI API key not configured".to_string(),
                    ))?,
            )?),
            providers::ProviderType::Claude => Box::new(ClaudeProvider::new(
                self.config
                    .anthropic_api_key
                    .clone()
                    .ok_or(LLMError::ConfigError(
                        "Anthropic API key not configured".to_string(),
                    ))?,
            )?),
            providers::ProviderType::Gemini => Box::new(GeminiProvider::new(
                self.config
                    .google_api_key
                    .clone()
                    .ok_or(LLMError::ConfigError(
                        "Google API key not configured".to_string(),
                    ))?,
            )?),
        };

        provider.list_models().await
    }

    /// Clear the response cache
    pub fn clear_cache(&self) -> Result<(), LLMError> {
        log::info!("[LLM] Clearing response cache");
        self.cache.clear()
    }

    /// Get cache statistics
    pub fn cache_stats(&self) -> Result<cache::CacheStats, LLMError> {
        self.cache.stats()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_client_creation() {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::init_llm_tables(&conn).unwrap();

        let config = LLMConfig::default();
        let client = LLMClient::new(config, &conn);

        assert!(client.is_ok());
    }
}
