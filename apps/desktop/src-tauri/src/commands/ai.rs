use crate::state::DbConnection;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AIConfig {
    pub local_enabled: bool,
    pub ollama_url: String,
    pub default_local_model: String,
    pub cloud_enabled: bool,
    pub provider: String,
    pub api_key: String,
    pub default_cloud_model: String,
    pub max_tokens: u32,
    pub temperature: f64,
    pub cache_enabled: bool,
    pub cost_tracking: bool,
}

/// Check if Ollama is running and accessible
#[tauri::command]
pub async fn check_ollama_connection_cmd(url: Option<String>) -> Result<bool, String> {
    let base_url = url.unwrap_or_else(|| "http://localhost:11434".to_string());
    
    match reqwest::Client::new()
        .get(format!("{}/api/version", base_url))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => Ok(response.status().is_success()),
        Err(e) => {
            log::warn!("[AI] Ollama connection check failed: {}", e);
            Ok(false)
        }
    }
}

/// List available Ollama models
#[tauri::command]
pub async fn list_ollama_models_cmd() -> Result<Vec<String>, String> {
    let base_url = "http://localhost:11434";
    
    let response = reqwest::Client::new()
        .get(format!("{}/api/tags", base_url))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err("Ollama returned error status".to_string());
    }

    #[derive(Deserialize)]
    struct TagsResponse {
        models: Vec<ModelInfo>,
    }

    #[derive(Deserialize)]
    struct ModelInfo {
        name: String,
    }

    let tags: TagsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    Ok(tags.models.into_iter().map(|m| m.name).collect())
}

/// Chat with Ollama
#[tauri::command]
pub async fn chat_with_ollama_cmd(
    model: String,
    messages: Vec<ChatMessage>,
    prompt: String,
) -> Result<String, String> {
    let base_url = "http://localhost:11434";

    #[derive(Serialize)]
    struct OllamaRequest {
        model: String,
        messages: Vec<OllamaMessage>,
        stream: bool,
    }

    #[derive(Serialize)]
    struct OllamaMessage {
        role: String,
        content: String,
    }

    // Build message history
    let mut ollama_messages: Vec<OllamaMessage> = messages
        .into_iter()
        .map(|m| OllamaMessage {
            role: m.role,
            content: m.content,
        })
        .collect();

    // Add the new user message
    ollama_messages.push(OllamaMessage {
        role: "user".to_string(),
        content: prompt,
    });

    let request = OllamaRequest {
        model,
        messages: ollama_messages,
        stream: false,
    };

    let response = reqwest::Client::new()
        .post(format!("{}/api/chat", base_url))
        .json(&request)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned error: {}", response.status()));
    }

    #[derive(Deserialize)]
    struct OllamaResponse {
        message: ResponseMessage,
    }

    #[derive(Deserialize)]
    struct ResponseMessage {
        content: String,
    }

    let ollama_response: OllamaResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(ollama_response.message.content)
}

/// Test cloud provider connection
#[tauri::command]
pub async fn test_cloud_provider_cmd(provider: String, api_key: String) -> Result<bool, String> {
    match provider.as_str() {
        "openai" => {
            let response = reqwest::Client::new()
                .get("https://api.openai.com/v1/models")
                .header("Authorization", format!("Bearer {}", api_key))
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            Ok(response.status().is_success())
        }
        "claude" => {
            let response = reqwest::Client::new()
                .get("https://api.anthropic.com/v1/models")
                .header("x-api-key", &api_key)
                .header("anthropic-version", "2023-06-01")
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            Ok(response.status().is_success())
        }
        "gemini" => {
            let response = reqwest::Client::new()
                .get(format!(
                    "https://generativelanguage.googleapis.com/v1/models?key={}",
                    api_key
                ))
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            Ok(response.status().is_success())
        }
        _ => Err(format!("Unknown provider: {}", provider)),
    }
}

/// Get AI configuration
#[tauri::command]
pub fn get_ai_config_cmd(db: State<DbConnection>) -> Result<AIConfig, String> {
    crate::with_db!(db, conn, {
        let mut stmt = conn
            .prepare(
                "SELECT local_enabled, ollama_url, default_local_model, cloud_enabled, 
                        provider, api_key, default_cloud_model, max_tokens, temperature,
                        cache_enabled, cost_tracking 
                 FROM ai_config WHERE id = 'default'",
            )
            .map_err(|e| e.to_string())?;

        let config = stmt.query_row([], |row| {
            Ok(AIConfig {
                local_enabled: row.get(0)?,
                ollama_url: row.get(1)?,
                default_local_model: row.get(2)?,
                cloud_enabled: row.get(3)?,
                provider: row.get(4)?,
                api_key: row.get(5)?,
                default_cloud_model: row.get(6)?,
                max_tokens: row.get(7)?,
                temperature: row.get(8)?,
                cache_enabled: row.get(9)?,
                cost_tracking: row.get(10)?,
            })
        });

        match config {
            Ok(c) => Ok(c),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(AIConfig {
                local_enabled: true,
                ollama_url: "http://localhost:11434".to_string(),
                default_local_model: "llama3.2".to_string(),
                cloud_enabled: false,
                provider: "openai".to_string(),
                api_key: String::new(),
                default_cloud_model: "gpt-4o-mini".to_string(),
                max_tokens: 2048,
                temperature: 0.7,
                cache_enabled: true,
                cost_tracking: true,
            }),
            Err(e) => Err(e.to_string()),
        }
    })
}

/// Save AI configuration
#[tauri::command]
pub fn save_ai_config_cmd(db: State<DbConnection>, config: AIConfig) -> Result<(), String> {
    crate::with_db!(db, conn, {
        conn.execute(
            "INSERT OR REPLACE INTO ai_config 
             (id, local_enabled, ollama_url, default_local_model, cloud_enabled,
              provider, api_key, default_cloud_model, max_tokens, temperature,
              cache_enabled, cost_tracking)
             VALUES ('default', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                config.local_enabled,
                config.ollama_url,
                config.default_local_model,
                config.cloud_enabled,
                config.provider,
                config.api_key,
                config.default_cloud_model,
                config.max_tokens,
                config.temperature,
                config.cache_enabled,
                config.cost_tracking,
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    })
}

/// Ingest social capture data
#[tauri::command]
pub fn ingest_social_capture_cmd(
    db: State<DbConnection>,
    posts: Vec<serde_json::Value>,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        for post in posts {
            let id = ulid::Ulid::new().to_string();
            let platform = post.get("platform").and_then(|v| v.as_str()).unwrap_or("unknown");
            let author = post.get("author").and_then(|v| v.as_str()).unwrap_or("");
            let text = post.get("text").and_then(|v| v.as_str()).unwrap_or("");
            let timestamp = post.get("timestamp").and_then(|v| v.as_i64()).unwrap_or(0);

            conn.execute(
                "INSERT INTO social_post (id, platform, author_handle, content_text, captured_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    id,
                    platform,
                    author,
                    text,
                    timestamp / 1000, // Convert from ms to seconds
                    chrono::Utc::now().timestamp(),
                ],
            )
            .map_err(|e| e.to_string())?;
        }

        log::info!("[AI] Ingested {} social posts", posts.len());
        Ok(())
    })
}

