use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use ulid::Ulid;
use lazy_static::lazy_static;

lazy_static! {
    // Heuristic: Matches @handle (Twitter-style) or u/user (Reddit-style)
    static ref HANDLE_REGEX: Regex = Regex::new(r"(@[\w_]+|u/[\w_]+)").unwrap();

    // Heuristic: Matches relative timestamps like 2h, 12m, 3d, 1w
    static ref TIME_REGEX: Regex = Regex::new(r"(\d+[mhdw])").unwrap();

    // Heuristic: Matches metrics like "1.2K Likes" or "500 Comments"
    static ref METRICS_REGEX: Regex = Regex::new(r"(\d+(?:\.\d+)?[KMB]?)\s+(Comments|Retweets|Likes|Views|Upvotes)").unwrap();
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapturedPost {
    pub id: String,
    pub platform: String,
    pub author_handle: Option<String>,
    pub content_text: String,
    pub captured_at: i64,
    pub confidence_score: f32,
    pub raw_context_blob: Option<String>, // Encrypted blob of surrounding text
}

pub struct StreamProcessor {
    buffer: VecDeque<String>,
    buffer_size: usize,
    dedup_filter: bloomfilter::Bloom<String>, // Requires adding bloomfilter crate
}

impl StreamProcessor {
    pub fn new() -> Self {
        StreamProcessor {
            buffer: VecDeque::with_capacity(20),
            buffer_size: 20,
            dedup_filter: bloomfilter::Bloom::new_for_fp_rate(10000, 0.01),
        }
    }

    pub fn ingest(&mut self, text: &str) {
        for line in text.lines() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                if self.buffer.len() >= self.buffer_size {
                    self.buffer.pop_front();
                }
                self.buffer.push_back(trimmed.to_string());
            }
        }
    }

    pub fn analyze_buffer(&self) -> Option<CapturedPost> {
        // Iterate through buffer window of 3 lines
        // This is a simplified sliding window implementation
        let snapshot: Vec<&String> = self.buffer.iter().collect();

        for i in 0..snapshot.len().saturating_sub(2) {
            let line1 = snapshot[i];
            let line2 = snapshot[i+1];
            let line3 = snapshot[i+2];

            // Heuristic Check
            let has_handle = HANDLE_REGEX.is_match(line1);
            let has_time = TIME_REGEX.is_match(line1) || TIME_REGEX.is_match(line2);
            let is_body_text = line3.len() > 20; // Basic text check

            if has_handle && has_time && is_body_text {
                // Construct Post Candidate
                let handle = HANDLE_REGEX.find(line1).map(|m| m.as_str().to_string());

                return Some(CapturedPost {
                    id: Ulid::new().to_string(),
                    platform: "detected".to_string(), // Need to pass context or infer from handle style
                    author_handle: handle,
                    content_text: line3.to_string(),
                    captured_at: chrono::Utc::now().timestamp(),
                    confidence_score: 0.85,
                    raw_context_blob: None, // In real impl, encrypt the buffer
                });
            }
        }
        None
    }
}
