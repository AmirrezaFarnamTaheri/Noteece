//! Request Prioritization for LLM Queues
//!
//! Enables intelligent request scheduling with:
//! - Priority levels and queues
//! - Fair scheduling algorithms
//! - Request aging and promotion
//! - Deadline-aware scheduling

use std::cmp::Ordering;
use std::collections::BinaryHeap;
use std::sync::atomic::{AtomicU64, Ordering as AtomicOrdering};
use std::sync::Arc;
use tokio::sync::Mutex;

use super::types::LLMRequest;

/// Priority level for requests
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub enum Priority {
    /// Critical - immediate processing
    Critical = 0,
    /// High - process before normal
    High = 1,
    /// Normal - default priority
    #[default]
    Normal = 2,
    /// Low - process when resources available
    Low = 3,
    /// Background - process only when idle
    Background = 4,
}

impl Priority {
    /// Get numeric value (lower = higher priority)
    pub fn value(&self) -> u32 {
        *self as u32
    }

    /// Create from numeric value
    pub fn from_value(value: u32) -> Self {
        match value {
            0 => Priority::Critical,
            1 => Priority::High,
            2 => Priority::Normal,
            3 => Priority::Low,
            _ => Priority::Background,
        }
    }
}

impl PartialOrd for Priority {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Priority {
    fn cmp(&self, other: &Self) -> Ordering {
        // Lower value = higher priority
        other.value().cmp(&self.value())
    }
}

/// A prioritized request entry
#[derive(Debug, Clone)]
pub struct PrioritizedRequest {
    /// The underlying request
    pub request: LLMRequest,
    /// Priority level
    pub priority: Priority,
    /// Unique sequence number (for FIFO within priority)
    pub sequence: u64,
    /// Timestamp when request was queued (ms)
    pub queued_at: u64,
    /// Optional deadline (ms since epoch)
    pub deadline: Option<u64>,
    /// Request ID for tracking
    pub id: String,
    /// Number of times priority was promoted
    pub promotions: u32,
}

impl PrioritizedRequest {
    pub fn new(request: LLMRequest, priority: Priority, sequence: u64) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_else(|_| std::time::Duration::from_millis(0))
            .as_millis() as u64;

        Self {
            request,
            priority,
            sequence,
            queued_at: now,
            deadline: None,
            id: ulid::Ulid::new().to_string(),
            promotions: 0,
        }
    }

    /// Add a deadline
    pub fn with_deadline(mut self, deadline_ms: u64) -> Self {
        self.deadline = Some(deadline_ms);
        self
    }

    /// Get age in milliseconds
    pub fn age_ms(&self) -> u64 {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_else(|_| std::time::Duration::from_millis(0))
            .as_millis() as u64;
        now.saturating_sub(self.queued_at)
    }

    /// Check if deadline has passed
    pub fn is_expired(&self) -> bool {
        if let Some(deadline) = self.deadline {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_else(|_| std::time::Duration::from_millis(0))
                .as_millis() as u64;
            now > deadline
        } else {
            false
        }
    }

    /// Time until deadline (if set)
    pub fn time_to_deadline(&self) -> Option<i64> {
        self.deadline.map(|d| {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_else(|_| std::time::Duration::from_millis(0))
                .as_millis() as u64;
            d as i64 - now as i64
        })
    }
}

impl PartialEq for PrioritizedRequest {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for PrioritizedRequest {}

impl PartialOrd for PrioritizedRequest {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for PrioritizedRequest {
    fn cmp(&self, other: &Self) -> Ordering {
        // First compare by deadline (closer deadline = higher priority)
        match (self.deadline, other.deadline) {
            (Some(d1), Some(d2)) => {
                if d1 != d2 {
                    return d2.cmp(&d1); // Earlier deadline first
                }
            }
            (Some(_), None) => return Ordering::Greater,
            (None, Some(_)) => return Ordering::Less,
            (None, None) => {}
        }

        // Then by priority level
        match self.priority.cmp(&other.priority) {
            Ordering::Equal => {}
            ord => return ord,
        }

        // Finally by sequence (FIFO within same priority)
        other.sequence.cmp(&self.sequence)
    }
}

/// Configuration for the priority queue
#[derive(Debug, Clone)]
pub struct PriorityQueueConfig {
    /// Maximum queue size
    pub max_size: usize,
    /// Age (ms) after which to promote priority
    pub promotion_age_ms: u64,
    /// Whether to enable priority promotion
    pub enable_promotion: bool,
    /// Maximum promotions per request
    pub max_promotions: u32,
}

impl Default for PriorityQueueConfig {
    fn default() -> Self {
        Self {
            max_size: 1000,
            promotion_age_ms: 30000, // 30 seconds
            enable_promotion: true,
            max_promotions: 2,
        }
    }
}

/// Priority queue for LLM requests
pub struct PriorityQueue {
    heap: BinaryHeap<PrioritizedRequest>,
    sequence: AtomicU64,
    config: PriorityQueueConfig,
}

impl PriorityQueue {
    pub fn new(config: PriorityQueueConfig) -> Self {
        Self {
            heap: BinaryHeap::new(),
            sequence: AtomicU64::new(0),
            config,
        }
    }

    /// Enqueue a request with priority
    pub fn enqueue(&mut self, request: LLMRequest, priority: Priority) -> Result<String, String> {
        if self.heap.len() >= self.config.max_size {
            return Err("Queue is full".to_string());
        }

        let seq = self.sequence.fetch_add(1, AtomicOrdering::SeqCst);
        let entry = PrioritizedRequest::new(request, priority, seq);
        let id = entry.id.clone();
        self.heap.push(entry);
        Ok(id)
    }

    /// Enqueue with deadline
    pub fn enqueue_with_deadline(
        &mut self,
        request: LLMRequest,
        priority: Priority,
        deadline_ms: u64,
    ) -> Result<String, String> {
        if self.heap.len() >= self.config.max_size {
            return Err("Queue is full".to_string());
        }

        let seq = self.sequence.fetch_add(1, AtomicOrdering::SeqCst);
        let entry = PrioritizedRequest::new(request, priority, seq).with_deadline(deadline_ms);
        let id = entry.id.clone();
        self.heap.push(entry);
        Ok(id)
    }

    /// Dequeue the highest priority request
    pub fn dequeue(&mut self) -> Option<PrioritizedRequest> {
        // First, apply promotions if enabled
        if self.config.enable_promotion {
            self.apply_promotions();
        }

        // Remove expired requests
        self.remove_expired();

        self.heap.pop()
    }

    /// Peek at the highest priority request
    pub fn peek(&self) -> Option<&PrioritizedRequest> {
        self.heap.peek()
    }

    /// Get queue length
    pub fn len(&self) -> usize {
        self.heap.len()
    }

    /// Check if queue is empty
    pub fn is_empty(&self) -> bool {
        self.heap.is_empty()
    }

    /// Get queue statistics by priority
    pub fn stats(&self) -> PriorityQueueStats {
        let mut by_priority = std::collections::HashMap::new();
        let mut expired_count = 0;
        let mut total_age = 0u64;

        for entry in self.heap.iter() {
            *by_priority.entry(entry.priority).or_insert(0) += 1;
            total_age += entry.age_ms();
            if entry.is_expired() {
                expired_count += 1;
            }
        }

        PriorityQueueStats {
            total: self.heap.len(),
            by_priority,
            expired_count,
            avg_age_ms: if self.heap.is_empty() {
                0
            } else {
                total_age / self.heap.len() as u64
            },
        }
    }

    /// Apply priority promotions based on age
    fn apply_promotions(&mut self) {
        let promotion_age = self.config.promotion_age_ms;
        let max_promotions = self.config.max_promotions;

        let entries: Vec<_> = self.heap.drain().collect();
        for mut entry in entries {
            if entry.age_ms() > promotion_age * (entry.promotions + 1) as u64
                && entry.promotions < max_promotions
                && entry.priority != Priority::Critical
            {
                let new_priority = Priority::from_value(entry.priority.value().saturating_sub(1));
                entry.priority = new_priority;
                entry.promotions += 1;
            }
            self.heap.push(entry);
        }
    }

    /// Remove expired requests
    fn remove_expired(&mut self) {
        let entries: Vec<_> = self.heap.drain().filter(|e| !e.is_expired()).collect();
        for entry in entries {
            self.heap.push(entry);
        }
    }

    /// Clear the queue
    pub fn clear(&mut self) {
        self.heap.clear();
    }
}

impl Default for PriorityQueue {
    fn default() -> Self {
        Self::new(PriorityQueueConfig::default())
    }
}

/// Queue statistics
#[derive(Debug, Clone)]
pub struct PriorityQueueStats {
    /// Total items in queue
    pub total: usize,
    /// Count by priority level
    pub by_priority: std::collections::HashMap<Priority, usize>,
    /// Number of expired items
    pub expired_count: usize,
    /// Average age in milliseconds
    pub avg_age_ms: u64,
}

/// Thread-safe priority queue wrapper
pub struct AsyncPriorityQueue {
    inner: Arc<Mutex<PriorityQueue>>,
}

impl AsyncPriorityQueue {
    pub fn new(config: PriorityQueueConfig) -> Self {
        Self {
            inner: Arc::new(Mutex::new(PriorityQueue::new(config))),
        }
    }

    pub async fn enqueue(&self, request: LLMRequest, priority: Priority) -> Result<String, String> {
        let mut queue = self.inner.lock().await;
        queue.enqueue(request, priority)
    }

    pub async fn dequeue(&self) -> Option<PrioritizedRequest> {
        let mut queue = self.inner.lock().await;
        queue.dequeue()
    }

    pub async fn len(&self) -> usize {
        let queue = self.inner.lock().await;
        queue.len()
    }

    pub async fn is_empty(&self) -> bool {
        let queue = self.inner.lock().await;
        queue.is_empty()
    }

    pub async fn stats(&self) -> PriorityQueueStats {
        let queue = self.inner.lock().await;
        queue.stats()
    }
}

impl Default for AsyncPriorityQueue {
    fn default() -> Self {
        Self::new(PriorityQueueConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_priority_ordering() {
        assert!(Priority::Critical > Priority::High);
        assert!(Priority::High > Priority::Normal);
        assert!(Priority::Normal > Priority::Low);
        assert!(Priority::Low > Priority::Background);
    }

    #[test]
    fn test_enqueue_dequeue() {
        let mut queue = PriorityQueue::default();

        queue
            .enqueue(LLMRequest::simple("Low"), Priority::Low)
            .unwrap();
        queue
            .enqueue(LLMRequest::simple("High"), Priority::High)
            .unwrap();
        queue
            .enqueue(LLMRequest::simple("Normal"), Priority::Normal)
            .unwrap();

        // Should dequeue in priority order
        let first = queue.dequeue().unwrap();
        assert_eq!(first.priority, Priority::High);

        let second = queue.dequeue().unwrap();
        assert_eq!(second.priority, Priority::Normal);

        let third = queue.dequeue().unwrap();
        assert_eq!(third.priority, Priority::Low);
    }

    #[test]
    fn test_fifo_within_priority() {
        let mut queue = PriorityQueue::new(PriorityQueueConfig {
            enable_promotion: false,
            ..Default::default()
        });

        let id1 = queue
            .enqueue(LLMRequest::simple("First"), Priority::Normal)
            .unwrap();
        let id2 = queue
            .enqueue(LLMRequest::simple("Second"), Priority::Normal)
            .unwrap();
        let id3 = queue
            .enqueue(LLMRequest::simple("Third"), Priority::Normal)
            .unwrap();

        // Should maintain FIFO order within same priority
        assert_eq!(queue.dequeue().unwrap().id, id1);
        assert_eq!(queue.dequeue().unwrap().id, id2);
        assert_eq!(queue.dequeue().unwrap().id, id3);
    }

    #[test]
    fn test_queue_stats() {
        let mut queue = PriorityQueue::default();

        queue
            .enqueue(LLMRequest::simple("1"), Priority::High)
            .unwrap();
        queue
            .enqueue(LLMRequest::simple("2"), Priority::High)
            .unwrap();
        queue
            .enqueue(LLMRequest::simple("3"), Priority::Normal)
            .unwrap();

        let stats = queue.stats();
        assert_eq!(stats.total, 3);
        assert_eq!(*stats.by_priority.get(&Priority::High).unwrap(), 2);
        assert_eq!(*stats.by_priority.get(&Priority::Normal).unwrap(), 1);
    }

    #[test]
    fn test_queue_full() {
        let mut queue = PriorityQueue::new(PriorityQueueConfig {
            max_size: 2,
            ..Default::default()
        });

        queue
            .enqueue(LLMRequest::simple("1"), Priority::Normal)
            .unwrap();
        queue
            .enqueue(LLMRequest::simple("2"), Priority::Normal)
            .unwrap();

        let result = queue.enqueue(LLMRequest::simple("3"), Priority::Normal);
        assert!(result.is_err());
    }

    #[test]
    fn test_request_age() {
        let entry = PrioritizedRequest::new(LLMRequest::simple("Test"), Priority::Normal, 0);

        // Age should be very small right after creation
        assert!(entry.age_ms() < 100);
    }

    #[test]
    fn test_deadline_priority() {
        let mut queue = PriorityQueue::new(PriorityQueueConfig {
            enable_promotion: false,
            ..Default::default()
        });

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        // Add requests with different deadlines
        queue
            .enqueue_with_deadline(LLMRequest::simple("Later"), Priority::High, now + 10000)
            .unwrap();

        queue
            .enqueue_with_deadline(
                LLMRequest::simple("Sooner"),
                Priority::Normal, // Lower priority but closer deadline
                now + 1000,
            )
            .unwrap();

        // Closer deadline should come first despite lower priority
        let first = queue.dequeue().unwrap();
        assert!(first.request.messages[0].content.contains("Sooner"));
    }

    #[tokio::test]
    async fn test_async_queue() {
        let queue = AsyncPriorityQueue::default();

        queue
            .enqueue(LLMRequest::simple("Test"), Priority::Normal)
            .await
            .unwrap();
        assert_eq!(queue.len().await, 1);

        let item = queue.dequeue().await;
        assert!(item.is_some());
        assert_eq!(queue.len().await, 0);
    }
}
