// LLM Provider Implementations
//
// Supports multiple LLM backends: local (Ollama) and cloud (OpenAI, Claude, Gemini)

pub mod claude;
pub mod gemini;
pub mod ollama;
pub mod openai;

pub use claude::ClaudeProvider;
pub use gemini::GeminiProvider;
pub use ollama::OllamaProvider;
pub use openai::OpenAIProvider;

use super::{types::*, LlmError as LLMError};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// Supported LLM providers
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    /// Local Ollama instance (privacy-focused)
    Ollama,
    /// OpenAI GPT models (GPT-4, GPT-3.5-turbo)
    OpenAI,
    /// Anthropic Claude models (Claude 3 Opus/Sonnet/Haiku)
    Claude,
    /// Google Gemini models (Gemini Pro, Gemini Flash)
    Gemini,
}

impl ProviderType {
    /// Check if this provider requires an API key
    pub fn requires_api_key(&self) -> bool {
        matches!(
            self,
            ProviderType::OpenAI | ProviderType::Claude | ProviderType::Gemini
        )
    }

    /// Get the default model for this provider
    pub fn default_model(&self) -> &'static str {
        match self {
            ProviderType::Ollama => "llama3.2",
            ProviderType::OpenAI => "gpt-3.5-turbo",
            ProviderType::Claude => "claude-3-sonnet-20240229",
            ProviderType::Gemini => "gemini-1.5-flash",
        }
    }
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
