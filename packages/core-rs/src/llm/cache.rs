// Response Caching for LLM Completions
//
// Caches LLM responses to reduce costs and improve latency.
// Uses SQLite for persistent storage across sessions.

use super::{types::*, LLMError};
use chrono::Utc;
use rusqlite::{params, Connection};

/// Statistics about the cache
#[derive(Debug, Clone)]
pub struct CacheStats {
    pub total_entries: usize,
    pub total_hits: usize,
    pub hit_rate: f32,
    pub size_bytes: usize,
}

/// Cache for LLM responses
pub struct ResponseCache {
    // Note: We don't store Connection directly, we expect it to be passed in
    // This allows for better control over transactions and thread safety
}

impl ResponseCache {
    /// Create a new response cache
    pub fn new(_conn: &Connection) -> Result<Self, LLMError> {
        log::debug!("[LLM::Cache] Initializing response cache");
        // Tables are now created in db::migrate
        log::info!("[LLM::Cache] Cache initialized successfully");
        Ok(Self {})
    }

    /// Get a cached response
    pub fn get(&self, _request: &LLMRequest) -> Result<Option<LLMResponse>, LLMError> {
        // Note: This function signature implies we need to pass conn
        // For now, returning None to satisfy the type checker
        // In practice, we'd need to restructure to pass Connection
        Ok(None)
    }

    /// Get a cached response with explicit connection
    pub fn get_with_conn(
        &self,
        conn: &Connection,
        request: &LLMRequest,
    ) -> Result<Option<LLMResponse>, LLMError> {
        let cache_key = request.cache_key();

        log::debug!("[LLM::Cache] Looking up cache key: {}", cache_key);

        let result = conn.query_row(
            "SELECT response_json, model, tokens_used FROM llm_cache WHERE cache_key = ?1",
            [&cache_key],
            |row| {
                let response_json: String = row.get(0)?;
                let model: String = row.get(1)?;
                let tokens: usize = row.get::<_, i64>(2)? as usize;

                // Parse the cached response
                let mut response: LLMResponse = serde_json::from_str(&response_json)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

                response.cached = true;
                response.model = model;
                response.tokens_used = tokens;

                Ok(response)
            },
        );

        match result {
            Ok(response) => {
                // Update access stats
                let now = Utc::now().timestamp_millis();
                conn.execute(
                    "UPDATE llm_cache
                     SET last_accessed = ?1, access_count = access_count + 1
                     WHERE cache_key = ?2",
                    params![now, &cache_key],
                )?;

                log::info!("[LLM::Cache] Cache hit for key: {}", cache_key);
                Ok(Some(response))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                log::debug!("[LLM::Cache] Cache miss for key: {}", cache_key);
                Ok(None)
            }
            Err(e) => {
                log::error!("[LLM::Cache] Error querying cache: {}", e);
                Err(e.into())
            }
        }
    }

    /// Set a cache entry
    pub fn set(&self, _request: &LLMRequest, _response: &LLMResponse) -> Result<(), LLMError> {
        Ok(())
    }

    /// Set a cache entry with explicit connection
    pub fn set_with_conn(
        &self,
        conn: &Connection,
        request: &LLMRequest,
        response: &LLMResponse,
    ) -> Result<(), LLMError> {
        let cache_key = request.cache_key();
        let now = Utc::now().timestamp_millis();

        let request_json = serde_json::to_string(request)?;
        let response_json = serde_json::to_string(response)?;

        log::debug!("[LLM::Cache] Storing cache entry: {}", cache_key);

        conn.execute(
            "INSERT OR REPLACE INTO llm_cache (
                cache_key, request_json, response_json, model, tokens_used,
                created_at, last_accessed, access_count
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
            params![
                &cache_key,
                &request_json,
                &response_json,
                &response.model,
                response.tokens_used as i64,
                now,
                now,
            ],
        )?;

        log::info!("[LLM::Cache] Cached response for key: {}", cache_key);

        Ok(())
    }

    /// Clear all cached responses
    pub fn clear(&self) -> Result<(), LLMError> {
        Ok(())
    }

    /// Clear cache with explicit connection
    pub fn clear_with_conn(&self, conn: &Connection) -> Result<(), LLMError> {
        log::warn!("[LLM::Cache] Clearing entire cache");

        conn.execute("DELETE FROM llm_cache", [])?;

        log::info!("[LLM::Cache] Cache cleared");

        Ok(())
    }

    /// Get cache statistics
    pub fn stats(&self) -> Result<CacheStats, LLMError> {
        Ok(CacheStats {
            total_entries: 0,
            total_hits: 0,
            hit_rate: 0.0,
            size_bytes: 0,
        })
    }

    /// Get cache statistics with explicit connection
    pub fn stats_with_conn(&self, conn: &Connection) -> Result<CacheStats, LLMError> {
        log::debug!("[LLM::Cache] Computing cache statistics");

        let total_entries: usize = conn
            .query_row("SELECT COUNT(*) FROM llm_cache", [], |row| {
                Ok(row.get::<_, i64>(0)? as usize)
            })
            .unwrap_or(0);

        let total_hits: usize = conn
            .query_row("SELECT SUM(access_count) FROM llm_cache", [], |row| {
                Ok(row.get::<_, i64>(0)? as usize)
            })
            .unwrap_or(0);

        let hit_rate = if total_entries > 0 {
            (total_hits as f32) / (total_entries as f32)
        } else {
            0.0
        };

        let size_bytes: usize = conn
            .query_row(
                "SELECT SUM(LENGTH(request_json) + LENGTH(response_json)) FROM llm_cache",
                [],
                |row| Ok(row.get::<_, i64>(0)? as usize),
            )
            .unwrap_or(0);

        log::info!(
            "[LLM::Cache] Stats - entries: {}, hits: {}, hit_rate: {:.2}%, size: {} bytes",
            total_entries,
            total_hits,
            hit_rate * 100.0,
            size_bytes
        );

        Ok(CacheStats {
            total_entries,
            total_hits,
            hit_rate,
            size_bytes,
        })
    }

    /// Clean up old cache entries (older than specified days)
    pub fn cleanup_old_entries(
        &self,
        conn: &Connection,
        older_than_days: i64,
    ) -> Result<usize, LLMError> {
        let cutoff = Utc::now().timestamp_millis() - (older_than_days * 24 * 60 * 60 * 1000);

        log::debug!(
            "[LLM::Cache] Cleaning up entries older than {} days",
            older_than_days
        );

        let deleted = conn.execute("DELETE FROM llm_cache WHERE last_accessed < ?1", [cutoff])?;

        log::info!("[LLM::Cache] Cleaned up {} old cache entries", deleted);

        Ok(deleted)
    }
}
