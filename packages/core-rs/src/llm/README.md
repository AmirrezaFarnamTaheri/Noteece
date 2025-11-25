# LLM Integration Module

**Version:** 1.0
**Status:** Production Ready
**Language:** Rust

## Overview

Comprehensive Language Model integration framework supporting both local (Ollama) and cloud-based (OpenAI, Claude, Gemini) LLM providers with automatic fallback, response caching, and hybrid routing strategies.

## Architecture

```
llm/
├── mod.rs              # Main client and API
├── types.rs            # Request/Response types
├── error.rs            # Error definitions
├── config.rs           # Configuration
├── cache.rs            # Response caching
└── providers/
    ├── mod.rs          # Provider trait
    ├── ollama.rs       # Local Ollama provider
    ├── openai.rs       # OpenAI cloud provider
    ├── claude.rs       # Anthropic Claude provider
    └── gemini.rs       # Google Gemini provider
```

## Features

✅ **Multi-Provider Support**

- Local: Ollama (Llama 3, Mistral, Code Llama, etc.)
- Cloud: OpenAI (GPT-4, GPT-3.5-turbo)
- Cloud: Claude (Claude 3 Opus, Sonnet, Haiku)
- Cloud: Gemini (Gemini 1.5 Pro, Flash)

✅ **Intelligent Fallback**

- Automatic failover to backup providers
- Configurable fallback chains
- Health checking

✅ **Response Caching**

- SQLite-based persistent cache
- Automatic cache key generation
- Configurable TTL and cleanup
- Cache statistics

✅ **Hybrid Routing**

- Privacy-first (local-only)
- Cloud-first with local fallback
- Balanced hybrid mode

✅ **Production-Ready**

- Comprehensive error handling
- Structured logging
- Type-safe API
- Full async support

## Quick Start

### Basic Usage

```rust
use core_rs::llm::{LLMClient, LLMConfig, LLMRequest};
use rusqlite::Connection;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize database
    let conn = Connection::open("noteece.db")?;

    // Create LLM client with default configuration (Ollama)
    let config = LLMConfig::default();
    let client = LLMClient::new(config, &conn)?;

    // Create a simple request
    let request = LLMRequest::simple("What is the capital of France?")
        .model("llama3");

    // Generate completion
    let response = client.complete(request).await?;

    println!("Response: {}", response.content);
    println!("Tokens used: {}", response.tokens_used);

    Ok(())
}
```

### Configuration Modes

#### 1. Privacy-First (Local Only)

```rust
let config = LLMConfig::privacy_first();
let client = LLMClient::new(config, &conn)?;

// All requests will use local Ollama
// No data sent to cloud services
```

#### 2. Cloud-First with Fallback

```rust
let config = LLMConfig::cloud_first("your-openai-api-key");
let client = LLMClient::new(config, &conn)?;

// Tries OpenAI first
// Falls back to local Ollama if OpenAI fails
```

#### 3. Balanced Hybrid

```rust
let config = LLMConfig::hybrid("your-openai-api-key");
let client = LLMClient::new(config, &conn)?;

// Tries local Ollama first (fast, private, free)
// Falls back to OpenAI for complex tasks
```

#### 4. Custom Configuration

```rust
use core_rs::llm::providers::ProviderType;

let config = LLMConfig {
    default_provider: ProviderType::Ollama,
    fallback_chain: vec![ProviderType::OpenAI, ProviderType::Claude],
    max_tokens: 4096,
    temperature: 0.7,
    use_cache: true,
    privacy_mode: false,
    ollama_base_url: "http://localhost:11434".to_string(),
    openai_api_key: Some("your-key".to_string()),
    anthropic_api_key: Some("your-key".to_string()),
    google_api_key: None,
};

let client = LLMClient::new(config, &conn)?;
```

## Request Building

### Simple Requests

```rust
// Single user message
let request = LLMRequest::simple("Hello, world!");

// With system prompt
let request = LLMRequest::with_system(
    "You are a helpful assistant",
    "Tell me a joke"
);
```

### Advanced Requests

```rust
use core_rs::llm::Message;

let request = LLMRequest {
    model: Some("gpt-4".to_string()),
    messages: vec![
        Message::system("You are a coding assistant"),
        Message::user("Write a function to reverse a string"),
    ],
    temperature: Some(0.5),
    max_tokens: Some(1000),
    top_p: Some(0.9),
    stop_sequences: Some(vec!["END".to_string()]),
};

let response = client.complete(request).await?;
```

### Builder Pattern

```rust
let request = LLMRequest::simple("Explain quantum computing")
    .model("llama3")
    .temperature(0.7)
    .max_tokens(500);

let response = client.complete(request).await?;
```

## Provider Details

### Ollama (Local)

**Requirements:**

- Ollama installed and running
- Models pulled: `ollama pull llama3`

**Supported Models:**

- Llama 3 (8B, 70B)
- Mistral (7B)
- Code Llama
- Phi-2
- Custom fine-tuned models

**Advantages:**

- ✅ Free (no API costs)
- ✅ Private (data never leaves your machine)
- ✅ Fast (local inference)
- ✅ Offline capable
- ✅ No rate limits

**Configuration:**

```rust
let config = LLMConfig {
    ollama_base_url: "http://localhost:11434".to_string(),
    ..Default::default()
};
```

### OpenAI (Cloud)

**Requirements:**

- OpenAI API key

**Supported Models:**

- GPT-4
- GPT-4 Turbo
- GPT-3.5 Turbo

**Advantages:**

- ✅ State-of-the-art performance
- ✅ Large context windows
- ✅ No local setup required
- ✅ Always up-to-date

**Considerations:**

- ⚠️ API costs (pay per token)
- ⚠️ Data sent to OpenAI servers
- ⚠️ Rate limits apply
- ⚠️ Requires internet connection

**Configuration:**

```rust
let config = LLMConfig {
    openai_api_key: Some("sk-...".to_string()),
    ..Default::default()
};
```

## Caching

### Automatic Caching

```rust
let config = LLMConfig {
    use_cache: true,  // Enable caching
    ..Default::default()
};

let client = LLMClient::new(config, &conn)?;

// First call - goes to provider
let response1 = client.complete(request.clone()).await?;
assert!(!response1.cached);

// Second call - served from cache
let response2 = client.complete(request.clone()).await?;
assert!(response2.cached);
```

### Cache Management

```rust
// Get cache statistics
let stats = client.cache_stats()?;
println!("Total entries: {}", stats.total_entries);
println!("Total hits: {}", stats.total_hits);
println!("Hit rate: {:.2}%", stats.hit_rate * 100.0);
println!("Cache size: {} bytes", stats.size_bytes);

// Clear cache
client.clear_cache()?;
```

## Use Cases

### 1. Social Media Intelligence

```rust
// Auto-categorize social media posts
let request = LLMRequest::with_system(
    "You are a social media categorization assistant. Categorize posts into: News, Personal, Work, Entertainment, Other.",
    &format!("Categorize this post: {}", post_content)
).model("llama3");

let response = client.complete(request).await?;
let category = response.content;
```

### 2. Note Enhancement

```rust
// Grammar correction
let request = LLMRequest::with_system(
    "You are a grammar correction assistant. Fix grammar and spelling errors.",
    note_content
).model("gpt-3.5-turbo");

let corrected = client.complete(request).await?;
```

### 3. Meeting Summarization

```rust
// Summarize meeting transcripts
let request = LLMRequest::with_system(
    "Summarize this meeting transcript into key points, action items, and decisions.",
    transcript
).model("gpt-4").max_tokens(1000);

let summary = client.complete(request).await?;
```

### 4. Code Generation

```rust
// Generate code from natural language
let request = LLMRequest::with_system(
    "You are a Rust programming assistant. Generate clean, idiomatic Rust code.",
    "Write a function to merge two sorted arrays"
).model("codellama");

let code = client.complete(request).await?;
```

### 5. Semantic Search Enhancement

```rust
// Convert natural language queries to search terms
let request = LLMRequest::with_system(
    "Convert this natural language query into search keywords",
    user_query
).model("llama3");

let keywords = client.complete(request).await?;
```

## Error Handling

```rust
use core_rs::llm::LLMError;

match client.complete(request).await {
    Ok(response) => {
        println!("Success: {}", response.content);
    }
    Err(LLMError::RateLimitExceeded) => {
        eprintln!("Rate limit hit, try again later");
    }
    Err(LLMError::ProviderError(msg)) => {
        eprintln!("Provider error: {}", msg);
    }
    Err(LLMError::NetworkError(msg)) => {
        eprintln!("Network error: {}", msg);
    }
    Err(e) => {
        eprintln!("Error: {}", e);
    }
}
```

## Logging

All operations are logged with structured logging:

```
[LLM] Initializing LLM client with provider: Ollama
[LLM::Cache] Initializing response cache
[LLM] Processing request - model: Some("llama3"), messages: 1, use_cache: true
[LLM::Cache] Cache miss for key: a1b2c3d4
[LLM::Ollama] Generating completion - model: Some("llama3"), messages: 1
[LLM::Ollama] Sending request to http://localhost:11434/api/chat
[LLM::Ollama] Completion successful - tokens: 42, model: llama3
[LLM::Cache] Cached response for key: a1b2c3d4
[LLM] Successfully generated completion - tokens: 42
```

## Performance Considerations

### Local (Ollama)

- **Latency:** 1-5 seconds for small models (8B parameters)
- **Throughput:** Depends on hardware (GPU recommended)
- **Cost:** Free
- **Scaling:** Limited by local hardware

### Cloud (OpenAI)

- **Latency:** 2-8 seconds (network dependent)
- **Throughput:** High (OpenAI infrastructure)
- **Cost:** ~$0.01-0.06 per 1K tokens
- **Scaling:** Unlimited (subject to rate limits)

### Caching Impact

- **Cache hit latency:** <10ms
- **Cost savings:** 100% for cached responses
- **Hit rate:** Typically 20-40% in practice

## Cost Optimization

### Strategies

1. **Use Local Models for Simple Tasks**

   ```rust
   // Simple tasks (categorization, extraction)
   let request = request.model("llama3");  // Free
   ```

2. **Use Cloud for Complex Tasks**

   ```rust
   // Complex reasoning, long-form generation
   let request = request.model("gpt-4");  // High quality
   ```

3. **Enable Caching**

   ```rust
   let config = LLMConfig {
       use_cache: true,  // 100% savings on repeated requests
       ..Default::default()
   };
   ```

4. **Set Token Limits**

   ```rust
   let request = request.max_tokens(500);  // Prevent excessive costs
   ```

5. **Hybrid Strategy**
   ```rust
   let config = LLMConfig::hybrid(api_key);  // Local first, cloud fallback
   ```

## Security Considerations

### API Key Management

```rust
// ❌ Don't hardcode API keys
let config = LLMConfig {
    openai_api_key: Some("sk-...".to_string()),
    ..Default::default()
};

// ✅ Load from environment or secure storage
let api_key = std::env::var("OPENAI_API_KEY")?;
let config = LLMConfig {
    openai_api_key: Some(api_key),
    ..Default::default()
};
```

### Privacy Mode

```rust
// Force local-only processing
let config = LLMConfig {
    privacy_mode: true,  // Prevents cloud providers
    ..Default::default()
};
```

### Data Handling

- ✅ Cache is stored in encrypted SQLite database (SQLCipher)
- ✅ Requests/responses never logged with sensitive content
- ✅ Local models never send data externally
- ⚠️ Cloud providers process data on their servers

## Troubleshooting

### Ollama Connection Issues

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Pull a model
ollama pull llama3
```

### OpenAI Authentication

```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Cache Issues

```rust
// Clear corrupted cache
client.clear_cache()?;

// Check cache stats
let stats = client.cache_stats()?;
println!("{:?}", stats);
```

## Roadmap

### ✅ Completed (v1.1.0)

**Providers:**
- [x] Ollama provider (local) - Llama 3, Mistral, CodeLlama
- [x] OpenAI provider - GPT-4, GPT-3.5-turbo
- [x] Claude provider (Anthropic) - Claude 3 Opus, Sonnet, Haiku
- [x] Gemini provider (Google) - Gemini 1.5 Pro, Flash
- [x] Automatic provider fallback
- [x] Health checking for all providers

**Core Features:**
- [x] Response caching with SQLite
- [x] Streaming responses (`streaming.rs`)
- [x] Batch processing (`batch.rs`)
- [x] Response validation (`validation.rs`)
- [x] Token counting before requests (`tokenizer.rs`)
- [x] Cost tracking per provider (`cost.rs`)
- [x] Auto-retry with exponential backoff (`retry.rs`)
- [x] Circuit breaker pattern
- [x] Request prioritization (`priority.rs`)
- [x] Model context limits database

### Future Enhancements

- [ ] Multi-model ensemble
- [ ] A/B testing framework
- [ ] Fine-tuning integration
- [ ] Prompt template library
- [ ] Semantic caching (embedding-based)
- [ ] Usage analytics dashboard

## Testing

```rust
#[tokio::test]
async fn test_local_completion() {
    let conn = Connection::open_in_memory().unwrap();
    let config = LLMConfig::privacy_first();
    let client = LLMClient::new(config, &conn).unwrap();

    let request = LLMRequest::simple("2+2=?").model("llama3");
    let response = client.complete(request).await.unwrap();

    assert!(!response.content.is_empty());
    assert!(response.tokens_used > 0);
}
```

## License

See main project LICENSE file.

---

_For integration examples, see `/docs/llm-integration-examples.md`_
_For API reference, see inline documentation_
_For troubleshooting, see above section or GitHub issues_
