//! Claude (Anthropic) Provider Implementation
//!
//! Supports Claude 3 models (Opus, Sonnet, Haiku) via the Anthropic API.

use super::*;
use serde::{Deserialize, Serialize};

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

/// Convert internal Role enum to Claude-compatible role string
fn role_to_claude_string(role: &Role) -> &'static str {
    match role {
        Role::System => "user", // Claude handles system separately
        Role::User => "user",
        Role::Assistant => "assistant",
    }
}

/// Claude provider for Anthropic's Claude models
pub struct ClaudeProvider {
    api_key: String,
    client: reqwest::Client,
}

impl ClaudeProvider {
    /// Create a new Claude provider
    pub fn new(api_key: String) -> Result<Self, LLMError> {
        log::debug!("[LLM::Claude] Initializing provider");

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120)) // Claude can be slower for complex tasks
            .build()
            .map_err(|e| LLMError::NetworkError(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { api_key, client })
    }
}

#[async_trait]
impl LLMProvider for ClaudeProvider {
    async fn complete(&self, request: &LLMRequest) -> Result<LLMResponse, LLMError> {
        log::debug!(
            "[LLM::Claude] Generating completion - model: {:?}, messages: {}",
            request.model,
            request.messages.len()
        );

        let model = request
            .model
            .as_ref()
            .unwrap_or(&"claude-3-sonnet-20240229".to_string())
            .clone();

        // Extract system message if present
        let system_message = request
            .messages
            .iter()
            .find(|m| matches!(m.role, Role::System))
            .map(|m| m.content.clone());

        // Convert non-system messages to Claude format
        let messages: Vec<ClaudeMessage> = request
            .messages
            .iter()
            .filter(|m| !matches!(m.role, Role::System))
            .map(|m| ClaudeMessage {
                role: role_to_claude_string(&m.role).to_string(),
                content: m.content.clone(),
            })
            .collect();

        let claude_request = ClaudeRequest {
            model: model.clone(),
            max_tokens: request.max_tokens.unwrap_or(4096),
            messages,
            system: system_message,
            temperature: request.temperature,
            top_p: request.top_p,
            stop_sequences: request.stop_sequences.clone(),
        };

        log::debug!("[LLM::Claude] Sending request to Anthropic API");

        let response = self
            .client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("Content-Type", "application/json")
            .json(&claude_request)
            .send()
            .await
            .map_err(|e| {
                log::error!("[LLM::Claude] Request failed: {}", e);
                LLMError::NetworkError(format!("Claude request failed: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();

            // Check for rate limiting
            if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                log::warn!("[LLM::Claude] Rate limit exceeded");
                return Err(LLMError::RateLimitExceeded);
            }

            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            log::error!(
                "[LLM::Claude] Request failed with status {}: {}",
                status,
                error_text
            );
            return Err(LLMError::ProviderError(format!(
                "Claude returned status {}: {}",
                status, error_text
            )));
        }

        let claude_response: ClaudeResponse = response.json().await.map_err(|e| {
            log::error!("[LLM::Claude] Failed to parse response: {}", e);
            LLMError::InvalidResponse(format!("Failed to parse Claude response: {}", e))
        })?;

        // Extract text content from response
        let content = claude_response
            .content
            .iter()
            .filter_map(|block| {
                if block.content_type == "text" {
                    Some(block.text.clone())
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("\n");

        let tokens = claude_response.usage.input_tokens + claude_response.usage.output_tokens;

        log::info!(
            "[LLM::Claude] Completion successful - tokens: {}, model: {}",
            tokens,
            model
        );

        Ok(LLMResponse {
            content,
            model,
            tokens_used: tokens,
            finish_reason: Some(claude_response.stop_reason.unwrap_or_default()),
            cached: false,
        })
    }

    async fn list_models(&self) -> Result<Vec<String>, LLMError> {
        log::debug!("[LLM::Claude] Returning available Claude models");

        // Anthropic doesn't have a models endpoint, so we return known models
        Ok(vec![
            "claude-3-opus-20240229".to_string(),
            "claude-3-sonnet-20240229".to_string(),
            "claude-3-haiku-20240307".to_string(),
            "claude-3-5-sonnet-20241022".to_string(),
        ])
    }

    fn name(&self) -> &str {
        "claude"
    }

    async fn health_check(&self) -> Result<bool, LLMError> {
        // Simple health check - try to make a minimal request
        // We'll check if the API key format is valid and connection works
        log::debug!("[LLM::Claude] Performing health check");

        let test_request = ClaudeRequest {
            model: "claude-3-haiku-20240307".to_string(),
            max_tokens: 10,
            messages: vec![ClaudeMessage {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }],
            system: None,
            temperature: None,
            top_p: None,
            stop_sequences: None,
        };

        match self
            .client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("Content-Type", "application/json")
            .json(&test_request)
            .send()
            .await
        {
            Ok(response) => {
                // 401 means API key is invalid, but connection works
                // 200 means everything is fine
                let healthy = response.status().is_success();
                log::debug!(
                    "[LLM::Claude] Health check: {} (status: {})",
                    if healthy { "OK" } else { "FAILED" },
                    response.status()
                );
                Ok(healthy)
            }
            Err(e) => {
                log::warn!("[LLM::Claude] Health check failed: {}", e);
                Ok(false)
            }
        }
    }
}

// Claude API types
#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: usize,
    messages: Vec<ClaudeMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop_sequences: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContentBlock>,
    stop_reason: Option<String>,
    usage: ClaudeUsage,
}

#[derive(Debug, Deserialize)]
struct ClaudeContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    #[serde(default)]
    text: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeUsage {
    input_tokens: usize,
    output_tokens: usize,
}

