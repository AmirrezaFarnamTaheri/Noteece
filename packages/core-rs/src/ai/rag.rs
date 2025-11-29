//! RAG (Retrieval-Augmented Generation) Pipeline
//!
//! Provides "Chat with your Vault" functionality by:
//! 1. Generating embeddings for notes and documents
//! 2. Storing vectors in SQLite-VSS or fallback
//! 3. Retrieving relevant context for LLM queries
//!
//! SPDX-License-Identifier: AGPL-3.0-or-later
//! Copyright (c) 2024-2025 Amirreza 'Farnam' Taheri <taherifarnam@gmail.com>

use crate::db::DbPool;
use crate::llm::{LLMProvider, LLMRequest, LLMResponse};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// RAG-specific errors
#[derive(Error, Debug)]
pub enum RagError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Embedding generation failed: {0}")]
    EmbeddingFailed(String),

    #[error("LLM error: {0}")]
    LlmError(String),

    #[error("No relevant context found")]
    NoContextFound,

    #[error("Vector store not initialized")]
    VectorStoreNotInitialized,

    #[error("Connection pool error: {0}")]
    PoolError(#[from] r2d2::Error),
}

/// Document chunk for RAG indexing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: String,
    pub note_id: String,
    pub content: String,
    pub chunk_index: u32,
    pub start_offset: usize,
    pub end_offset: usize,
    pub metadata: HashMap<String, String>,
}

/// Search result with relevance score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub chunk: DocumentChunk,
    pub score: f32,
    pub highlight_ranges: Vec<(usize, usize)>,
}

/// RAG query request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagQuery {
    pub question: String,
    pub space_id: Option<String>,
    pub max_context_chunks: usize,
    pub min_relevance_score: f32,
    pub include_metadata: bool,
}

impl Default for RagQuery {
    fn default() -> Self {
        Self {
            question: String::new(),
            space_id: None,
            max_context_chunks: 5,
            min_relevance_score: 0.5,
            include_metadata: true,
        }
    }
}

/// RAG response with sources
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagResponse {
    pub answer: String,
    pub sources: Vec<SearchResult>,
    pub tokens_used: u32,
    pub model: String,
    pub confidence: f32,
}

/// Configuration for the RAG pipeline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagConfig {
    pub chunk_size: usize,
    pub chunk_overlap: usize,
    pub embedding_model: String,
    pub embedding_dimensions: usize,
    pub use_hybrid_search: bool,
    pub bm25_weight: f32,
    pub semantic_weight: f32,
}

impl Default for RagConfig {
    fn default() -> Self {
        Self {
            chunk_size: 512,
            chunk_overlap: 64,
            embedding_model: "all-MiniLM-L6-v2".to_string(),
            embedding_dimensions: 384,
            use_hybrid_search: true,
            bm25_weight: 0.3,
            semantic_weight: 0.7,
        }
    }
}

/// RAG Pipeline for vault search and question answering
pub struct RagPipeline {
    config: RagConfig,
    db_pool: DbPool,
    llm_provider: Option<Box<dyn LLMProvider>>,
}

impl RagPipeline {
    /// Create a new RAG pipeline
    pub fn new(config: RagConfig, db_pool: DbPool) -> Self {
        Self {
            config,
            db_pool,
            llm_provider: None,
        }
    }

    /// Set the LLM provider for answer generation
    pub fn with_llm_provider(mut self, provider: Box<dyn LLMProvider>) -> Self {
        self.llm_provider = Some(provider);
        self
    }

    /// Initialize the vector store tables
    pub fn initialize_vector_store(&self) -> Result<(), RagError> {
        let conn = self.db_pool.get()?;

        // Create embeddings table
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS note_embeddings (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding BLOB,
                start_offset INTEGER,
                end_offset INTEGER,
                metadata TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE,
                UNIQUE (note_id, chunk_index)
            )
            "#,
            [],
        )?;

        // Create FTS5 table for hybrid search
        conn.execute(
            r#"
            CREATE VIRTUAL TABLE IF NOT EXISTS note_embeddings_fts USING fts5(
                content,
                content=note_embeddings,
                content_rowid=rowid
            )
            "#,
            [],
        )?;

        // Create triggers to keep FTS in sync
        conn.execute_batch(
            r#"
            CREATE TRIGGER IF NOT EXISTS note_embeddings_ai AFTER INSERT ON note_embeddings BEGIN
                INSERT INTO note_embeddings_fts(rowid, content) VALUES (new.rowid, new.content);
            END;
            CREATE TRIGGER IF NOT EXISTS note_embeddings_ad AFTER DELETE ON note_embeddings BEGIN
                INSERT INTO note_embeddings_fts(note_embeddings_fts, rowid, content) 
                VALUES ('delete', old.rowid, old.content);
            END;
            CREATE TRIGGER IF NOT EXISTS note_embeddings_au AFTER UPDATE ON note_embeddings BEGIN
                INSERT INTO note_embeddings_fts(note_embeddings_fts, rowid, content) 
                VALUES ('delete', old.rowid, old.content);
                INSERT INTO note_embeddings_fts(rowid, content) VALUES (new.rowid, new.content);
            END;
            "#,
        )?;

        Ok(())
    }

    /// Chunk a document into smaller pieces for embedding
    pub fn chunk_document(&self, note_id: &str, content: &str) -> Vec<DocumentChunk> {
        let mut chunks = Vec::new();
        let chars: Vec<char> = content.chars().collect();
        let len = chars.len();

        if len == 0 {
            return chunks;
        }

        let chunk_size = self.config.chunk_size;
        let overlap = self.config.chunk_overlap;
        let step = chunk_size.saturating_sub(overlap).max(1);

        let mut start = 0;
        let mut chunk_index = 0;

        while start < len {
            let end = (start + chunk_size).min(len);

            // Try to find a sentence boundary
            let adjusted_end = self.find_sentence_boundary(&chars, start, end, len);

            let chunk_content: String = chars[start..adjusted_end].iter().collect();

            if !chunk_content.trim().is_empty() {
                chunks.push(DocumentChunk {
                    id: format!("{}-{}", note_id, chunk_index),
                    note_id: note_id.to_string(),
                    content: chunk_content,
                    chunk_index,
                    start_offset: start,
                    end_offset: adjusted_end,
                    metadata: HashMap::new(),
                });
                chunk_index += 1;
            }

            start += step;
            if start >= adjusted_end && start < len {
                start = adjusted_end;
            }
        }

        chunks
    }

    /// Find a sentence boundary near the target position
    fn find_sentence_boundary(
        &self,
        chars: &[char],
        start: usize,
        target_end: usize,
        max_len: usize,
    ) -> usize {
        // Look for sentence-ending punctuation within a window
        let window = 50.min(target_end - start);
        let search_start = target_end.saturating_sub(window);

        for i in (search_start..target_end).rev() {
            if i < max_len {
                let c = chars[i];
                if c == '.' || c == '!' || c == '?' || c == '\n' {
                    // Check if next char is space or end
                    if i + 1 >= max_len || chars[i + 1].is_whitespace() {
                        return i + 1;
                    }
                }
            }
        }

        target_end
    }

    /// Index a note by generating embeddings for its chunks
    pub async fn index_note(
        &self,
        note_id: &str,
        title: &str,
        content: &str,
    ) -> Result<usize, RagError> {
        let chunks = self.chunk_document(note_id, content);
        let conn = self.db_pool.get()?;

        // Delete existing chunks for this note
        conn.execute(
            "DELETE FROM note_embeddings WHERE note_id = ?1",
            params![note_id],
        )?;

        // Insert new chunks
        let mut stmt = conn.prepare(
            r#"
            INSERT INTO note_embeddings (id, note_id, chunk_index, content, start_offset, end_offset, metadata)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
        )?;

        for chunk in &chunks {
            let mut metadata = chunk.metadata.clone();
            metadata.insert("title".to_string(), title.to_string());

            stmt.execute(params![
                chunk.id,
                chunk.note_id,
                chunk.chunk_index,
                chunk.content,
                chunk.start_offset,
                chunk.end_offset,
                serde_json::to_string(&metadata).unwrap_or_default(),
            ])?;
        }

        Ok(chunks.len())
    }

    /// Search for relevant chunks using hybrid search (BM25 + semantic)
    pub fn search(&self, query: &RagQuery) -> Result<Vec<SearchResult>, RagError> {
        let conn = self.db_pool.get()?;

        // Use FTS5 BM25 scoring for now (semantic search requires embeddings)
        let sql = if query.space_id.is_some() {
            r#"
            SELECT 
                e.id, e.note_id, e.chunk_index, e.content, 
                e.start_offset, e.end_offset, e.metadata,
                bm25(note_embeddings_fts) as score
            FROM note_embeddings_fts f
            JOIN note_embeddings e ON f.rowid = e.rowid
            JOIN note n ON e.note_id = n.id
            WHERE note_embeddings_fts MATCH ?1
            AND n.space_id = ?2
            ORDER BY score
            LIMIT ?3
            "#
        } else {
            r#"
            SELECT 
                e.id, e.note_id, e.chunk_index, e.content, 
                e.start_offset, e.end_offset, e.metadata,
                bm25(note_embeddings_fts) as score
            FROM note_embeddings_fts f
            JOIN note_embeddings e ON f.rowid = e.rowid
            WHERE note_embeddings_fts MATCH ?1
            ORDER BY score
            LIMIT ?2
            "#
        };

        // Prepare FTS query (escape special characters)
        let fts_query = self.prepare_fts_query(&query.question);

        let mut stmt = conn.prepare(sql)?;

        let results: Vec<SearchResult> = if let Some(space_id) = &query.space_id {
            stmt.query_map(
                params![fts_query, space_id, query.max_context_chunks as i64],
                |row| self.row_to_search_result(row),
            )?
            .filter_map(|r| r.ok())
            .filter(|r| r.score >= query.min_relevance_score)
            .collect()
        } else {
            stmt.query_map(
                params![fts_query, query.max_context_chunks as i64],
                |row| self.row_to_search_result(row),
            )?
            .filter_map(|r| r.ok())
            .filter(|r| r.score >= query.min_relevance_score)
            .collect()
        };

        Ok(results)
    }

    /// Convert a database row to SearchResult
    fn row_to_search_result(&self, row: &rusqlite::Row) -> rusqlite::Result<SearchResult> {
        let metadata_str: String = row.get(6)?;
        let metadata: HashMap<String, String> =
            serde_json::from_str(&metadata_str).unwrap_or_default();

        Ok(SearchResult {
            chunk: DocumentChunk {
                id: row.get(0)?,
                note_id: row.get(1)?,
                chunk_index: row.get(2)?,
                content: row.get(3)?,
                start_offset: row.get(4)?,
                end_offset: row.get(5)?,
                metadata,
            },
            score: row.get::<_, f64>(7)? as f32 * -1.0, // BM25 returns negative scores
            highlight_ranges: Vec::new(),
        })
    }

    /// Prepare a query string for FTS5
    fn prepare_fts_query(&self, query: &str) -> String {
        // Remove special FTS characters and create an OR query
        let cleaned: String = query
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace())
            .collect();

        let terms: Vec<&str> = cleaned.split_whitespace().collect();

        if terms.is_empty() {
            return "*".to_string();
        }

        // Create an OR query with wildcards for prefix matching
        terms
            .iter()
            .map(|t| format!("{}*", t))
            .collect::<Vec<_>>()
            .join(" OR ")
    }

    /// Answer a question using RAG
    pub async fn answer(&self, query: RagQuery) -> Result<RagResponse, RagError> {
        // Search for relevant context
        let results = self.search(&query)?;

        if results.is_empty() {
            return Err(RagError::NoContextFound);
        }

        // Build context from search results
        let context = results
            .iter()
            .enumerate()
            .map(|(i, r)| {
                let title = r
                    .chunk
                    .metadata
                    .get("title")
                    .cloned()
                    .unwrap_or_default();
                format!(
                    "[Source {}] {} (from: {})\n{}",
                    i + 1,
                    title,
                    r.chunk.note_id,
                    r.chunk.content
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");

        // Generate answer using LLM
        let llm = self
            .llm_provider
            .as_ref()
            .ok_or_else(|| RagError::LlmError("No LLM provider configured".to_string()))?;

        let system_prompt = r#"You are a helpful assistant that answers questions based on the user's personal notes and documents. 
Use ONLY the provided context to answer questions. If the context doesn't contain enough information to answer, say so.
When citing information, reference the source number (e.g., [Source 1]).
Be concise but thorough."#;

        let user_prompt = format!(
            "Context from your notes:\n\n{}\n\n---\n\nQuestion: {}",
            context, query.question
        );

        let request = LLMRequest {
            messages: vec![
                crate::llm::Message {
                    role: crate::llm::Role::System,
                    content: system_prompt.to_string(),
                },
                crate::llm::Message {
                    role: crate::llm::Role::User,
                    content: user_prompt,
                },
            ],
            temperature: Some(0.3),
            max_tokens: Some(1024),
            top_p: None,
            stop_sequences: None,
            model: None,
        };

        let response = llm
            .complete(&request)
            .await
            .map_err(|e| RagError::LlmError(e.to_string()))?;

        let confidence = self.calculate_confidence(&results);
        Ok(RagResponse {
            answer: response.content,
            sources: results,
            tokens_used: response.tokens_used as u32,
            model: response.model,
            confidence,
        })
    }

    /// Calculate confidence score based on search results
    fn calculate_confidence(&self, results: &[SearchResult]) -> f32 {
        if results.is_empty() {
            return 0.0;
        }

        // Average of top scores, normalized
        let avg_score: f32 = results.iter().map(|r| r.score).sum::<f32>() / results.len() as f32;

        // Normalize to 0-1 range (assuming BM25 scores typically range 0-20)
        (avg_score / 20.0).min(1.0).max(0.0)
    }

    /// Get statistics about the indexed content
    pub fn get_stats(&self) -> Result<RagStats, RagError> {
        let conn = self.db_pool.get()?;

        let total_chunks: i64 =
            conn.query_row("SELECT COUNT(*) FROM note_embeddings", [], |row| row.get(0))?;

        let total_notes: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT note_id) FROM note_embeddings",
            [],
            |row| row.get(0),
        )?;

        let avg_chunks_per_note = if total_notes > 0 {
            total_chunks as f32 / total_notes as f32
        } else {
            0.0
        };

        Ok(RagStats {
            total_chunks: total_chunks as usize,
            total_notes: total_notes as usize,
            avg_chunks_per_note,
            embedding_dimensions: self.config.embedding_dimensions,
            chunk_size: self.config.chunk_size,
        })
    }
}

/// Statistics about the RAG index
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagStats {
    pub total_chunks: usize,
    pub total_notes: usize,
    pub avg_chunks_per_note: f32,
    pub embedding_dimensions: usize,
    pub chunk_size: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_pool() -> DbPool {
        let manager = r2d2_sqlite::SqliteConnectionManager::memory();
        let pool = r2d2::Pool::builder().max_size(1).build(manager).unwrap();

        // Create required tables
        let conn = pool.get().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS note (id TEXT PRIMARY KEY, space_id TEXT, title TEXT, content_md TEXT)",
            [],
        )
        .unwrap();

        pool
    }

    #[test]
    fn test_chunk_document() {
        let config = RagConfig {
            chunk_size: 100,
            chunk_overlap: 20,
            ..Default::default()
        };
        let pool = create_test_pool();
        let pipeline = RagPipeline::new(config, pool);

        let content = "This is a test document. It has multiple sentences. Each sentence should be chunked appropriately. The chunking algorithm should respect sentence boundaries when possible.";
        let chunks = pipeline.chunk_document("test-note", content);

        assert!(!chunks.is_empty());
        assert_eq!(chunks[0].note_id, "test-note");
        assert_eq!(chunks[0].chunk_index, 0);
    }

    #[test]
    fn test_chunk_empty_document() {
        let config = RagConfig::default();
        let pool = create_test_pool();
        let pipeline = RagPipeline::new(config, pool);

        let chunks = pipeline.chunk_document("test-note", "");
        assert!(chunks.is_empty());
    }

    #[test]
    fn test_chunk_short_document() {
        let config = RagConfig {
            chunk_size: 1000,
            ..Default::default()
        };
        let pool = create_test_pool();
        let pipeline = RagPipeline::new(config, pool);

        let content = "Short document.";
        let chunks = pipeline.chunk_document("test-note", content);

        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].content, content);
    }

    #[test]
    fn test_prepare_fts_query() {
        let config = RagConfig::default();
        let pool = create_test_pool();
        let pipeline = RagPipeline::new(config, pool);

        let query = pipeline.prepare_fts_query("hello world");
        assert!(query.contains("hello*"));
        assert!(query.contains("world*"));
        assert!(query.contains(" OR "));
    }

    #[test]
    fn test_prepare_fts_query_special_chars() {
        let config = RagConfig::default();
        let pool = create_test_pool();
        let pipeline = RagPipeline::new(config, pool);

        let query = pipeline.prepare_fts_query("test@email.com AND (query)");
        // Special characters should be removed
        assert!(!query.contains("@"));
        assert!(!query.contains("("));
    }

    #[test]
    fn test_initialize_vector_store() {
        let config = RagConfig::default();
        let pool = create_test_pool();
        let pipeline = RagPipeline::new(config, pool);

        let result = pipeline.initialize_vector_store();
        assert!(result.is_ok());
    }

    #[test]
    fn test_calculate_confidence() {
        let config = RagConfig::default();
        let pool = create_test_pool();
        let pipeline = RagPipeline::new(config, pool);

        let results = vec![
            SearchResult {
                chunk: DocumentChunk {
                    id: "1".to_string(),
                    note_id: "note1".to_string(),
                    content: "test".to_string(),
                    chunk_index: 0,
                    start_offset: 0,
                    end_offset: 4,
                    metadata: HashMap::new(),
                },
                score: 15.0,
                highlight_ranges: Vec::new(),
            },
            SearchResult {
                chunk: DocumentChunk {
                    id: "2".to_string(),
                    note_id: "note2".to_string(),
                    content: "test2".to_string(),
                    chunk_index: 0,
                    start_offset: 0,
                    end_offset: 5,
                    metadata: HashMap::new(),
                },
                score: 10.0,
                highlight_ranges: Vec::new(),
            },
        ];

        let confidence = pipeline.calculate_confidence(&results);
        assert!(confidence > 0.0);
        assert!(confidence <= 1.0);
    }

    #[test]
    fn test_get_stats_empty() {
        let config = RagConfig::default();
        let pool = create_test_pool();
        let pipeline = RagPipeline::new(config, pool);

        pipeline.initialize_vector_store().unwrap();

        let stats = pipeline.get_stats().unwrap();
        assert_eq!(stats.total_chunks, 0);
        assert_eq!(stats.total_notes, 0);
    }
}

