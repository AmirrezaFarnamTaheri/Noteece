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
    /// SECURITY: Must include ALL request parameters to prevent cache poisoning
    /// where different parameter sets incorrectly share cached responses
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

        // Hash max_tokens (prevents truncated responses from matching full ones)
        if let Some(max) = self.max_tokens {
            max.hash(&mut hasher);
        }

        // Hash top_p (sampling parameter affects response distribution)
        if let Some(top_p) = self.top_p {
            top_p.to_bits().hash(&mut hasher);
        }

        // Hash stop_sequences (affects where response terminates)
        if let Some(ref stop) = self.stop_sequences {
            for seq in stop {
                seq.hash(&mut hasher);
            }
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

    // ===== Message Constructor Tests =====

    #[test]
    fn test_message_creation() {
        let msg = Message::user("Hello");
        assert_eq!(msg.role, Role::User);
        assert_eq!(msg.content, "Hello");
    }

    #[test]
    fn test_message_all_roles() {
        // System message
        let system = Message::system("You are a helpful assistant");
        assert_eq!(system.role, Role::System);
        assert_eq!(system.content, "You are a helpful assistant");

        // User message
        let user = Message::user("Hello, how are you?");
        assert_eq!(user.role, Role::User);
        assert_eq!(user.content, "Hello, how are you?");

        // Assistant message
        let assistant = Message::assistant("I'm doing well, thank you!");
        assert_eq!(assistant.role, Role::Assistant);
        assert_eq!(assistant.content, "I'm doing well, thank you!");
    }

    #[test]
    fn test_message_string_conversions() {
        // Test with String (owned)
        let owned = String::from("Owned string");
        let msg = Message::user(owned);
        assert_eq!(msg.content, "Owned string");

        // Test with &str (borrowed)
        let msg = Message::user("Borrowed string");
        assert_eq!(msg.content, "Borrowed string");
    }

    #[test]
    fn test_message_empty_content() {
        let msg = Message::user("");
        assert_eq!(msg.role, Role::User);
        assert_eq!(msg.content, "");
    }

    // ===== Request Builder Tests =====

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
    fn test_request_simple() {
        let req = LLMRequest::simple("What is AI?");

        assert_eq!(req.messages.len(), 1);
        assert_eq!(req.messages[0].role, Role::User);
        assert_eq!(req.messages[0].content, "What is AI?");
        assert_eq!(req.model, None);
        assert_eq!(req.temperature, None);
        assert_eq!(req.max_tokens, None);
        assert_eq!(req.top_p, None);
        assert_eq!(req.stop_sequences, None);
    }

    #[test]
    fn test_request_with_system() {
        let req = LLMRequest::with_system("Be concise", "Explain gravity");

        assert_eq!(req.messages.len(), 2);
        assert_eq!(req.messages[0].role, Role::System);
        assert_eq!(req.messages[0].content, "Be concise");
        assert_eq!(req.messages[1].role, Role::User);
        assert_eq!(req.messages[1].content, "Explain gravity");
    }

    #[test]
    fn test_request_builder_chain_order() {
        // Builder methods should work regardless of order
        let req1 = LLMRequest::simple("Test")
            .model("gpt-4")
            .temperature(0.5)
            .max_tokens(200);

        let req2 = LLMRequest::simple("Test")
            .max_tokens(200)
            .model("gpt-4")
            .temperature(0.5);

        // Both should have same final values
        assert_eq!(req1.model, req2.model);
        assert_eq!(req1.temperature, req2.temperature);
        assert_eq!(req1.max_tokens, req2.max_tokens);
    }

    #[test]
    fn test_request_builder_overwrite() {
        // Later calls should overwrite earlier ones
        let req = LLMRequest::simple("Test").temperature(0.3).temperature(0.7); // Should overwrite

        assert_eq!(req.temperature, Some(0.7));
    }

    // ===== Cache Key Tests (Security Critical) =====

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

    #[test]
    fn test_cache_key_includes_model() {
        let req1 = LLMRequest::simple("Test").model("gpt-4");
        let req2 = LLMRequest::simple("Test").model("gpt-3.5-turbo");

        // Different models must produce different cache keys
        assert_ne!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_includes_temperature() {
        let req1 = LLMRequest::simple("Test").temperature(0.5);
        let req2 = LLMRequest::simple("Test").temperature(0.9);

        // Different temperatures must produce different cache keys
        assert_ne!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_includes_max_tokens() {
        // SECURITY: This test verifies the fix for cache collision bug
        // Previously max_tokens was not included, causing truncated responses
        // to match full ones
        let req1 = LLMRequest::simple("Test").max_tokens(50);
        let req2 = LLMRequest::simple("Test").max_tokens(500);

        assert_ne!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_includes_top_p() {
        // SECURITY: Verifies top_p is included in cache key
        let req1 = LLMRequest::simple("Test");
        let mut req2 = LLMRequest::simple("Test");
        req2.top_p = Some(0.9);

        assert_ne!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_includes_stop_sequences() {
        // SECURITY: Verifies stop_sequences affect cache key
        let mut req1 = LLMRequest::simple("Test");
        req1.stop_sequences = Some(vec!["END".to_string()]);

        let mut req2 = LLMRequest::simple("Test");
        req2.stop_sequences = Some(vec!["STOP".to_string()]);

        assert_ne!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_none_vs_some() {
        // None vs Some(value) should produce different cache keys
        let req1 = LLMRequest::simple("Test");
        let req2 = LLMRequest::simple("Test").temperature(0.7);

        assert_ne!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_message_order_matters() {
        let req1 = LLMRequest::with_system("System prompt", "User message");
        let req2 = LLMRequest::simple("User message");

        // Different message structures should produce different keys
        assert_ne!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_multiple_parameters() {
        // Complex request with all parameters
        let mut req1 = LLMRequest::simple("Explain quantum physics")
            .model("gpt-4")
            .temperature(0.7)
            .max_tokens(500);
        req1.top_p = Some(0.9);
        req1.stop_sequences = Some(vec!["END".to_string()]);

        let mut req2 = LLMRequest::simple("Explain quantum physics")
            .model("gpt-4")
            .temperature(0.7)
            .max_tokens(500);
        req2.top_p = Some(0.9);
        req2.stop_sequences = Some(vec!["END".to_string()]);

        // Identical complex requests should have same cache key
        assert_eq!(req1.cache_key(), req2.cache_key());
    }

    #[test]
    fn test_cache_key_deterministic() {
        // Same request called multiple times should always produce same key
        let req = LLMRequest::simple("Test").model("gpt-4");

        let key1 = req.cache_key();
        let key2 = req.cache_key();
        let key3 = req.cache_key();

        assert_eq!(key1, key2);
        assert_eq!(key2, key3);
    }

    // ===== Response Tests =====

    #[test]
    fn test_response_creation() {
        let response = LLMResponse::new("Hello world", "gpt-4", 42);

        assert_eq!(response.content, "Hello world");
        assert_eq!(response.model, "gpt-4");
        assert_eq!(response.tokens_used, 42);
        assert_eq!(response.finish_reason, None);
        assert_eq!(response.cached, false);
    }

    #[test]
    fn test_response_string_conversions() {
        // Test with owned String
        let response = LLMResponse::new(String::from("Owned"), String::from("model"), 10);
        assert_eq!(response.content, "Owned");

        // Test with &str
        let response = LLMResponse::new("Borrowed", "model", 10);
        assert_eq!(response.content, "Borrowed");
    }

    #[test]
    fn test_response_empty_content() {
        let response = LLMResponse::new("", "gpt-4", 0);
        assert_eq!(response.content, "");
        assert_eq!(response.tokens_used, 0);
    }

    // ===== Role Serialization Tests =====

    #[test]
    fn test_role_equality() {
        assert_eq!(Role::System, Role::System);
        assert_eq!(Role::User, Role::User);
        assert_eq!(Role::Assistant, Role::Assistant);

        assert_ne!(Role::System, Role::User);
        assert_ne!(Role::User, Role::Assistant);
        assert_ne!(Role::System, Role::Assistant);
    }
}
