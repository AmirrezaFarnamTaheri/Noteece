// OpenAI Provider Implementation
//
// Supports GPT-4, GPT-3.5-turbo, and other OpenAI models via the official API.

use super::*;
use serde::{Deserialize, Serialize};

/// OpenAI provider for cloud-based LLM inference
pub struct OpenAIProvider {
    api_key: String,
    client: reqwest::Client,
}

impl OpenAIProvider {
    /// Create a new OpenAI provider
    pub fn new(api_key: String) -> Result<Self, LLMError> {
        log::debug!("[LLM::OpenAI] Initializing provider");

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| LLMError::NetworkError(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { api_key, client })
    }
}

#[async_trait]
impl LLMProvider for OpenAIProvider {
    async fn complete(&self, request: &LLMRequest) -> Result<LLMResponse, LLMError> {
        log::debug!(
            "[LLM::OpenAI] Generating completion - model: {:?}, messages: {}",
            request.model,
            request.messages.len()
        );

        let model = request
            .model
            .as_ref()
            .unwrap_or(&"gpt-3.5-turbo".to_string())
            .clone();

        // Convert messages to OpenAI format
        let messages: Vec<OpenAIMessage> = request
            .messages
            .iter()
            .map(|m| OpenAIMessage {
                role: format!("{:?}", m.role).to_lowercase(),
                content: m.content.clone(),
            })
            .collect();

        let openai_request = OpenAIRequest {
            model: model.clone(),
            messages,
            temperature: request.temperature,
            max_tokens: request.max_tokens,
            top_p: request.top_p,
            stop: request.stop_sequences.clone(),
        };

        let url = "https://api.openai.com/v1/chat/completions";

        log::debug!("[LLM::OpenAI] Sending request to OpenAI API");

        let response = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&openai_request)
            .send()
            .await
            .map_err(|e| {
                log::error!("[LLM::OpenAI] Request failed: {}", e);
                LLMError::NetworkError(format!("OpenAI request failed: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();

            // Check for rate limiting
            if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                log::warn!("[LLM::OpenAI] Rate limit exceeded");
                return Err(LLMError::RateLimitExceeded);
            }

            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            log::error!(
                "[LLM::OpenAI] Request failed with status {}: {}",
                status,
                error_text
            );
            return Err(LLMError::ProviderError(format!(
                "OpenAI returned status {}: {}",
                status, error_text
            )));
        }

        let openai_response: OpenAIResponse = response.json().await.map_err(|e| {
            log::error!("[LLM::OpenAI] Failed to parse response: {}", e);
            LLMError::InvalidResponse(format!("Failed to parse OpenAI response: {}", e))
        })?;

        let choice = openai_response
            .choices
            .first()
            .ok_or_else(|| LLMError::InvalidResponse("No choices in response".to_string()))?;

        let content = choice.message.content.clone();
        let tokens = openai_response.usage.total_tokens;

        log::info!(
            "[LLM::OpenAI] Completion successful - tokens: {}, model: {}",
            tokens,
            model
        );

        Ok(LLMResponse {
            content,
            model,
            tokens_used: tokens,
            finish_reason: choice.finish_reason.clone(),
            cached: false,
        })
    }

    async fn list_models(&self) -> Result<Vec<String>, LLMError> {
        log::debug!("[LLM::OpenAI] Fetching available models");

        let url = "https://api.openai.com/v1/models";

        let response = self
            .client
            .get(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| {
                log::error!("[LLM::OpenAI] Failed to fetch models: {}", e);
                LLMError::NetworkError(format!("Failed to fetch models: {}", e))
            })?;

        let models_response: OpenAIModelsResponse = response.json().await.map_err(|e| {
            log::error!("[LLM::OpenAI] Failed to parse models response: {}", e);
            LLMError::InvalidResponse(format!("Failed to parse models: {}", e))
        })?;

        let model_names: Vec<String> = models_response
            .data
            .iter()
            .filter(|m| m.id.starts_with("gpt-")) // Filter to GPT models
            .map(|m| m.id.clone())
            .collect();

        log::info!("[LLM::OpenAI] Found {} GPT models", model_names.len());

        Ok(model_names)
    }

    fn name(&self) -> &str {
        "openai"
    }

    async fn health_check(&self) -> Result<bool, LLMError> {
        let url = "https://api.openai.com/v1/models";

        match self
            .client
            .get(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
        {
            Ok(response) => {
                let healthy = response.status().is_success();
                log::debug!(
                    "[LLM::OpenAI] Health check: {}",
                    if healthy { "OK" } else { "FAILED" }
                );
                Ok(healthy)
            }
            Err(e) => {
                log::warn!("[LLM::OpenAI] Health check failed: {}", e);
                Ok(false)
            }
        }
    }
}

// OpenAI API types
#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    usage: OpenAIUsage,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessageResponse,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIMessageResponse {
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    total_tokens: usize,
}

#[derive(Debug, Deserialize)]
struct OpenAIModelsResponse {
    data: Vec<OpenAIModel>,
}

#[derive(Debug, Deserialize)]
struct OpenAIModel {
    id: String,
}
