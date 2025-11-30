//! Streaming Response Support for LLM Providers
//!
//! This module provides streaming capabilities for LLM completions,
//! allowing real-time token-by-token response handling.

use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::pin::Pin;
use tokio::sync::mpsc;

use super::error::LLMError;
use super::types::Role;

/// A single chunk from a streaming response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    /// The text content of this chunk
    pub content: String,
    /// Whether this is the final chunk
    pub is_final: bool,
    /// Running token count (if available)
    pub tokens_so_far: Option<usize>,
    /// The finish reason (only on final chunk)
    pub finish_reason: Option<String>,
}

impl StreamChunk {
    /// Create a new content chunk
    pub fn content(text: impl Into<String>) -> Self {
        Self {
            content: text.into(),
            is_final: false,
            tokens_so_far: None,
            finish_reason: None,
        }
    }

    /// Create a final chunk with finish reason
    pub fn final_chunk(text: impl Into<String>, reason: impl Into<String>) -> Self {
        Self {
            content: text.into(),
            is_final: true,
            tokens_so_far: None,
            finish_reason: Some(reason.into()),
        }
    }

    /// Create an empty final chunk
    pub fn done(reason: impl Into<String>) -> Self {
        Self {
            content: String::new(),
            is_final: true,
            tokens_so_far: None,
            finish_reason: Some(reason.into()),
        }
    }
}

/// Type alias for the streaming response
pub type StreamResponse = Pin<Box<dyn Stream<Item = Result<StreamChunk, LLMError>> + Send>>;

/// Streaming request builder
#[derive(Debug, Clone)]
pub struct StreamRequest {
    pub model: Option<String>,
    pub messages: Vec<StreamMessage>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<usize>,
    pub top_p: Option<f32>,
    pub stop_sequences: Option<Vec<String>>,
}

/// Message for streaming requests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamMessage {
    pub role: Role,
    pub content: String,
}

impl StreamRequest {
    /// Create a simple streaming request
    pub fn simple(prompt: impl Into<String>) -> Self {
        Self {
            model: None,
            messages: vec![StreamMessage {
                role: Role::User,
                content: prompt.into(),
            }],
            temperature: None,
            max_tokens: None,
            top_p: None,
            stop_sequences: None,
        }
    }

    /// Create with system message
    pub fn with_system(system: impl Into<String>, user: impl Into<String>) -> Self {
        Self {
            model: None,
            messages: vec![
                StreamMessage {
                    role: Role::System,
                    content: system.into(),
                },
                StreamMessage {
                    role: Role::User,
                    content: user.into(),
                },
            ],
            temperature: None,
            max_tokens: None,
            top_p: None,
            stop_sequences: None,
        }
    }

    /// Set the model
    pub fn model(mut self, model: impl Into<String>) -> Self {
        self.model = Some(model.into());
        self
    }

    /// Set temperature
    pub fn temperature(mut self, temp: f32) -> Self {
        self.temperature = Some(temp);
        self
    }

    /// Set max tokens
    pub fn max_tokens(mut self, max: usize) -> Self {
        self.max_tokens = Some(max);
        self
    }
}

/// Stream collector - accumulates chunks into a full response
pub struct StreamCollector {
    chunks: Vec<StreamChunk>,
    full_content: String,
    total_tokens: usize,
}

impl StreamCollector {
    pub fn new() -> Self {
        Self {
            chunks: Vec::new(),
            full_content: String::new(),
            total_tokens: 0,
        }
    }

    /// Add a chunk to the collector
    pub fn push(&mut self, chunk: StreamChunk) {
        self.full_content.push_str(&chunk.content);
        if let Some(tokens) = chunk.tokens_so_far {
            self.total_tokens = tokens;
        }
        self.chunks.push(chunk);
    }

    /// Get the accumulated content
    pub fn content(&self) -> &str {
        &self.full_content
    }

    /// Get total tokens (if available)
    pub fn tokens(&self) -> usize {
        self.total_tokens
    }

    /// Get all chunks
    pub fn chunks(&self) -> &[StreamChunk] {
        &self.chunks
    }

    /// Check if streaming is complete
    pub fn is_complete(&self) -> bool {
        self.chunks.last().map(|c| c.is_final).unwrap_or(false)
    }

    /// Get the finish reason
    pub fn finish_reason(&self) -> Option<&str> {
        self.chunks.last().and_then(|c| c.finish_reason.as_deref())
    }
}

impl Default for StreamCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// Channel-based streaming handler for easier consumption
pub struct StreamHandler {
    receiver: mpsc::Receiver<Result<StreamChunk, LLMError>>,
}

impl StreamHandler {
    /// Create a new stream handler with channel capacity
    pub fn new(capacity: usize) -> (Self, mpsc::Sender<Result<StreamChunk, LLMError>>) {
        let (sender, receiver) = mpsc::channel(capacity);
        (Self { receiver }, sender)
    }

    /// Receive the next chunk
    pub async fn next(&mut self) -> Option<Result<StreamChunk, LLMError>> {
        self.receiver.recv().await
    }

    /// Collect all chunks into a string
    pub async fn collect_to_string(mut self) -> Result<String, LLMError> {
        let mut result = String::new();
        while let Some(chunk_result) = self.receiver.recv().await {
            let chunk = chunk_result?;
            result.push_str(&chunk.content);
            if chunk.is_final {
                break;
            }
        }
        Ok(result)
    }

    /// Collect all chunks into a collector
    pub async fn collect(mut self) -> Result<StreamCollector, LLMError> {
        let mut collector = StreamCollector::new();
        while let Some(chunk_result) = self.receiver.recv().await {
            let chunk = chunk_result?;
            let is_final = chunk.is_final;
            collector.push(chunk);
            if is_final {
                break;
            }
        }
        Ok(collector)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_chunk_creation() {
        let chunk = StreamChunk::content("Hello");
        assert_eq!(chunk.content, "Hello");
        assert!(!chunk.is_final);
        assert!(chunk.finish_reason.is_none());
    }

    #[test]
    fn test_stream_chunk_final() {
        let chunk = StreamChunk::final_chunk("Done", "stop");
        assert_eq!(chunk.content, "Done");
        assert!(chunk.is_final);
        assert_eq!(chunk.finish_reason, Some("stop".to_string()));
    }

    #[test]
    fn test_stream_collector() {
        let mut collector = StreamCollector::new();
        collector.push(StreamChunk::content("Hello "));
        collector.push(StreamChunk::content("World"));
        collector.push(StreamChunk::done("stop"));

        assert_eq!(collector.content(), "Hello World");
        assert!(collector.is_complete());
        assert_eq!(collector.finish_reason(), Some("stop"));
    }

    #[test]
    fn test_stream_request_builder() {
        let req = StreamRequest::simple("Test")
            .model("gpt-4")
            .temperature(0.7)
            .max_tokens(100);

        assert_eq!(req.model, Some("gpt-4".to_string()));
        assert_eq!(req.temperature, Some(0.7));
        assert_eq!(req.max_tokens, Some(100));
    }

    #[tokio::test]
    async fn test_stream_handler() {
        let (handler, sender) = StreamHandler::new(10);

        // Spawn sender
        tokio::spawn(async move {
            sender.send(Ok(StreamChunk::content("Hello "))).await.ok();
            sender.send(Ok(StreamChunk::content("World"))).await.ok();
            sender.send(Ok(StreamChunk::done("stop"))).await.ok();
        });

        let result = handler.collect_to_string().await.unwrap();
        assert_eq!(result, "Hello World");
    }
}
