# AI-Powered Features: RAG & Chat with Vault

Noteece integrates advanced AI capabilities to help you interact with and understand your personal knowledge base.

## Chat with Your Vault

The RAG (Retrieval-Augmented Generation) pipeline enables natural language queries against your notes and documents.

### How It Works

1. **Indexing**: Your notes are chunked into smaller segments and indexed for fast retrieval.
2. **Query Processing**: When you ask a question, the system converts it to a search query.
3. **Retrieval**: The most relevant chunks are retrieved using hybrid search (BM25 + semantic).
4. **Generation**: An LLM synthesizes an answer using the retrieved context.
5. **Citation**: Sources are provided for transparency and verification.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Question                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Query Processing & Embedding                    │
│         (FTS5 query + optional vector embedding)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Hybrid Search                              │
│                                                              │
│  ┌─────────────────┐      ┌─────────────────────────────┐  │
│  │  BM25 (FTS5)    │      │  Semantic (Vector Store)    │  │
│  │  Keyword match  │  +   │  Meaning similarity         │  │
│  │  Weight: 0.3    │      │  Weight: 0.7                │  │
│  └─────────────────┘      └─────────────────────────────┘  │
│                                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Context Assembly                            │
│           (Top K chunks with metadata)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   LLM Generation                             │
│      (Answer synthesis with source citations)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Response                                  │
│         Answer + Sources + Confidence Score                  │
└─────────────────────────────────────────────────────────────┘
```

### Configuration

Configure the RAG pipeline in Settings → AI:

```typescript
interface RagConfig {
  // Chunking
  chunk_size: number; // Characters per chunk (default: 512)
  chunk_overlap: number; // Overlap between chunks (default: 64)

  // Embedding
  embedding_model: string; // Model for embeddings
  embedding_dimensions: number; // Vector dimensions

  // Search
  use_hybrid_search: boolean; // Enable hybrid search
  bm25_weight: number; // BM25 score weight (0-1)
  semantic_weight: number; // Semantic score weight (0-1)
}
```

### Indexing Notes

Notes are automatically indexed when created or updated. Manual reindexing can be triggered:

```typescript
// Index a single note
await invoke("index_note_cmd", {
  noteId: "note-123",
  title: "Meeting Notes",
  content: "...",
});

// Reindex all notes in a space
await invoke("reindex_space_cmd", { spaceId: "work" });

// Get indexing statistics
const stats = await invoke("get_rag_stats_cmd");
// { total_notes: 150, total_chunks: 890, avg_chunks_per_note: 5.9 }
```

### Querying

Send queries through the chat interface or programmatically:

```typescript
const response = await invoke("rag_query_cmd", {
  query: {
    question: "What were the key decisions from last week's meeting?",
    space_id: "work", // Optional: limit to specific space
    max_context_chunks: 5, // Maximum chunks to retrieve
    min_relevance_score: 0.3, // Minimum score threshold
    include_metadata: true, // Include note metadata
  },
});

// Response structure
interface RagResponse {
  answer: string; // Generated answer
  sources: SearchResult[]; // Retrieved chunks with scores
  tokens_used: number; // LLM tokens consumed
  model: string; // LLM model used
  confidence: number; // Answer confidence (0-1)
}
```

### Best Practices

1. **Be Specific**: More specific questions yield better results.
   - ❌ "Tell me about projects"
   - ✅ "What are the deadlines for the Q1 marketing project?"

2. **Use Keywords**: Include relevant keywords that might appear in your notes.

3. **Scope Appropriately**: Use space filtering to narrow search scope.

4. **Check Sources**: Always verify the answer against the provided sources.

5. **Index Regularly**: Ensure new notes are indexed for retrieval.

## Local AI Integration

Noteece supports local LLM inference for privacy-conscious users.

### Supported Providers

| Provider | Local | Cloud | Streaming | Notes                 |
| -------- | ----- | ----- | --------- | --------------------- |
| Ollama   | ✅    | ❌    | ✅        | Recommended for local |
| OpenAI   | ❌    | ✅    | ✅        | GPT-4, GPT-3.5        |
| Claude   | ❌    | ✅    | ✅        | Anthropic Claude      |
| Gemini   | ❌    | ✅    | ✅        | Google Gemini         |

### Setting Up Ollama

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama2` or `ollama pull mistral`
3. Configure in Noteece Settings → AI → Provider → Ollama
4. Set the model name and endpoint (default: http://localhost:11434)

### Privacy Considerations

- **Local Processing**: With Ollama, all inference happens on your device.
- **No Data Transmission**: Your notes never leave your machine.
- **Encrypted Storage**: Even indexed chunks are stored in your encrypted vault.

## Semantic Search

Beyond Q&A, the RAG infrastructure powers semantic search:

```typescript
const results = await invoke("semantic_search_cmd", {
  query: "productivity techniques for remote work",
  limit: 10,
  space_id: null, // Search all spaces
});

// Returns notes ranked by semantic similarity
```

### Use Cases

- **Related Notes**: Find notes similar to the current one
- **Topic Clustering**: Discover hidden connections
- **Knowledge Gaps**: Identify areas lacking documentation

## Cost Tracking

For cloud LLM providers, Noteece tracks usage:

```typescript
const usage = await invoke("get_ai_usage_cmd", {
  period: "month",
});

// {
//   total_requests: 145,
//   total_tokens: 125000,
//   estimated_cost_usd: 2.50,
//   by_model: { 'gpt-4': 50000, 'gpt-3.5-turbo': 75000 }
// }
```

## Troubleshooting

### "No relevant context found"

- Ensure notes are indexed (`get_rag_stats_cmd`)
- Lower the `min_relevance_score` threshold
- Try rephrasing the question with different keywords

### Slow Indexing

- Reduce `chunk_size` for faster processing
- Index spaces incrementally
- Check available disk space

### Poor Answer Quality

- Increase `max_context_chunks` for more context
- Try a more capable LLM model
- Verify source notes contain relevant information

---

_Version 1.1.0_
_SPDX-License-Identifier: AGPL-3.0-or-later_
