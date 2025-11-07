// LLM Type Definitions

use serde::{Deserialize, Serialize};

/// Role of a message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

/// A single message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

impl Message {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: Role::System,
            content: content.into(),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: Role::User,
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: Role::Assistant,
            content: content.into(),
        }
    }
}

/// Request to an LLM provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMRequest {
    pub model: Option<String>,
    pub messages: Vec<Message>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<usize>,
    pub top_p: Option<f32>,
    pub stop_sequences: Option<Vec<String>>,
}

impl LLMRequest {
    /// Create a simple single-message request
    pub fn simple(prompt: impl Into<String>) -> Self {
        Self {
            model: None,
            messages: vec![Message::user(prompt)],
            temperature: None,
            max_tokens: None,
            top_p: None,
            stop_sequences: None,
        }
    }

    /// Create a request with system and user messages
    pub fn with_system(system: impl Into<String>, user: impl Into<String>) -> Self {
        Self {
            model: None,
            messages: vec![Message::system(system), Message::user(user)],
            temperature: None,
            max_tokens: None,
            top_p: None,
            stop_sequences: None,
        }
    }

    /// Builder method to set model
    pub fn model(mut self, model: impl Into<String>) -> Self {
        self.model = Some(model.into());
        self
    }

    /// Builder method to set temperature
    pub fn temperature(mut self, temp: f32) -> Self {
        self.temperature = Some(temp);
        self
    }

    /// Builder method to set max tokens
    pub fn max_tokens(mut self, max: usize) -> Self {
        self.max_tokens = Some(max);
        self
    }

    /// Compute a cache key for this request
    pub fn cache_key(&self) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();

        // Hash model
        if let Some(model) = &self.model {
            model.hash(&mut hasher);
        }

        // Hash messages (role + content)
        for msg in &self.messages {
            format!("{:?}:{}", msg.role, msg.content).hash(&mut hasher);
        }

        // Hash temperature
        if let Some(temp) = self.temperature {
            temp.to_bits().hash(&mut hasher);
        }

        format!("{:x}", hasher.finish())
    }
}

/// Response from an LLM provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMResponse {
    pub content: String,
    pub model: String,
    pub tokens_used: usize,
    pub finish_reason: Option<String>,
    pub cached: bool,
}

impl LLMResponse {
    pub fn new(content: impl Into<String>, model: impl Into<String>, tokens: usize) -> Self {
        Self {
            content: content.into(),
            model: model.into(),
            tokens_used: tokens,
            finish_reason: None,
            cached: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_creation() {
        let msg = Message::user("Hello");
        assert_eq!(msg.role, Role::User);
        assert_eq!(msg.content, "Hello");
    }

    #[test]
    fn test_request_builder() {
        let req = LLMRequest::simple("Test")
            .model("llama3")
            .temperature(0.7)
            .max_tokens(100);

        assert_eq!(req.model, Some("llama3".to_string()));
        assert_eq!(req.temperature, Some(0.7));
        assert_eq!(req.max_tokens, Some(100));
    }

    #[test]
    fn test_cache_key_consistency() {
        let req1 = LLMRequest::simple("Test").model("llama3");
        let req2 = LLMRequest::simple("Test").model("llama3");

        assert_eq!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_different() {
        let req1 = LLMRequest::simple("Test1");
        let req2 = LLMRequest::simple("Test2");

        assert_ne!(req1.cache_key(), req2.cache_key());
    }
}
