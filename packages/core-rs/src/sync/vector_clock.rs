/// Vector Clock Implementation for Distributed Sync
/// Tracks causal relationships between events across multiple devices
///
/// Each device maintains a clock that increments for local events
/// and tracks seen versions from all other devices.
/// This enables detecting concurrent, causally dependent, and conflicting updates.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Vector clock for tracking causal ordering of events
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VectorClock {
    /// Device ID -> logical clock value mapping
    clock: HashMap<String, u64>,
    /// Current device ID
    device_id: String,
}

impl VectorClock {
    /// Create new vector clock for a device
    pub fn new(device_id: String) -> Self {
        let mut clock = HashMap::new();
        clock.insert(device_id.clone(), 0);
        VectorClock { clock, device_id }
    }

    /// Increment clock for local event
    pub fn increment(&mut self) {
        let current = self.clock.entry(self.device_id.clone()).or_insert(0);
        *current += 1;
    }

    /// Update with remote clock (merge operation)
    pub fn merge(&mut self, other: &VectorClock) {
        for (device_id, other_time) in &other.clock {
            let current_time = self.clock.entry(device_id.clone()).or_insert(0);
            if *other_time > *current_time {
                *current_time = *other_time;
            }
        }
        // Increment our own clock after merge
        self.increment();
    }

    /// Check if this clock happened before other clock (causal ordering)
    pub fn happens_before(&self, other: &VectorClock) -> bool {
        let mut at_least_one_smaller = false;

        for device_id in self.clock.keys() {
            let self_time = self.clock.get(device_id).copied().unwrap_or(0);
            let other_time = other.clock.get(device_id).copied().unwrap_or(0);

            if self_time > other_time {
                return false; // Self is greater in at least one dimension
            }
            if self_time < other_time {
                at_least_one_smaller = true;
            }
        }

        // Also check dimensions in other that we don't have
        for device_id in other.clock.keys() {
            if !self.clock.contains_key(device_id) {
                at_least_one_smaller = true;
            }
        }

        at_least_one_smaller
    }

    /// Check if clocks are concurrent (neither happens before the other)
    pub fn concurrent(&self, other: &VectorClock) -> bool {
        !self.happens_before(other) && !other.happens_before(self)
    }

    /// Get current clock value for this device
    pub fn get_value(&self) -> u64 {
        self.clock.get(&self.device_id).copied().unwrap_or(0)
    }

    /// Get clock state as map
    pub fn state(&self) -> HashMap<String, u64> {
        self.clock.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector_clock_increment() {
        let mut clock = VectorClock::new("device1".to_string());
        assert_eq!(clock.get_value(), 0);

        clock.increment();
        assert_eq!(clock.get_value(), 1);

        clock.increment();
        assert_eq!(clock.get_value(), 2);
    }

    #[test]
    fn test_vector_clock_merge() {
        let mut clock1 = VectorClock::new("device1".to_string());
        let mut clock2 = VectorClock::new("device2".to_string());

        clock1.increment();
        clock2.increment();

        clock1.merge(&clock2);
        assert_eq!(clock1.get_value(), 2);
    }

    #[test]
    fn test_happens_before() {
        let mut clock1 = VectorClock::new("device1".to_string());
        let mut clock2 = VectorClock::new("device2".to_string());

        clock1.increment();
        clock1.increment();

        assert!(clock1.happens_before(&clock2) == false);

        clock2.merge(&clock1);
        assert!(clock1.happens_before(&clock2));
    }

    #[test]
    fn test_concurrent_clocks() {
        let mut clock1 = VectorClock::new("device1".to_string());
        let mut clock2 = VectorClock::new("device2".to_string());

        clock1.increment();
        clock2.increment();

        assert!(clock1.concurrent(&clock2));
    }
}
