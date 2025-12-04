use super::types::*;

/// Batch processor for efficient syncing
pub struct SyncBatchProcessor {
    /// Maximum items per batch
    pub batch_size: usize,

    /// Maximum bytes per batch
    pub max_batch_bytes: u64,
}

impl SyncBatchProcessor {
    /// Create new batch processor
    pub fn new(batch_size: usize, max_batch_bytes: u64) -> Self {
        log::debug!(
            "[mobile_sync] Created batch processor (size: {}, max_bytes: {})",
            batch_size,
            max_batch_bytes
        );
        SyncBatchProcessor {
            batch_size,
            max_batch_bytes,
        }
    }

    /// Split deltas into batches for transmission
    pub fn create_batches(&self, deltas: Vec<SyncDelta>) -> Vec<Vec<SyncDelta>> {
        log::info!("[mobile_sync] Creating batches for {} deltas", deltas.len());
        let mut batches = Vec::new();
        let mut current_batch = Vec::new();
        let mut current_size = 0u64;

        for delta in deltas {
            let estimated_size = serde_json::to_vec(&delta)
                .map(|v| v.len() as u64)
                .unwrap_or(1024);

            if (current_batch.len() >= self.batch_size
                || (current_size + estimated_size) > self.max_batch_bytes)
                && !current_batch.is_empty()
            {
                batches.push(current_batch);
                current_batch = Vec::new();
                current_size = 0;
            }

            current_batch.push(delta);
            current_size += estimated_size;
        }

        if !current_batch.is_empty() {
            batches.push(current_batch);
        }

        batches
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use chrono::Utc;

    #[test]
    fn test_batch_processor() {
        let processor = SyncBatchProcessor::new(2, 10000);

        let deltas = vec![
            SyncDelta {
                operation: DeltaOperation::Create,
                entity_type: "post".to_string(),
                entity_id: "1".to_string(),
                encrypted_data: Some(vec![0u8; 100]),
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 1,
                vector_clock: HashMap::new(),
            },
            SyncDelta {
                operation: DeltaOperation::Update,
                entity_type: "post".to_string(),
                entity_id: "2".to_string(),
                encrypted_data: Some(vec![0u8; 100]),
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 2,
                vector_clock: HashMap::new(),
            },
            SyncDelta {
                operation: DeltaOperation::Delete,
                entity_type: "post".to_string(),
                entity_id: "3".to_string(),
                encrypted_data: None,
                timestamp: Utc::now(),
                data_hash: None,
                sequence: 3,
                vector_clock: HashMap::new(),
            },
        ];

        let batches = processor.create_batches(deltas);
        assert_eq!(batches.len(), 2); // 2 items per batch
    }
}
