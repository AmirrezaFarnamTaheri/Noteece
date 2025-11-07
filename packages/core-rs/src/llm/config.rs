// LLM Configuration

use super::providers::ProviderType;
use serde::{Deserialize, Serialize};

/// Configuration for the LLM client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMConfig {
    /// Default provider to use
    pub default_provider: ProviderType,

    /// Fallback providers to try if default fails
    pub fallback_chain: Vec<ProviderType>,

    /// Maximum tokens to generate
    pub max_tokens: usize,

    /// Temperature for sampling (0.0 - 2.0)
    pub temperature: f32,

    /// Enable response caching
    pub use_cache: bool,

    /// Privacy mode (force local-only models)
    pub privacy_mode: bool,

    // Provider-specific configurations
    pub ollama_base_url: String,
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub google_api_key: Option<String>,
}

impl Default for LLMConfig {
    fn default() -> Self {
        Self {
            default_provider: ProviderType::Ollama,
            fallback_chain: vec![],
            max_tokens: 2048,
            temperature: 0.7,
            use_cache: true,
            privacy_mode: false,
            ollama_base_url: "http://localhost:11434".to_string(),
            openai_api_key: None,
            anthropic_api_key: None,
            google_api_key: None,
        }
    }
}

impl LLMConfig {
    /// Create a privacy-first configuration (local-only)
    pub fn privacy_first() -> Self {
        Self {
            default_provider: ProviderType::Ollama,
            fallback_chain: vec![],
            privacy_mode: true,
            ..Default::default()
        }
    }

    /// Create a cloud-first configuration with local fallback
    pub fn cloud_first(api_key: impl Into<String>) -> Self {
        Self {
            default_provider: ProviderType::OpenAI,
            fallback_chain: vec![ProviderType::Ollama],
            privacy_mode: false,
            openai_api_key: Some(api_key.into()),
            ..Default::default()
        }
    }

    /// Create a balanced hybrid configuration
    pub fn hybrid(api_key: impl Into<String>) -> Self {
        Self {
            default_provider: ProviderType::Ollama,
            fallback_chain: vec![ProviderType::OpenAI],
            privacy_mode: false,
            openai_api_key: Some(api_key.into()),
            ..Default::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = LLMConfig::default();
        assert_eq!(config.default_provider, ProviderType::Ollama);
        assert!(config.use_cache);
    }

    #[test]
    fn test_privacy_first() {
        let config = LLMConfig::privacy_first();
        assert_eq!(config.default_provider, ProviderType::Ollama);
        assert!(config.privacy_mode);
        assert!(config.fallback_chain.is_empty());
    }

    #[test]
    fn test_cloud_first() {
        let config = LLMConfig::cloud_first("test-key");
        assert_eq!(config.default_provider, ProviderType::OpenAI);
        assert_eq!(config.fallback_chain.len(), 1);
        assert!(config.openai_api_key.is_some());
    }
}
