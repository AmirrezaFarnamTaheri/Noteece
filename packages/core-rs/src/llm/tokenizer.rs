//! Token Counting for LLM Requests
//!
//! Provides accurate token estimation before making API calls to:
//! - Prevent exceeding context limits
//! - Estimate costs before execution
//! - Optimize prompt engineering

use serde::{Deserialize, Serialize};

use super::types::{LLMRequest, Message};

/// Token count result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenCount {
    /// Total tokens in the request
    pub total: usize,
    /// Tokens in system message (if any)
    pub system_tokens: usize,
    /// Tokens in user messages
    pub user_tokens: usize,
    /// Tokens in assistant messages
    pub assistant_tokens: usize,
    /// Overhead tokens (special tokens, separators)
    pub overhead_tokens: usize,
}

impl TokenCount {
    /// Check if within context limit
    pub fn within_limit(&self, limit: usize) -> bool {
        self.total <= limit
    }

    /// Get remaining tokens for a given limit
    pub fn remaining(&self, limit: usize) -> usize {
        limit.saturating_sub(self.total)
    }
}

/// Model context limits
#[derive(Debug, Clone)]
pub struct ModelLimits {
    /// Maximum context window
    pub context_window: usize,
    /// Maximum output tokens
    pub max_output: usize,
    /// Recommended max input (leaving room for output)
    pub recommended_input: usize,
}

impl ModelLimits {
    /// Get limits for a known model
    pub fn for_model(model: &str) -> Self {
        match model {
            // OpenAI models
            "gpt-4" | "gpt-4-0613" => Self {
                context_window: 8192,
                max_output: 4096,
                recommended_input: 6000,
            },
            "gpt-4-32k" | "gpt-4-32k-0613" => Self {
                context_window: 32768,
                max_output: 4096,
                recommended_input: 28000,
            },
            "gpt-4-turbo" | "gpt-4-turbo-preview" | "gpt-4-1106-preview" => Self {
                context_window: 128000,
                max_output: 4096,
                recommended_input: 120000,
            },
            "gpt-4o" | "gpt-4o-mini" => Self {
                context_window: 128000,
                max_output: 16384,
                recommended_input: 110000,
            },
            "gpt-3.5-turbo" | "gpt-3.5-turbo-0125" => Self {
                context_window: 16385,
                max_output: 4096,
                recommended_input: 12000,
            },

            // Claude models
            "claude-3-opus-20240229" => Self {
                context_window: 200000,
                max_output: 4096,
                recommended_input: 190000,
            },
            "claude-3-sonnet-20240229" | "claude-3-5-sonnet-20241022" => Self {
                context_window: 200000,
                max_output: 4096,
                recommended_input: 190000,
            },
            "claude-3-haiku-20240307" => Self {
                context_window: 200000,
                max_output: 4096,
                recommended_input: 190000,
            },

            // Gemini models
            "gemini-1.5-pro" => Self {
                context_window: 1000000,
                max_output: 8192,
                recommended_input: 900000,
            },
            "gemini-1.5-flash" => Self {
                context_window: 1000000,
                max_output: 8192,
                recommended_input: 900000,
            },
            "gemini-1.0-pro" => Self {
                context_window: 32000,
                max_output: 8192,
                recommended_input: 28000,
            },

            // Ollama/local models (conservative defaults)
            "llama3" | "llama3.2" | "llama3.1" => Self {
                context_window: 8192,
                max_output: 2048,
                recommended_input: 6000,
            },
            "mistral" | "mixtral" => Self {
                context_window: 32768,
                max_output: 4096,
                recommended_input: 28000,
            },
            "codellama" => Self {
                context_window: 16384,
                max_output: 4096,
                recommended_input: 12000,
            },

            // Default for unknown models
            _ => Self {
                context_window: 4096,
                max_output: 2048,
                recommended_input: 3000,
            },
        }
    }
}

/// Token counter trait
pub trait TokenCounter: Send + Sync {
    /// Count tokens in a string
    fn count(&self, text: &str) -> usize;

    /// Count tokens in a request
    fn count_request(&self, request: &LLMRequest) -> TokenCount;
}

/// Simple character-based token estimator
/// Uses a heuristic of ~4 characters per token (average for English)
pub struct SimpleTokenCounter {
    /// Characters per token ratio
    chars_per_token: f32,
    /// Overhead per message
    message_overhead: usize,
}

impl SimpleTokenCounter {
    pub fn new() -> Self {
        Self {
            chars_per_token: 4.0,
            message_overhead: 4, // Typical overhead for role + separators
        }
    }

    /// Create with custom ratio
    pub fn with_ratio(chars_per_token: f32) -> Self {
        Self {
            chars_per_token,
            message_overhead: 4,
        }
    }
}

impl Default for SimpleTokenCounter {
    fn default() -> Self {
        Self::new()
    }
}

impl TokenCounter for SimpleTokenCounter {
    fn count(&self, text: &str) -> usize {
        (text.len() as f32 / self.chars_per_token).ceil() as usize
    }

    fn count_request(&self, request: &LLMRequest) -> TokenCount {
        let mut system_tokens = 0;
        let mut user_tokens = 0;
        let mut assistant_tokens = 0;

        for msg in &request.messages {
            let tokens = self.count(&msg.content) + self.message_overhead;
            match msg.role {
                super::types::Role::System => system_tokens += tokens,
                super::types::Role::User => user_tokens += tokens,
                super::types::Role::Assistant => assistant_tokens += tokens,
            }
        }

        // Base overhead for the request structure
        let overhead = 3;

        TokenCount {
            total: system_tokens + user_tokens + assistant_tokens + overhead,
            system_tokens,
            user_tokens,
            assistant_tokens,
            overhead_tokens: overhead + (request.messages.len() * self.message_overhead),
        }
    }
}

/// More accurate token counter using word-based estimation
/// Better for mixed content and non-English text
pub struct WordBasedCounter {
    /// Tokens per word ratio (English average ~1.3)
    tokens_per_word: f32,
    /// Overhead per message
    message_overhead: usize,
}

impl WordBasedCounter {
    pub fn new() -> Self {
        Self {
            tokens_per_word: 1.3,
            message_overhead: 4,
        }
    }
}

impl Default for WordBasedCounter {
    fn default() -> Self {
        Self::new()
    }
}

impl TokenCounter for WordBasedCounter {
    fn count(&self, text: &str) -> usize {
        let word_count = text.split_whitespace().count();
        // Also count special characters and numbers as potential separate tokens
        let special_count = text
            .chars()
            .filter(|c| !c.is_alphanumeric() && !c.is_whitespace())
            .count();

        ((word_count as f32 * self.tokens_per_word) + (special_count as f32 * 0.5)).ceil() as usize
    }

    fn count_request(&self, request: &LLMRequest) -> TokenCount {
        let mut system_tokens = 0;
        let mut user_tokens = 0;
        let mut assistant_tokens = 0;

        for msg in &request.messages {
            let tokens = self.count(&msg.content) + self.message_overhead;
            match msg.role {
                super::types::Role::System => system_tokens += tokens,
                super::types::Role::User => user_tokens += tokens,
                super::types::Role::Assistant => assistant_tokens += tokens,
            }
        }

        let overhead = 3;

        TokenCount {
            total: system_tokens + user_tokens + assistant_tokens + overhead,
            system_tokens,
            user_tokens,
            assistant_tokens,
            overhead_tokens: overhead + (request.messages.len() * self.message_overhead),
        }
    }
}

/// Validate request fits within model limits
pub fn validate_request_size(
    request: &LLMRequest,
    model: &str,
    counter: &dyn TokenCounter,
) -> Result<TokenCount, String> {
    let limits = ModelLimits::for_model(model);
    let count = counter.count_request(request);

    if count.total > limits.recommended_input {
        Err(format!(
            "Request has {} tokens, exceeds recommended {} for model {}",
            count.total, limits.recommended_input, model
        ))
    } else {
        Ok(count)
    }
}

/// Truncate messages to fit within a token limit
pub fn truncate_to_fit(
    messages: Vec<Message>,
    max_tokens: usize,
    counter: &dyn TokenCounter,
) -> Vec<Message> {
    let mut result = Vec::new();
    let mut current_tokens = 3; // Base overhead

    // Always keep system message if present
    if let Some(first) = messages.first() {
        if matches!(first.role, super::types::Role::System) {
            let tokens = counter.count(&first.content) + 4;
            if current_tokens + tokens <= max_tokens {
                result.push(first.clone());
                current_tokens += tokens;
            }
        }
    }

    // Add messages from most recent, working backwards
    let non_system: Vec<_> = messages
        .iter()
        .filter(|m| !matches!(m.role, super::types::Role::System))
        .collect();

    for msg in non_system.iter().rev() {
        let tokens = counter.count(&msg.content) + 4;
        if current_tokens + tokens <= max_tokens {
            result.insert(if result.is_empty() { 0 } else { 1 }, (*msg).clone());
            current_tokens += tokens;
        } else {
            break;
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_counter() {
        let counter = SimpleTokenCounter::new();

        // ~4 chars per token
        assert_eq!(counter.count("test"), 1); // 4 chars = 1 token
        assert_eq!(counter.count("hello world"), 3); // 11 chars = 3 tokens
    }

    #[test]
    fn test_word_based_counter() {
        let counter = WordBasedCounter::new();

        // ~1.3 tokens per word
        assert_eq!(counter.count("hello"), 2); // 1 word * 1.3 = 2
        assert_eq!(counter.count("hello world"), 3); // 2 words * 1.3 = 3
    }

    #[test]
    fn test_request_counting() {
        let counter = SimpleTokenCounter::new();
        let request = LLMRequest::with_system("Be helpful", "What is 2+2?");

        let count = counter.count_request(&request);
        assert!(count.total > 0);
        assert!(count.system_tokens > 0);
        assert!(count.user_tokens > 0);
    }

    #[test]
    fn test_model_limits() {
        let gpt4_limits = ModelLimits::for_model("gpt-4");
        assert_eq!(gpt4_limits.context_window, 8192);

        let claude_limits = ModelLimits::for_model("claude-3-opus-20240229");
        assert_eq!(claude_limits.context_window, 200000);

        let unknown_limits = ModelLimits::for_model("unknown-model");
        assert_eq!(unknown_limits.context_window, 4096); // Default
    }

    #[test]
    fn test_token_count_within_limit() {
        let count = TokenCount {
            total: 1000,
            system_tokens: 100,
            user_tokens: 800,
            assistant_tokens: 0,
            overhead_tokens: 100,
        };

        assert!(count.within_limit(2000));
        assert!(!count.within_limit(500));
        assert_eq!(count.remaining(2000), 1000);
    }

    #[test]
    fn test_truncate_to_fit() {
        let counter = SimpleTokenCounter::new();
        let messages = vec![
            Message::system("System prompt"),
            Message::user("First question"),
            Message::assistant("First answer"),
            Message::user("Second question"),
        ];

        // Truncate to very small limit - should keep system + most recent
        let truncated = truncate_to_fit(messages, 50, &counter);
        assert!(!truncated.is_empty());
        // System message should be preserved if it fits
    }
}
