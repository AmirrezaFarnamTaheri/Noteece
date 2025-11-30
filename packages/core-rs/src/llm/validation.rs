//! Response Validation for LLM Outputs
//!
//! Provides validation capabilities for LLM responses including:
//! - JSON schema validation
//! - Content format validation
//! - Safety checks
//! - Custom validators

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::error::LLMError;
use super::types::LLMResponse;

/// Validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    /// Whether validation passed
    pub is_valid: bool,
    /// List of validation errors
    pub errors: Vec<ValidationError>,
    /// Validation metadata
    pub metadata: HashMap<String, String>,
}

impl ValidationResult {
    /// Create a successful validation result
    pub fn success() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    /// Create a failed validation result
    pub fn failure(errors: Vec<ValidationError>) -> Self {
        Self {
            is_valid: false,
            errors,
            metadata: HashMap::new(),
        }
    }

    /// Add metadata
    pub fn with_metadata(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.metadata.insert(key.into(), value.into());
        self
    }
}

/// A single validation error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    /// Error code
    pub code: String,
    /// Human-readable message
    pub message: String,
    /// Path to the error (for nested structures)
    pub path: Option<String>,
    /// Severity level
    pub severity: ValidationSeverity,
}

impl ValidationError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            path: None,
            severity: ValidationSeverity::Error,
        }
    }

    pub fn warning(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            path: None,
            severity: ValidationSeverity::Warning,
        }
    }

    pub fn with_path(mut self, path: impl Into<String>) -> Self {
        self.path = Some(path.into());
        self
    }
}

/// Severity levels for validation errors
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValidationSeverity {
    /// Hard error - validation fails
    Error,
    /// Warning - validation passes but with concerns
    Warning,
    /// Informational note
    Info,
}

/// Trait for response validators
pub trait ResponseValidator: Send + Sync {
    /// Validate the response
    fn validate(&self, response: &LLMResponse) -> ValidationResult;

    /// Get validator name
    fn name(&self) -> &str;
}

/// Validates that response is valid JSON
pub struct JsonValidator {
    /// Whether to require a specific schema
    pub strict_schema: Option<String>,
}

impl JsonValidator {
    pub fn new() -> Self {
        Self {
            strict_schema: None,
        }
    }

    pub fn with_schema(schema: impl Into<String>) -> Self {
        Self {
            strict_schema: Some(schema.into()),
        }
    }
}

impl Default for JsonValidator {
    fn default() -> Self {
        Self::new()
    }
}

impl ResponseValidator for JsonValidator {
    fn validate(&self, response: &LLMResponse) -> ValidationResult {
        // Try to parse as JSON
        let content = response.content.trim();

        // Extract JSON from markdown code blocks if present
        let json_content = if content.starts_with("```json") {
            content
                .trim_start_matches("```json")
                .trim_end_matches("```")
                .trim()
        } else if content.starts_with("```") {
            content
                .trim_start_matches("```")
                .trim_end_matches("```")
                .trim()
        } else {
            content
        };

        match serde_json::from_str::<serde_json::Value>(json_content) {
            Ok(_) => ValidationResult::success()
                .with_metadata("format", "json")
                .with_metadata("parsed", "true"),
            Err(e) => ValidationResult::failure(vec![ValidationError::new(
                "INVALID_JSON",
                format!("Response is not valid JSON: {}", e),
            )]),
        }
    }

    fn name(&self) -> &str {
        "json_validator"
    }
}

/// Validates minimum/maximum length
pub struct LengthValidator {
    pub min_length: Option<usize>,
    pub max_length: Option<usize>,
    pub min_words: Option<usize>,
    pub max_words: Option<usize>,
}

impl LengthValidator {
    pub fn new() -> Self {
        Self {
            min_length: None,
            max_length: None,
            min_words: None,
            max_words: None,
        }
    }

    pub fn min_chars(mut self, min: usize) -> Self {
        self.min_length = Some(min);
        self
    }

    pub fn max_chars(mut self, max: usize) -> Self {
        self.max_length = Some(max);
        self
    }

    pub fn min_words(mut self, min: usize) -> Self {
        self.min_words = Some(min);
        self
    }

    pub fn max_words(mut self, max: usize) -> Self {
        self.max_words = Some(max);
        self
    }
}

impl Default for LengthValidator {
    fn default() -> Self {
        Self::new()
    }
}

impl ResponseValidator for LengthValidator {
    fn validate(&self, response: &LLMResponse) -> ValidationResult {
        let mut errors = Vec::new();
        let content = &response.content;
        let char_count = content.len();
        let word_count = content.split_whitespace().count();

        if let Some(min) = self.min_length {
            if char_count < min {
                errors.push(ValidationError::new(
                    "TOO_SHORT",
                    format!("Response has {} characters, minimum is {}", char_count, min),
                ));
            }
        }

        if let Some(max) = self.max_length {
            if char_count > max {
                errors.push(ValidationError::new(
                    "TOO_LONG",
                    format!("Response has {} characters, maximum is {}", char_count, max),
                ));
            }
        }

        if let Some(min) = self.min_words {
            if word_count < min {
                errors.push(ValidationError::new(
                    "TOO_FEW_WORDS",
                    format!("Response has {} words, minimum is {}", word_count, min),
                ));
            }
        }

        if let Some(max) = self.max_words {
            if word_count > max {
                errors.push(ValidationError::new(
                    "TOO_MANY_WORDS",
                    format!("Response has {} words, maximum is {}", word_count, max),
                ));
            }
        }

        if errors.is_empty() {
            ValidationResult::success()
                .with_metadata("char_count", char_count.to_string())
                .with_metadata("word_count", word_count.to_string())
        } else {
            ValidationResult::failure(errors)
        }
    }

    fn name(&self) -> &str {
        "length_validator"
    }
}

/// Validates content doesn't contain forbidden patterns
pub struct ContentFilter {
    /// Patterns to reject
    pub forbidden_patterns: Vec<String>,
    /// Required patterns
    pub required_patterns: Vec<String>,
}

impl ContentFilter {
    pub fn new() -> Self {
        Self {
            forbidden_patterns: Vec::new(),
            required_patterns: Vec::new(),
        }
    }

    pub fn forbid(mut self, pattern: impl Into<String>) -> Self {
        self.forbidden_patterns.push(pattern.into());
        self
    }

    pub fn require(mut self, pattern: impl Into<String>) -> Self {
        self.required_patterns.push(pattern.into());
        self
    }

    /// Create a safety filter with common harmful patterns
    pub fn safety_filter() -> Self {
        Self::new()
            .forbid("I cannot")
            .forbid("I'm sorry, but")
            .forbid("As an AI")
            .forbid("I don't have access")
    }
}

impl Default for ContentFilter {
    fn default() -> Self {
        Self::new()
    }
}

impl ResponseValidator for ContentFilter {
    fn validate(&self, response: &LLMResponse) -> ValidationResult {
        let mut errors = Vec::new();
        let content = &response.content;
        let content_lower = content.to_lowercase();

        // Check forbidden patterns
        for pattern in &self.forbidden_patterns {
            if content_lower.contains(&pattern.to_lowercase()) {
                errors.push(ValidationError::new(
                    "FORBIDDEN_CONTENT",
                    format!("Response contains forbidden pattern: {}", pattern),
                ));
            }
        }

        // Check required patterns
        for pattern in &self.required_patterns {
            if !content_lower.contains(&pattern.to_lowercase()) {
                errors.push(ValidationError::new(
                    "MISSING_CONTENT",
                    format!("Response missing required pattern: {}", pattern),
                ));
            }
        }

        if errors.is_empty() {
            ValidationResult::success()
        } else {
            ValidationResult::failure(errors)
        }
    }

    fn name(&self) -> &str {
        "content_filter"
    }
}

/// Composite validator that runs multiple validators
pub struct CompositeValidator {
    validators: Vec<Box<dyn ResponseValidator>>,
    /// Whether to stop on first error
    pub fail_fast: bool,
}

impl CompositeValidator {
    pub fn new() -> Self {
        Self {
            validators: Vec::new(),
            fail_fast: false,
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn add<V: ResponseValidator + 'static>(mut self, validator: V) -> Self {
        self.validators.push(Box::new(validator));
        self
    }

    pub fn fail_fast(mut self) -> Self {
        self.fail_fast = true;
        self
    }
}

impl Default for CompositeValidator {
    fn default() -> Self {
        Self::new()
    }
}

impl ResponseValidator for CompositeValidator {
    fn validate(&self, response: &LLMResponse) -> ValidationResult {
        let mut all_errors = Vec::new();
        let mut metadata = HashMap::new();

        for validator in &self.validators {
            let result = validator.validate(response);

            // Merge metadata
            metadata.extend(result.metadata);

            if !result.is_valid {
                all_errors.extend(result.errors);
                if self.fail_fast {
                    return ValidationResult {
                        is_valid: false,
                        errors: all_errors,
                        metadata,
                    };
                }
            }
        }

        ValidationResult {
            is_valid: all_errors.is_empty(),
            errors: all_errors,
            metadata,
        }
    }

    fn name(&self) -> &str {
        "composite_validator"
    }
}

/// Validate a response and return the response if valid
pub fn validate_response<V: ResponseValidator>(
    response: LLMResponse,
    validator: &V,
) -> Result<LLMResponse, LLMError> {
    let result = validator.validate(&response);

    if result.is_valid {
        Ok(response)
    } else {
        let error_messages: Vec<String> = result.errors.iter().map(|e| e.message.clone()).collect();
        Err(LLMError::ValidationError(error_messages.join("; ")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_json_validator_success() {
        let response = LLMResponse::new(r#"{"key": "value"}"#, "model", 10);
        let validator = JsonValidator::new();
        let result = validator.validate(&response);
        assert!(result.is_valid);
    }

    #[test]
    fn test_json_validator_failure() {
        let response = LLMResponse::new("not json", "model", 10);
        let validator = JsonValidator::new();
        let result = validator.validate(&response);
        assert!(!result.is_valid);
        assert!(!result.errors.is_empty());
    }

    #[test]
    fn test_json_validator_with_markdown() {
        let response = LLMResponse::new("```json\n{\"key\": \"value\"}\n```", "model", 10);
        let validator = JsonValidator::new();
        let result = validator.validate(&response);
        assert!(result.is_valid);
    }

    #[test]
    fn test_length_validator() {
        let short = LLMResponse::new("Hi", "model", 1);
        let long = LLMResponse::new(
            "This is a much longer response with many words",
            "model",
            10,
        );

        let validator = LengthValidator::new().min_chars(10).max_chars(100);

        assert!(!validator.validate(&short).is_valid);
        assert!(validator.validate(&long).is_valid);
    }

    #[test]
    fn test_content_filter() {
        let good = LLMResponse::new("Here is the answer: 42", "model", 5);
        let bad = LLMResponse::new("I cannot help with that", "model", 5);

        let validator = ContentFilter::safety_filter();

        assert!(validator.validate(&good).is_valid);
        assert!(!validator.validate(&bad).is_valid);
    }

    #[test]
    fn test_composite_validator() {
        let response = LLMResponse::new(r#"{"result": "success"}"#, "model", 10);

        let validator = CompositeValidator::new()
            .add(JsonValidator::new())
            .add(LengthValidator::new().min_chars(5));

        let result = validator.validate(&response);
        assert!(result.is_valid);
    }
}
