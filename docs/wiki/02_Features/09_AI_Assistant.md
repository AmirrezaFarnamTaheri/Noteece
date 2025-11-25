# AI Assistant

Noteece features a powerful AI assistant that integrates both local and cloud-based language models.

## Overview

The AI Assistant provides:

- **Local AI** (Ollama) - On-device inference, complete privacy
- **Cloud AI** - OpenAI, Claude, Gemini for advanced capabilities
- **Hybrid Mode** - Fallback chain with automatic provider switching

## Local AI (Ollama)

### Setup

1. Install [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`
3. Start Ollama: `ollama serve`
4. Enable in Settings → AI → Local AI

### Supported Models

| Model     | Size | Use Case          |
| --------- | ---- | ----------------- |
| llama3.2  | 3B   | General assistant |
| mistral   | 7B   | Complex reasoning |
| codellama | 7B   | Code assistance   |
| phi-3     | 3B   | Lightweight tasks |

### Features

- **Streaming responses** - Token-by-token output
- **Chat history** - Context-aware conversations
- **System prompts** - Customize behavior
- **Local processing** - No data leaves device

## Cloud AI

### Providers

| Provider | Models                      | Features      |
| -------- | --------------------------- | ------------- |
| OpenAI   | GPT-4, GPT-4 Turbo, GPT-3.5 | Best accuracy |
| Claude   | Opus, Sonnet, Haiku         | Long context  |
| Gemini   | 1.5 Pro, 1.5 Flash          | Multimodal    |

### Configuration

1. Go to Settings → AI → Cloud AI
2. Select provider
3. Enter API key
4. Choose default model
5. Test connection

### Cost Tracking

Monitor API costs in real-time:

- Per-request cost display
- Daily/monthly budgets
- Cost alerts
- Usage reports

## Features

### AI Chat

Open AI Chat with `Ctrl/Cmd + J`:

- Ask questions about your notes
- Get writing assistance
- Brainstorm ideas
- Summarize content
- Generate outlines

### AI Insights

The correlation engine analyzes patterns across your data:

- Health × Productivity correlations
- Time tracking insights
- Task completion patterns
- Project dependencies

### Note Enhancement

Right-click any note for AI actions:

- **Summarize** - Generate summary
- **Expand** - Add more detail
- **Improve** - Enhance writing
- **Translate** - Multi-language
- **Extract Tasks** - Find action items

### Smart Search

AI-enhanced search capabilities:

- Semantic search (meaning-based)
- Question answering
- Related notes suggestions
- Tag recommendations

## Privacy

### Local AI

With Ollama, all processing happens locally:

- No network requests
- No data collection
- Works offline
- Complete control

### Cloud AI

When using cloud providers:

- Only selected content is sent
- Requests are not stored by Noteece
- Use provider-specific data policies
- Consider sensitive content

## Best Practices

1. **Start local** - Use Ollama for routine tasks
2. **Reserve cloud** - Use cloud for complex queries
3. **Set budgets** - Monitor cloud API costs
4. **Review prompts** - Check what's being sent
5. **Cache results** - Enable response caching

## Troubleshooting

### Ollama Not Connecting

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

### Slow Responses

- Try smaller models (llama3.2, phi-3)
- Enable response caching
- Check system resources

### API Key Issues

- Verify key is valid
- Check provider status page
- Confirm billing is active

---

_See also: [LLM Architecture](../01_Architecture/07_LLM_Integration.md)_
