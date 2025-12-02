/// Conflict Resolution Engine for Distributed Sync
/// Handles merging of concurrent updates using vector clocks
/// Supports multiple conflict resolution strategies
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

use super::vector_clock::VectorClock;

/// Represents a version of an entity with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionedEntity {
    pub id: String,
    pub data: serde_json::Value,
    pub vector_clock: VectorClock,
    pub timestamp: i64,
    pub device_id: String,
}

/// Result of conflict resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictResolution {
    /// No conflict, update is safe
    NoConflict,
    /// Conflict detected and resolved
    Resolved {
        winning_version: VersionedEntity,
        losing_version: VersionedEntity,
        strategy_used: ResolutionStrategy,
    },
    /// Conflict detected but unresolvable
    Unresolvable {
        version1: VersionedEntity,
        version2: VersionedEntity,
        reason: String,
    },
}

/// Strategy for resolving conflicts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ResolutionStrategy {
    /// Causal ordering: earlier event wins
    CausalOrdering,
    /// Last write wins: newer timestamp wins
    LastWriteWins,
    /// Device priority: specific device wins
    DevicePriority,
    /// Merge: combine both versions
    Merge,
    /// Manual: requires user intervention
    Manual,
}

/// Conflict resolver using vector clocks
pub struct ConflictResolver {
    strategy: ResolutionStrategy,
    device_priority: Vec<String>, // For device priority strategy
}

impl ConflictResolver {
    /// Create new conflict resolver
    pub fn new(strategy: ResolutionStrategy) -> Self {
        ConflictResolver {
            strategy,
            device_priority: Vec::new(),
        }
    }

    /// Set device priority order (for DevicePriority strategy)
    pub fn set_device_priority(&mut self, devices: Vec<String>) {
        self.device_priority = devices;
    }

    /// Resolve conflict between two versions
    #[allow(clippy::ptr_arg)]
    pub fn resolve(&self, local: &VersionedEntity, remote: &VersionedEntity) -> ConflictResolution {
        // Check if there's actually a conflict
        if local.vector_clock.happens_before(&remote.vector_clock) {
            // Remote is causally after local, no conflict
            return ConflictResolution::NoConflict;
        }

        if remote.vector_clock.happens_before(&local.vector_clock) {
            // Local is causally after remote, no conflict
            return ConflictResolution::NoConflict;
        }

        // Concurrent updates - real conflict
        match self.strategy {
            ResolutionStrategy::CausalOrdering => self.resolve_causal_ordering(local, remote),
            ResolutionStrategy::LastWriteWins => self.resolve_last_write_wins(local, remote),
            ResolutionStrategy::DevicePriority => self.resolve_device_priority(local, remote),
            ResolutionStrategy::Merge => self.resolve_merge(local, remote),
            ResolutionStrategy::Manual => ConflictResolution::Unresolvable {
                version1: local.clone(),
                version2: remote.clone(),
                reason: "Manual resolution required".to_string(),
            },
        }
    }

    /// Causal ordering resolution: causally earlier wins
    fn resolve_causal_ordering(
        &self,
        local: &VersionedEntity,
        remote: &VersionedEntity,
    ) -> ConflictResolution {
        if local.vector_clock.happens_before(&remote.vector_clock) {
            ConflictResolution::Resolved {
                winning_version: remote.clone(),
                losing_version: local.clone(),
                strategy_used: ResolutionStrategy::CausalOrdering,
            }
        } else if remote.vector_clock.happens_before(&local.vector_clock) {
            ConflictResolution::Resolved {
                winning_version: local.clone(),
                losing_version: remote.clone(),
                strategy_used: ResolutionStrategy::CausalOrdering,
            }
        } else {
            // Truly concurrent, fall back to timestamp
            self.resolve_last_write_wins(local, remote)
        }
    }

    /// Last write wins: newer timestamp is accepted
    fn resolve_last_write_wins(
        &self,
        local: &VersionedEntity,
        remote: &VersionedEntity,
    ) -> ConflictResolution {
        match local.timestamp.cmp(&remote.timestamp) {
            Ordering::Greater => ConflictResolution::Resolved {
                winning_version: local.clone(),
                losing_version: remote.clone(),
                strategy_used: ResolutionStrategy::LastWriteWins,
            },
            Ordering::Less => ConflictResolution::Resolved {
                winning_version: remote.clone(),
                losing_version: local.clone(),
                strategy_used: ResolutionStrategy::LastWriteWins,
            },
            Ordering::Equal => {
                // Same timestamp, use device ID as tiebreaker
                if local.device_id > remote.device_id {
                    ConflictResolution::Resolved {
                        winning_version: local.clone(),
                        losing_version: remote.clone(),
                        strategy_used: ResolutionStrategy::LastWriteWins,
                    }
                } else {
                    ConflictResolution::Resolved {
                        winning_version: remote.clone(),
                        losing_version: local.clone(),
                        strategy_used: ResolutionStrategy::LastWriteWins,
                    }
                }
            }
        }
    }

    /// Device priority: highest priority device wins
    fn resolve_device_priority(
        &self,
        local: &VersionedEntity,
        remote: &VersionedEntity,
    ) -> ConflictResolution {
        let local_priority = self
            .device_priority
            .iter()
            .position(|d| d == &local.device_id)
            .unwrap_or(usize::MAX);
        let remote_priority = self
            .device_priority
            .iter()
            .position(|d| d == &remote.device_id)
            .unwrap_or(usize::MAX);

        if local_priority < remote_priority {
            ConflictResolution::Resolved {
                winning_version: local.clone(),
                losing_version: remote.clone(),
                strategy_used: ResolutionStrategy::DevicePriority,
            }
        } else {
            ConflictResolution::Resolved {
                winning_version: remote.clone(),
                losing_version: local.clone(),
                strategy_used: ResolutionStrategy::DevicePriority,
            }
        }
    }

    /// Merge resolution: combine both versions
    fn resolve_merge(
        &self,
        local: &VersionedEntity,
        remote: &VersionedEntity,
    ) -> ConflictResolution {
        // For JSON objects, merge properties
        let merged_data = merge_json_objects(&local.data, &remote.data);

        // Use newer timestamp
        let merged_version = if local.timestamp >= remote.timestamp {
            VersionedEntity {
                id: local.id.clone(),
                data: merged_data,
                vector_clock: local.vector_clock.clone(),
                timestamp: local.timestamp,
                device_id: local.device_id.clone(),
            }
        } else {
            VersionedEntity {
                id: remote.id.clone(),
                data: merged_data,
                vector_clock: remote.vector_clock.clone(),
                timestamp: remote.timestamp,
                device_id: remote.device_id.clone(),
            }
        };

        ConflictResolution::Resolved {
            winning_version: merged_version,
            losing_version: VersionedEntity {
                id: "merged".to_string(),
                data: serde_json::json!(null),
                vector_clock: local.vector_clock.clone(),
                timestamp: local.timestamp,
                device_id: local.device_id.clone(),
            },
            strategy_used: ResolutionStrategy::Merge,
        }
    }
}

/// Merge two JSON objects with deep-merge strategy
/// Recursively merges nested objects and performs SET UNION on arrays
/// to avoid losing updates from concurrent devices
fn merge_json_objects(local: &serde_json::Value, remote: &serde_json::Value) -> serde_json::Value {
    use serde_json::Value::*;

    match (local, remote) {
        // Both are objects: deep merge
        (Object(local_obj), Object(remote_obj)) => {
            let mut merged = local_obj.clone();

            for (key, remote_val) in remote_obj.iter() {
                match (merged.get(key), remote_val) {
                    // Both have the key - recursively merge if both objects, otherwise prefer remote
                    (Some(local_val), remote_val_ref) => {
                        match (local_val, remote_val_ref) {
                            // Both are objects: recurse
                            (Object(_), Object(_)) => {
                                merged.insert(
                                    key.clone(),
                                    merge_json_objects(local_val, remote_val_ref),
                                );
                            }
                            // Both are arrays: SET UNION merge to preserve all items
                            (Array(local_arr), Array(remote_arr)) => {
                                let union = merge_arrays(local_arr, remote_arr);
                                merged.insert(key.clone(), Array(union));
                            }
                            // Different types or scalars: prefer remote (assume newer)
                            _ => {
                                merged.insert(key.clone(), remote_val_ref.clone());
                            }
                        }
                    }
                    // Remote has key but local doesn't: add it
                    (None, remote_val_ref) => {
                        merged.insert(key.clone(), remote_val_ref.clone());
                    }
                }
            }

            Object(merged)
        }
        // Both are arrays at top level: SET UNION
        (Array(local_arr), Array(remote_arr)) => Array(merge_arrays(local_arr, remote_arr)),
        // Handle nulls
        (_, Null) => local.clone(),
        (Null, _) => remote.clone(),
        // Different types or scalars: prefer remote (assume it's newer)
        _ => remote.clone(),
    }
}

/// Merge two JSON arrays using SET UNION strategy
/// Preserves all unique items from both arrays, deduplicating by value
fn merge_arrays(
    local: &[serde_json::Value],
    remote: &[serde_json::Value],
) -> Vec<serde_json::Value> {
    use std::collections::HashSet;

    let mut result = local.to_vec();
    let mut seen: HashSet<String> = HashSet::new();

    // Add all local items to seen set (use JSON string repr for comparison)
    for item in local.iter() {
        seen.insert(item.to_string());
    }

    // Add remote items that aren't already present
    for item in remote.iter() {
        let key = item.to_string();
        if !seen.contains(&key) {
            result.push(item.clone());
            seen.insert(key);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_entity(id: &str, device_id: &str, timestamp: i64) -> VersionedEntity {
        let mut vector_clock = VectorClock::new(device_id.to_string());
        vector_clock.increment();
        VersionedEntity {
            id: id.to_string(),
            data: serde_json::json!({"value": "test"}),
            vector_clock,
            timestamp,
            device_id: device_id.to_string(),
        }
    }

    #[test]
    fn test_last_write_wins() {
        let local = create_entity("entity1", "device1", 100);
        let remote = create_entity("entity1", "device2", 200);

        let resolver = ConflictResolver::new(ResolutionStrategy::LastWriteWins);
        let result = resolver.resolve(&local, &remote);

        let winning_version = match result {
            ConflictResolution::Resolved {
                winning_version, ..
            } => winning_version,
            _ => panic!("Expected resolved conflict but got: {:?}", result),
        };
        assert_eq!(winning_version.device_id, "device2");
    }

    #[test]
    fn test_device_priority() {
        let local = create_entity("entity1", "device1", 100);
        let remote = create_entity("entity1", "device2", 100);

        let mut resolver = ConflictResolver::new(ResolutionStrategy::DevicePriority);
        resolver.set_device_priority(vec!["device1".to_string(), "device2".to_string()]);

        let result = resolver.resolve(&local, &remote);

        let winning_version = match result {
            ConflictResolution::Resolved {
                winning_version, ..
            } => winning_version,
            _ => panic!("Expected resolved conflict but got: {:?}", result),
        };
        assert_eq!(winning_version.device_id, "device1");
    }

    #[test]
    fn test_merge_strategy() {
        let mut local = create_entity("entity1", "device1", 100);
        local.data = serde_json::json!({"a": 1, "b": 2});

        let mut remote = create_entity("entity1", "device2", 100);
        remote.data = serde_json::json!({"b": 3, "c": 4});

        let resolver = ConflictResolver::new(ResolutionStrategy::Merge);
        let result = resolver.resolve(&local, &remote);

        let winning_version = match result {
            ConflictResolution::Resolved {
                winning_version, ..
            } => winning_version,
            _ => panic!("Expected resolved conflict but got: {:?}", result),
        };
        assert_eq!(winning_version.data["a"], 1);
        assert!(winning_version.data["b"].is_number());
        assert_eq!(winning_version.data["c"], 4);
    }

    #[test]
    fn test_array_merge_set_union() {
        // Test that arrays are merged with SET UNION, not replaced
        let mut local = create_entity("entity1", "device1", 100);
        local.data = serde_json::json!({
            "tags": ["work", "important"],
            "subtasks": [{"id": "1", "name": "Task A"}]
        });

        let mut remote = create_entity("entity1", "device2", 100);
        remote.data = serde_json::json!({
            "tags": ["important", "urgent"],
            "subtasks": [{"id": "2", "name": "Task B"}]
        });

        let resolver = ConflictResolver::new(ResolutionStrategy::Merge);
        let result = resolver.resolve(&local, &remote);

        let winning_version = match result {
            ConflictResolution::Resolved {
                winning_version, ..
            } => winning_version,
            _ => panic!("Expected resolved conflict but got: {:?}", result),
        };

        // Tags should contain all unique values: work, important, urgent
        let tags = winning_version.data["tags"]
            .as_array()
            .expect("Tags should be an array");
        assert_eq!(tags.len(), 3);
        assert!(tags.contains(&serde_json::json!("work")));
        assert!(tags.contains(&serde_json::json!("important")));
        assert!(tags.contains(&serde_json::json!("urgent")));

        // Subtasks should contain both tasks
        let subtasks = winning_version.data["subtasks"]
            .as_array()
            .expect("Subtasks should be an array");
        assert_eq!(subtasks.len(), 2);
    }

    #[test]
    fn test_array_merge_deduplication() {
        // Test that duplicate items are not added twice
        let local_arr = vec![serde_json::json!("tag1"), serde_json::json!("tag2")];
        let remote_arr = vec![serde_json::json!("tag2"), serde_json::json!("tag3")];

        let result = super::merge_arrays(&local_arr, &remote_arr);
        assert_eq!(result.len(), 3);
        assert!(result.contains(&serde_json::json!("tag1")));
        assert!(result.contains(&serde_json::json!("tag2")));
        assert!(result.contains(&serde_json::json!("tag3")));
    }
}
