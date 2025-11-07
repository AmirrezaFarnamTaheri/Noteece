// LLM Provider Implementations

pub mod ollama;
pub mod openai;

pub use ollama::OllamaProvider;
pub use openai::OpenAIProvider;

use super::{types::*, LLMError};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// Supported LLM providers
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    Ollama,
    OpenAI,
    Claude,
    Gemini,
}

/// Trait that all LLM providers must implement
#[async_trait]
pub trait LLMProvider: Send + Sync {
    /// Generate a completion for the given request
    async fn complete(&self, request: &LLMRequest) -> Result<LLMResponse, LLMError>;

    /// List available models for this provider
    async fn list_models(&self) -> Result<Vec<String>, LLMError>;

    /// Get provider name
    fn name(&self) -> &str;

    /// Check if the provider is available (can connect)
    async fn health_check(&self) -> Result<bool, LLMError> {
        Ok(true)
    }
}
