// Ollama Provider Implementation
//
// Ollama is a local LLM runtime that supports Llama, Mistral, Code Llama, and many other models.
// This provider communicates with a local Ollama instance via its REST API.

use super::*;
use serde::{Deserialize, Serialize};

/// Ollama provider for local LLM inference
pub struct OllamaProvider {
    base_url: String,
    client: reqwest::Client,
}

impl OllamaProvider {
    /// Create a new Ollama provider
    pub fn new(base_url: String) -> Result<Self, LLMError> {
        log::debug!(
            "[LLM::Ollama] Initializing provider with base_url: {}",
            base_url
        );

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .map_err(|e| LLMError::NetworkError(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { base_url, client })
    }
}

#[async_trait]
impl LLMProvider for OllamaProvider {
    async fn complete(&self, request: &LLMRequest) -> Result<LLMResponse, LLMError> {
        log::debug!(
            "[LLM::Ollama] Generating completion - model: {:?}, messages: {}",
            request.model,
            request.messages.len()
        );

        let model = request
            .model
            .as_ref()
            .ok_or_else(|| LLMError::ConfigError("Model not specified".to_string()))?;

        // Convert messages to Ollama format
        let messages: Vec<OllamaMessage> = request
            .messages
            .iter()
            .map(|m| OllamaMessage {
                role: format!("{:?}", m.role).to_lowercase(),
                content: m.content.clone(),
            })
            .collect();

        let ollama_request = OllamaRequest {
            model: model.clone(),
            messages,
            stream: false,
            options: Some(OllamaOptions {
                temperature: request.temperature,
                num_predict: request.max_tokens.map(|t| t as i32),
                top_p: request.top_p,
                stop: request.stop_sequences.clone(),
            }),
        };

        let url = format!("{}/api/chat", self.base_url);

        log::debug!("[LLM::Ollama] Sending request to {}", url);

        let response = self
            .client
            .post(&url)
            .json(&ollama_request)
            .send()
            .await
            .map_err(|e| {
                log::error!("[LLM::Ollama] Request failed: {}", e);
                LLMError::NetworkError(format!("Ollama request failed: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            log::error!(
                "[LLM::Ollama] Request failed with status {}: {}",
                status,
                error_text
            );
            return Err(LLMError::ProviderError(format!(
                "Ollama returned status {}: {}",
                status, error_text
            )));
        }

        let ollama_response: OllamaResponse = response.json().await.map_err(|e| {
            log::error!("[LLM::Ollama] Failed to parse response: {}", e);
            LLMError::InvalidResponse(format!("Failed to parse Ollama response: {}", e))
        })?;

        let content = ollama_response
            .message
            .content
            .ok_or_else(|| LLMError::InvalidResponse("No content in response".to_string()))?;

        let tokens = ollama_response.eval_count.unwrap_or(0) as usize;

        log::info!(
            "[LLM::Ollama] Completion successful - tokens: {}, model: {}",
            tokens,
            model
        );

        Ok(LLMResponse {
            content,
            model: model.clone(),
            tokens_used: tokens,
            finish_reason: ollama_response.done_reason,
            cached: false,
        })
    }

    async fn list_models(&self) -> Result<Vec<String>, LLMError> {
        log::debug!("[LLM::Ollama] Fetching available models");

        let url = format!("{}/api/tags", self.base_url);

        let response = self.client.get(&url).send().await.map_err(|e| {
            log::error!("[LLM::Ollama] Failed to fetch models: {}", e);
            LLMError::NetworkError(format!("Failed to fetch models: {}", e))
        })?;

        let models_response: OllamaModelsResponse = response.json().await.map_err(|e| {
            log::error!("[LLM::Ollama] Failed to parse models response: {}", e);
            LLMError::InvalidResponse(format!("Failed to parse models: {}", e))
        })?;

        let model_names: Vec<String> = models_response
            .models
            .iter()
            .map(|m| m.name.clone())
            .collect();

        log::info!("[LLM::Ollama] Found {} available models", model_names.len());

        Ok(model_names)
    }

    fn name(&self) -> &str {
        "ollama"
    }

    async fn health_check(&self) -> Result<bool, LLMError> {
        let url = format!("{}/api/tags", self.base_url);

        match self.client.get(&url).send().await {
            Ok(response) => {
                let healthy = response.status().is_success();
                log::debug!(
                    "[LLM::Ollama] Health check: {}",
                    if healthy { "OK" } else { "FAILED" }
                );
                Ok(healthy)
            }
            Err(e) => {
                log::warn!("[LLM::Ollama] Health check failed: {}", e);
                Ok(false)
            }
        }
    }
}

// Ollama API types
#[derive(Debug, Serialize)]
struct OllamaRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
    options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    message: OllamaMessageResponse,
    #[serde(default)]
    done_reason: Option<String>,
    #[serde(default)]
    eval_count: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct OllamaMessageResponse {
    #[serde(default)]
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
}
