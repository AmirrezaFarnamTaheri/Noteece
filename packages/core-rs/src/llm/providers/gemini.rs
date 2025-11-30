//! Gemini (Google) Provider Implementation
//!
//! Supports Gemini Pro and Gemini Flash models via the Google AI API.

use super::*;
use serde::{Deserialize, Serialize};

const GEMINI_API_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models";

/// Convert internal Role enum to Gemini-compatible role string
fn role_to_gemini_string(role: &Role) -> &'static str {
    match role {
        Role::System => "user", // Gemini handles system differently
        Role::User => "user",
        Role::Assistant => "model",
    }
}

/// Gemini provider for Google's Gemini models
pub struct GeminiProvider {
    api_key: String,
    client: reqwest::Client,
}

impl GeminiProvider {
    /// Create a new Gemini provider
    pub fn new(api_key: String) -> Result<Self, LLMError> {
        log::debug!("[LLM::Gemini] Initializing provider");

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(90))
            .build()
            .map_err(|e| LLMError::NetworkError(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { api_key, client })
    }
}

#[async_trait]
impl LLMProvider for GeminiProvider {
    async fn complete(&self, request: &LLMRequest) -> Result<LLMResponse, LLMError> {
        log::debug!(
            "[LLM::Gemini] Generating completion - model: {:?}, messages: {}",
            request.model,
            request.messages.len()
        );

        let model = request
            .model
            .as_ref()
            .unwrap_or(&"gemini-1.5-flash".to_string())
            .clone();

        // Extract system instruction if present
        let system_instruction = request
            .messages
            .iter()
            .find(|m| matches!(m.role, Role::System))
            .map(|m| GeminiSystemInstruction {
                parts: vec![GeminiPart {
                    text: m.content.clone(),
                }],
            });

        // Convert non-system messages to Gemini format
        let contents: Vec<GeminiContent> = request
            .messages
            .iter()
            .filter(|m| !matches!(m.role, Role::System))
            .map(|m| GeminiContent {
                role: role_to_gemini_string(&m.role).to_string(),
                parts: vec![GeminiPart {
                    text: m.content.clone(),
                }],
            })
            .collect();

        let generation_config = GeminiGenerationConfig {
            temperature: request.temperature,
            top_p: request.top_p,
            max_output_tokens: request.max_tokens,
            stop_sequences: request.stop_sequences.clone(),
        };

        let gemini_request = GeminiRequest {
            contents,
            system_instruction,
            generation_config: Some(generation_config),
        };

        let url = format!(
            "{}{}:generateContent?key={}",
            GEMINI_API_BASE, model, self.api_key
        );

        log::debug!("[LLM::Gemini] Sending request to Gemini API");

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&gemini_request)
            .send()
            .await
            .map_err(|e| {
                log::error!("[LLM::Gemini] Request failed: {}", e);
                LLMError::NetworkError(format!("Gemini request failed: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();

            // Check for rate limiting
            if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                log::warn!("[LLM::Gemini] Rate limit exceeded");
                return Err(LLMError::RateLimitExceeded);
            }

            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            log::error!(
                "[LLM::Gemini] Request failed with status {}: {}",
                status,
                error_text
            );
            return Err(LLMError::ProviderError(format!(
                "Gemini returned status {}: {}",
                status, error_text
            )));
        }

        let gemini_response: GeminiResponse = response.json().await.map_err(|e| {
            log::error!("[LLM::Gemini] Failed to parse response: {}", e);
            LLMError::InvalidResponse(format!("Failed to parse Gemini response: {}", e))
        })?;

        // Extract text content from response
        let candidate = gemini_response
            .candidates
            .first()
            .ok_or_else(|| LLMError::InvalidResponse("No candidates in response".to_string()))?;

        let content = candidate
            .content
            .parts
            .iter()
            .map(|p| p.text.clone())
            .collect::<Vec<_>>()
            .join("\n");

        let tokens = gemini_response
            .usage_metadata
            .map(|u| u.total_token_count)
            .unwrap_or(0);

        log::info!(
            "[LLM::Gemini] Completion successful - tokens: {}, model: {}",
            tokens,
            model
        );

        Ok(LLMResponse {
            content,
            model,
            tokens_used: tokens,
            finish_reason: candidate.finish_reason.clone(),
            cached: false,
        })
    }

    async fn list_models(&self) -> Result<Vec<String>, LLMError> {
        log::debug!("[LLM::Gemini] Fetching available models");

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models?key={}",
            self.api_key
        );

        let response = self.client.get(&url).send().await.map_err(|e| {
            log::error!("[LLM::Gemini] Failed to fetch models: {}", e);
            LLMError::NetworkError(format!("Failed to fetch models: {}", e))
        })?;

        if !response.status().is_success() {
            // Return known models as fallback
            log::warn!("[LLM::Gemini] Failed to fetch models, returning defaults");
            return Ok(vec![
                "gemini-1.5-flash".to_string(),
                "gemini-1.5-pro".to_string(),
                "gemini-1.0-pro".to_string(),
            ]);
        }

        let models_response: GeminiModelsResponse = response.json().await.map_err(|e| {
            log::error!("[LLM::Gemini] Failed to parse models response: {}", e);
            LLMError::InvalidResponse(format!("Failed to parse models: {}", e))
        })?;

        let model_names: Vec<String> = models_response
            .models
            .iter()
            .filter(|m| m.name.contains("gemini"))
            .map(|m| m.name.replace("models/", ""))
            .collect();

        log::info!("[LLM::Gemini] Found {} Gemini models", model_names.len());

        Ok(model_names)
    }

    fn name(&self) -> &str {
        "gemini"
    }

    async fn health_check(&self) -> Result<bool, LLMError> {
        log::debug!("[LLM::Gemini] Performing health check");

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models?key={}",
            self.api_key
        );

        match self.client.get(&url).send().await {
            Ok(response) => {
                let healthy = response.status().is_success();
                log::debug!(
                    "[LLM::Gemini] Health check: {} (status: {})",
                    if healthy { "OK" } else { "FAILED" },
                    response.status()
                );
                Ok(healthy)
            }
            Err(e) => {
                log::warn!("[LLM::Gemini] Health check failed: {}", e);
                Ok(false)
            }
        }
    }
}

// Gemini API types
#[derive(Debug, Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system_instruction: Option<GeminiSystemInstruction>,
    #[serde(skip_serializing_if = "Option::is_none")]
    generation_config: Option<GeminiGenerationConfig>,
}

#[derive(Debug, Serialize)]
struct GeminiContent {
    role: String,
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiPart {
    text: String,
}

#[derive(Debug, Serialize)]
struct GeminiSystemInstruction {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize)]
struct GeminiGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_output_tokens: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop_sequences: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
    #[serde(rename = "usageMetadata")]
    usage_metadata: Option<GeminiUsageMetadata>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiContentResponse,
    #[serde(rename = "finishReason")]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GeminiContentResponse {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Deserialize)]
struct GeminiUsageMetadata {
    #[serde(rename = "totalTokenCount")]
    total_token_count: usize,
}

#[derive(Debug, Deserialize)]
struct GeminiModelsResponse {
    models: Vec<GeminiModel>,
}

#[derive(Debug, Deserialize)]
struct GeminiModel {
    name: String,
}
