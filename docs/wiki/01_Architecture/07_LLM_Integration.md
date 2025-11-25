# LLM Integration Architecture

This document describes the architecture of Noteece's Language Model integration.

## Overview

Noteece supports multiple LLM providers through a unified interface:

```
┌─────────────────────────────────────────────────┐
│                  LLM Client                      │
│  ┌──────────┐  ┌────────┐  ┌───────────────┐   │
│  │ Provider │  │ Cache  │  │ Cost Tracker  │   │
│  │ Manager  │  │ Layer  │  │               │   │
│  └────┬─────┘  └────┬───┘  └───────┬───────┘   │
│       │             │              │            │
│  ┌────▼─────────────▼──────────────▼───────┐   │
│  │              Request Router              │   │
│  └────┬─────────────┬──────────────┬───────┘   │
│       │             │              │            │
│  ┌────▼────┐  ┌─────▼────┐  ┌──────▼─────┐    │
│  │ Ollama  │  │  OpenAI  │  │   Claude   │    │
│  │Provider │  │ Provider │  │  Provider  │    │
│  └─────────┘  └──────────┘  └────────────┘    │
└─────────────────────────────────────────────────┘
```

## Providers

### Ollama (Local)

- **Location**: `packages/core-rs/src/llm/providers/ollama.rs`
- **Features**: Local inference, streaming, no API key needed
- **Models**: llama3.2, mistral, codellama, etc.

### OpenAI

- **Location**: `packages/core-rs/src/llm/providers/openai.rs`
- **Features**: GPT-4, GPT-4 Turbo, GPT-3.5
- **Auth**: API key required

### Claude

- **Location**: `packages/core-rs/src/llm/providers/claude.rs`
- **Features**: Opus, Sonnet, Haiku, long context
- **Auth**: API key required

### Gemini

- **Location**: `packages/core-rs/src/llm/providers/gemini.rs`
- **Features**: Gemini 1.5 Pro/Flash, multimodal
- **Auth**: API key required

## Components

### Request Flow

```
User Request
     │
     ▼
┌────────────┐
│ Validation │ ─── Check token limits, sanitize input
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Cache    │ ─── Check for cached response
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Router   │ ─── Select provider, apply retry policy
└─────┬──────┘
      │
      ▼
┌────────────┐
│  Provider  │ ─── Execute request, stream if enabled
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Track    │ ─── Cost tracking, usage metrics
└────────────┘
```

### Streaming

Streaming is implemented using async iterators:

```rust
pub struct LLMStream {
    receiver: mpsc::Receiver<StreamEvent>,
}

pub enum StreamEvent {
    Token(String),
    Done,
    Error(LLMError),
}
```

### Batch Processing

For bulk operations:

```rust
pub struct BatchRequest {
    requests: Vec<LLMRequest>,
    concurrency: usize,
    rate_limit: Option<RateLimit>,
}
```

### Cost Tracking

Per-request and aggregate cost monitoring:

```rust
pub struct LLMCostTracker {
    db: Connection,
    budget_alert: Option<f64>,
}

impl LLMCostTracker {
    fn record_completion(&self, response: &LLMResponse) -> Result<()>;
    fn get_daily_cost(&self) -> Result<f64>;
    fn get_monthly_cost(&self) -> Result<f64>;
}
```

### Retry Policy

Automatic retry with exponential backoff:

```rust
pub struct RetryPolicy {
    max_retries: usize,
    base_delay: Duration,
    max_delay: Duration,
    jitter: bool,
}
```

### Circuit Breaker

Prevents cascade failures:

```rust
pub struct CircuitBreaker {
    failure_threshold: usize,
    recovery_timeout: Duration,
    state: CircuitState,
}
```

## Configuration

### LLMConfig

```rust
pub struct LLMConfig {
    pub default_provider: ProviderType,
    pub fallback_chain: Vec<ProviderType>,
    pub use_cache: bool,
    pub cache_ttl: Duration,
    pub response_validation: Option<ValidationConfig>,

    // Provider-specific
    pub ollama: Option<OllamaConfig>,
    pub openai: Option<OpenAIConfig>,
    pub claude: Option<ClaudeConfig>,
    pub gemini: Option<GeminiConfig>,
}
```

### Provider Config

```rust
pub struct OllamaConfig {
    pub base_url: String,
    pub default_model: String,
    pub timeout: Duration,
}

pub struct OpenAIConfig {
    pub api_key: String,
    pub organization: Option<String>,
    pub default_model: String,
}
```

## Frontend Integration

### AI Settings UI

```typescript
// apps/desktop/src/components/settings/AISettings.tsx
export const AISettings: React.FC = () => {
  const { config, updateConfig, testConnection } = useAIConfig();
  // ...
};
```

### AI Chat Component

```typescript
// apps/desktop/src/components/ai/LocalAI.tsx
export const LocalAI: React.FC = () => {
  const { messages, send, isStreaming } = useAIChat();
  // ...
};
```

### Tauri Commands

```rust
// apps/desktop/src-tauri/src/commands/ai.rs
#[tauri::command]
pub async fn chat_with_ollama_cmd(
    model: String,
    messages: Vec<Message>,
    prompt: Option<String>,
) -> Result<String, String>;
```

## Security

### API Key Storage

- Keys stored in encrypted vault
- Never logged or transmitted externally
- Memory cleared on lock

### Request Sanitization

- Input validation for all user content
- Token limit enforcement
- Prompt injection mitigation

### Privacy

- Local AI processes data on-device
- Cloud requests include minimal context
- No telemetry without consent

## Performance

### Caching

- SQLite-backed response cache
- Configurable TTL
- Cache hit tracking

### Token Counting

- Model-specific tokenizers
- Pre-request limit validation
- Efficient counting algorithms

### Optimization

- Connection pooling
- Request batching
- Stream buffering

---

_See also: [AI Assistant Guide](../02_Features/09_AI_Assistant.md)_
