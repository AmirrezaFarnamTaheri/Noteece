//! Cost Tracking for LLM API Usage
//!
//! Tracks and estimates costs across different LLM providers with:
//! - Per-request cost calculation
//! - Session and lifetime tracking
//! - Budget alerts and limits
//! - Cost comparison between providers

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// Cost per 1000 tokens (in USD cents for precision)
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct TokenPricing {
    /// Cost per 1K input tokens (in cents)
    pub input_per_1k: f64,
    /// Cost per 1K output tokens (in cents)
    pub output_per_1k: f64,
}

impl TokenPricing {
    pub fn new(input_per_1k: f64, output_per_1k: f64) -> Self {
        Self {
            input_per_1k,
            output_per_1k,
        }
    }

    /// Calculate cost for a request
    pub fn calculate(&self, input_tokens: usize, output_tokens: usize) -> f64 {
        let input_cost = (input_tokens as f64 / 1000.0) * self.input_per_1k;
        let output_cost = (output_tokens as f64 / 1000.0) * self.output_per_1k;
        (input_cost + output_cost) / 100.0 // Convert cents to dollars
    }
}

/// Get pricing for a specific model
pub fn get_model_pricing(model: &str) -> TokenPricing {
    match model {
        // OpenAI GPT-4 models
        "gpt-4" | "gpt-4-0613" => TokenPricing::new(3.0, 6.0),
        "gpt-4-32k" | "gpt-4-32k-0613" => TokenPricing::new(6.0, 12.0),
        "gpt-4-turbo" | "gpt-4-turbo-preview" | "gpt-4-1106-preview" => TokenPricing::new(1.0, 3.0),
        "gpt-4o" => TokenPricing::new(0.5, 1.5),
        "gpt-4o-mini" => TokenPricing::new(0.015, 0.06),

        // OpenAI GPT-3.5
        "gpt-3.5-turbo" | "gpt-3.5-turbo-0125" => TokenPricing::new(0.05, 0.15),

        // Claude models (per million tokens converted to per 1K)
        "claude-3-opus-20240229" => TokenPricing::new(1.5, 7.5),
        "claude-3-sonnet-20240229" => TokenPricing::new(0.3, 1.5),
        "claude-3-5-sonnet-20241022" => TokenPricing::new(0.3, 1.5),
        "claude-3-haiku-20240307" => TokenPricing::new(0.025, 0.125),

        // Gemini models (approximate)
        "gemini-1.5-pro" => TokenPricing::new(0.125, 0.375),
        "gemini-1.5-flash" => TokenPricing::new(0.0075, 0.03),
        "gemini-1.0-pro" => TokenPricing::new(0.05, 0.15),

        // Local models (free)
        "llama3" | "llama3.2" | "llama3.1" | "mistral" | "mixtral" | "codellama" => {
            TokenPricing::new(0.0, 0.0)
        }

        // Default (conservative estimate)
        _ => TokenPricing::new(0.1, 0.3),
    }
}

/// A single cost record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostRecord {
    /// Timestamp (Unix millis)
    pub timestamp: u64,
    /// Model used
    pub model: String,
    /// Provider
    pub provider: String,
    /// Input tokens
    pub input_tokens: usize,
    /// Output tokens
    pub output_tokens: usize,
    /// Total cost in USD
    pub cost_usd: f64,
    /// Request ID (for correlation)
    pub request_id: Option<String>,
}

/// Aggregate cost statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CostStats {
    /// Total requests
    pub total_requests: u64,
    /// Total input tokens
    pub total_input_tokens: u64,
    /// Total output tokens
    pub total_output_tokens: u64,
    /// Total cost in USD
    pub total_cost_usd: f64,
    /// Cost by provider
    pub by_provider: HashMap<String, f64>,
    /// Cost by model
    pub by_model: HashMap<String, f64>,
}

impl CostStats {
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a cost record
    pub fn add(&mut self, record: &CostRecord) {
        self.total_requests += 1;
        self.total_input_tokens += record.input_tokens as u64;
        self.total_output_tokens += record.output_tokens as u64;
        self.total_cost_usd += record.cost_usd;

        *self
            .by_provider
            .entry(record.provider.clone())
            .or_insert(0.0) += record.cost_usd;
        *self.by_model.entry(record.model.clone()).or_insert(0.0) += record.cost_usd;
    }

    /// Get average cost per request
    pub fn avg_cost_per_request(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.total_cost_usd / self.total_requests as f64
        }
    }

    /// Get average tokens per request
    pub fn avg_tokens_per_request(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            (self.total_input_tokens + self.total_output_tokens) as f64 / self.total_requests as f64
        }
    }
}

/// Budget configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetConfig {
    /// Daily limit in USD
    pub daily_limit: Option<f64>,
    /// Monthly limit in USD
    pub monthly_limit: Option<f64>,
    /// Per-request limit in USD
    pub per_request_limit: Option<f64>,
    /// Warning threshold (0.0-1.0 of limit)
    pub warning_threshold: f64,
}

impl Default for BudgetConfig {
    fn default() -> Self {
        Self {
            daily_limit: None,
            monthly_limit: None,
            per_request_limit: None,
            warning_threshold: 0.8,
        }
    }
}

impl BudgetConfig {
    pub fn with_daily(limit: f64) -> Self {
        Self {
            daily_limit: Some(limit),
            ..Default::default()
        }
    }

    pub fn with_monthly(limit: f64) -> Self {
        Self {
            monthly_limit: Some(limit),
            ..Default::default()
        }
    }
}

/// Budget status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetStatus {
    /// Current daily spend
    pub daily_spend: f64,
    /// Current monthly spend
    pub monthly_spend: f64,
    /// Daily limit (if set)
    pub daily_limit: Option<f64>,
    /// Monthly limit (if set)
    pub monthly_limit: Option<f64>,
    /// Whether daily limit exceeded
    pub daily_exceeded: bool,
    /// Whether monthly limit exceeded
    pub monthly_exceeded: bool,
    /// Whether at warning threshold
    pub at_warning: bool,
}

/// Cost tracker for monitoring LLM expenses
pub struct CostTracker {
    /// All cost records
    records: Vec<CostRecord>,
    /// Current session stats
    session_stats: CostStats,
    /// Lifetime stats
    lifetime_stats: CostStats,
    /// Budget configuration
    budget: BudgetConfig,
    /// Atomic counter for thread-safe updates
    request_counter: Arc<AtomicU64>,
}

impl CostTracker {
    pub fn new() -> Self {
        Self {
            records: Vec::new(),
            session_stats: CostStats::new(),
            lifetime_stats: CostStats::new(),
            budget: BudgetConfig::default(),
            request_counter: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn with_budget(budget: BudgetConfig) -> Self {
        Self {
            budget,
            ..Self::new()
        }
    }

    /// Record a completed request
    pub fn record(
        &mut self,
        model: &str,
        provider: &str,
        input_tokens: usize,
        output_tokens: usize,
        request_id: Option<String>,
    ) -> CostRecord {
        let pricing = get_model_pricing(model);
        let cost = pricing.calculate(input_tokens, output_tokens);

        let record = CostRecord {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            model: model.to_string(),
            provider: provider.to_string(),
            input_tokens,
            output_tokens,
            cost_usd: cost,
            request_id,
        };

        self.session_stats.add(&record);
        self.lifetime_stats.add(&record);
        self.records.push(record.clone());
        self.request_counter.fetch_add(1, Ordering::Relaxed);

        record
    }

    /// Estimate cost before making a request
    pub fn estimate_cost(&self, model: &str, input_tokens: usize, expected_output: usize) -> f64 {
        let pricing = get_model_pricing(model);
        pricing.calculate(input_tokens, expected_output)
    }

    /// Get current session stats
    pub fn session_stats(&self) -> &CostStats {
        &self.session_stats
    }

    /// Get lifetime stats
    pub fn lifetime_stats(&self) -> &CostStats {
        &self.lifetime_stats
    }

    /// Get all records
    pub fn records(&self) -> &[CostRecord] {
        &self.records
    }

    /// Get budget status
    pub fn budget_status(&self) -> BudgetStatus {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let day_start = now - (now % 86400);
        let month_start = now - (now % (86400 * 30)); // Approximate

        let daily_spend: f64 = self
            .records
            .iter()
            .filter(|r| r.timestamp / 1000 >= day_start)
            .map(|r| r.cost_usd)
            .sum();

        let monthly_spend: f64 = self
            .records
            .iter()
            .filter(|r| r.timestamp / 1000 >= month_start)
            .map(|r| r.cost_usd)
            .sum();

        let daily_exceeded = self
            .budget
            .daily_limit
            .map(|l| daily_spend >= l)
            .unwrap_or(false);
        let monthly_exceeded = self
            .budget
            .monthly_limit
            .map(|l| monthly_spend >= l)
            .unwrap_or(false);

        let at_warning = self
            .budget
            .daily_limit
            .map(|l| daily_spend >= l * self.budget.warning_threshold)
            .unwrap_or(false)
            || self
                .budget
                .monthly_limit
                .map(|l| monthly_spend >= l * self.budget.warning_threshold)
                .unwrap_or(false);

        BudgetStatus {
            daily_spend,
            monthly_spend,
            daily_limit: self.budget.daily_limit,
            monthly_limit: self.budget.monthly_limit,
            daily_exceeded,
            monthly_exceeded,
            at_warning,
        }
    }

    /// Check if a request would exceed budget
    pub fn would_exceed_budget(&self, estimated_cost: f64) -> bool {
        let status = self.budget_status();

        if let Some(limit) = self.budget.daily_limit {
            if status.daily_spend + estimated_cost > limit {
                return true;
            }
        }

        if let Some(limit) = self.budget.monthly_limit {
            if status.monthly_spend + estimated_cost > limit {
                return true;
            }
        }

        if let Some(limit) = self.budget.per_request_limit {
            if estimated_cost > limit {
                return true;
            }
        }

        false
    }

    /// Reset session stats
    pub fn reset_session(&mut self) {
        self.session_stats = CostStats::new();
    }

    /// Compare costs between providers for a given token count
    pub fn compare_providers(input_tokens: usize, output_tokens: usize) -> HashMap<String, f64> {
        let models = vec![
            ("OpenAI GPT-4o", "gpt-4o"),
            ("OpenAI GPT-4o-mini", "gpt-4o-mini"),
            ("OpenAI GPT-4", "gpt-4"),
            ("OpenAI GPT-3.5", "gpt-3.5-turbo"),
            ("Claude Opus", "claude-3-opus-20240229"),
            ("Claude Sonnet", "claude-3-5-sonnet-20241022"),
            ("Claude Haiku", "claude-3-haiku-20240307"),
            ("Gemini Pro", "gemini-1.5-pro"),
            ("Gemini Flash", "gemini-1.5-flash"),
            ("Local (Ollama)", "llama3"),
        ];

        models
            .into_iter()
            .map(|(name, model)| {
                let pricing = get_model_pricing(model);
                (
                    name.to_string(),
                    pricing.calculate(input_tokens, output_tokens),
                )
            })
            .collect()
    }
}

impl Default for CostTracker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pricing_calculation() {
        let pricing = TokenPricing::new(1.0, 2.0); // 1 cent/1K input, 2 cents/1K output
        let cost = pricing.calculate(1000, 1000);
        assert!((cost - 0.03).abs() < 0.001); // $0.03
    }

    #[test]
    fn test_model_pricing() {
        let gpt4_pricing = get_model_pricing("gpt-4");
        assert!(gpt4_pricing.input_per_1k > 0.0);

        let local_pricing = get_model_pricing("llama3");
        assert_eq!(local_pricing.input_per_1k, 0.0);
    }

    #[test]
    fn test_cost_tracker() {
        let mut tracker = CostTracker::new();

        tracker.record("gpt-3.5-turbo", "openai", 100, 50, None);
        tracker.record("gpt-3.5-turbo", "openai", 200, 100, None);

        assert_eq!(tracker.session_stats().total_requests, 2);
        assert!(tracker.session_stats().total_cost_usd > 0.0);
    }

    #[test]
    fn test_budget_checking() {
        let budget = BudgetConfig {
            daily_limit: Some(1.0),
            ..Default::default()
        };
        let tracker = CostTracker::with_budget(budget);

        // Estimate for a small request
        let estimate = tracker.estimate_cost("gpt-3.5-turbo", 100, 50);
        assert!(!tracker.would_exceed_budget(estimate));

        // Estimate for an expensive request
        let large_estimate = tracker.estimate_cost("gpt-4", 100000, 50000);
        // This might exceed depending on the budget
    }

    #[test]
    fn test_provider_comparison() {
        let comparison = CostTracker::compare_providers(1000, 500);
        assert!(!comparison.is_empty());

        // Local should be free
        assert_eq!(*comparison.get("Local (Ollama)").unwrap(), 0.0);

        // GPT-4 should be more expensive than GPT-3.5
        let gpt4_cost = comparison.get("OpenAI GPT-4").unwrap();
        let gpt35_cost = comparison.get("OpenAI GPT-3.5").unwrap();
        assert!(gpt4_cost > gpt35_cost);
    }

    #[test]
    fn test_cost_stats() {
        let mut stats = CostStats::new();

        stats.add(&CostRecord {
            timestamp: 0,
            model: "gpt-4".to_string(),
            provider: "openai".to_string(),
            input_tokens: 100,
            output_tokens: 50,
            cost_usd: 0.01,
            request_id: None,
        });

        assert_eq!(stats.total_requests, 1);
        assert_eq!(stats.total_input_tokens, 100);
        assert_eq!(stats.avg_cost_per_request(), 0.01);
    }
}
