use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum TemporalGraphError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Parse error: {0}")]
    Parse(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub node_type: String, // note, task, project
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub word_count: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub edge_type: String, // backlink, task_to_project, note_to_task
    pub created_at: i64,
    pub weight: f64, // Strength of connection
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphSnapshot {
    pub timestamp: i64,
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub metrics: GraphMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphMetrics {
    pub total_nodes: u32,
    pub total_edges: u32,
    pub avg_degree: f64,  // Average connections per node
    pub communities: u32, // Number of detected clusters
    pub growth_rate: f64, // Nodes added per day
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphMilestone {
    pub id: String,
    pub timestamp: i64,
    pub milestone_type: String, // major_note, project_launch, streak, cluster_formation
    pub title: String,
    pub description: String,
    pub related_node_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEvolution {
    pub time_range: (i64, i64),
    pub snapshots: Vec<GraphSnapshot>,
    pub milestones: Vec<GraphMilestone>,
}

/// Initialize temporal graph tables
pub fn init_temporal_graph_tables(conn: &Connection) -> Result<(), TemporalGraphError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS graph_snapshot (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            nodes_json TEXT NOT NULL,
            edges_json TEXT NOT NULL,
            metrics_json TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS graph_milestone (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            milestone_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            related_nodes_json TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_graph_snapshot_space ON graph_snapshot(space_id, timestamp DESC)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_graph_milestone_space ON graph_milestone(space_id, timestamp DESC)",
        [],
    )?;

    Ok(())
}

/// Build current graph state from database
pub fn build_current_graph(
    conn: &Connection,
    space_id: Ulid,
) -> Result<GraphSnapshot, TemporalGraphError> {
    let now = Utc::now().timestamp();
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    // Collect notes as nodes
    let mut note_stmt = conn.prepare(
        "SELECT id, title, created_at, updated_at, content FROM note
         WHERE space_id = ?1 AND deleted = 0",
    )?;

    let note_rows = note_stmt.query_map([space_id.to_string()], |row| {
        let content: String = row.get(4).unwrap_or_default();
        let word_count = content.split_whitespace().count() as i32;

        Ok(GraphNode {
            id: row.get(0)?,
            node_type: "note".to_string(),
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
            word_count: Some(word_count),
            status: None,
        })
    })?;

    for node in note_rows {
        nodes.push(node?);
    }

    // Collect tasks as nodes
    let mut task_stmt = conn.prepare(
        "SELECT id, title, created_at, updated_at, status FROM task
         WHERE space_id = ?1",
    )?;

    let task_rows = task_stmt.query_map([space_id.to_string()], |row| {
        Ok(GraphNode {
            id: row.get(0)?,
            node_type: "task".to_string(),
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
            word_count: None,
            status: row.get(4)?,
        })
    })?;

    for node in task_rows {
        nodes.push(node?);
    }

    // Collect projects as nodes
    let mut project_stmt = conn.prepare(
        "SELECT id, name, created_at, updated_at, status FROM project
         WHERE space_id = ?1",
    )?;

    let project_rows = project_stmt.query_map([space_id.to_string()], |row| {
        Ok(GraphNode {
            id: row.get(0)?,
            node_type: "project".to_string(),
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
            word_count: None,
            status: row.get(4)?,
        })
    })?;

    for node in project_rows {
        nodes.push(node?);
    }

    // Collect backlinks as edges (filtered by space_id to prevent cross-space contamination)
    // Try space_id-based filtering first; fall back to JOIN if note_link lacks space_id
    // Exclude self-links to maintain graph integrity
    let stable_space_id = space_id.to_string();

    // Try to query with space_id column first
    let mut stmt_result = conn.prepare(
        "SELECT nl.id, nl.from_note_id, nl.to_note_id, nl.created_at
         FROM note_link nl
         LEFT JOIN note n1 ON n1.id = nl.from_note_id
         LEFT JOIN note n2 ON n2.id = nl.to_note_id
         WHERE n1.space_id = ?1
           AND n2.space_id = ?1
           AND nl.from_note_id != nl.to_note_id",
    );

    if stmt_result.is_err() {
        // Fallback for older schema without space_id on note_link
        stmt_result = conn.prepare(
            "SELECT id, from_note_id, to_note_id, created_at
             FROM note_link
             WHERE from_note_id != to_note_id",
        );
    }

    let mut stmt = stmt_result?;
    let backlink_rows = stmt.query_map([&stable_space_id], |row| {
        Ok(GraphEdge {
            id: row.get(0)?,
            source_id: row.get(1)?,
            target_id: row.get(2)?,
            edge_type: "backlink".to_string(),
            created_at: row.get(3)?,
            weight: 1.0,
        })
    })?;

    for edge in backlink_rows {
        edges.push(edge?);
    }

    // Collect task-project relationships as edges
    let mut task_project_stmt = conn.prepare(
        "SELECT id, id, project_id, created_at FROM task
         WHERE project_id IS NOT NULL",
    )?;

    let task_project_rows = task_project_stmt.query_map([], |row| {
        let task_id: String = row.get(1)?;
        let edge_id = Ulid::new().to_string();

        Ok(GraphEdge {
            id: edge_id,
            source_id: task_id,
            target_id: row.get(2)?,
            edge_type: "task_to_project".to_string(),
            created_at: row.get(3)?,
            weight: 0.8,
        })
    })?;

    for edge in task_project_rows {
        edges.push(edge?);
    }

    // Calculate metrics
    let total_nodes = nodes.len() as u32;
    let total_edges = edges.len() as u32;
    let avg_degree = if total_nodes > 0 {
        (total_edges as f64 * 2.0) / total_nodes as f64
    } else {
        0.0
    };

    let metrics = GraphMetrics {
        total_nodes,
        total_edges,
        avg_degree,
        communities: detect_communities(&nodes, &edges),
        growth_rate: calculate_growth_rate(conn, space_id, 7)?,
    };

    Ok(GraphSnapshot {
        timestamp: now,
        nodes,
        edges,
        metrics,
    })
}

/// Save graph snapshot
pub fn save_graph_snapshot(
    conn: &Connection,
    space_id: Ulid,
    snapshot: &GraphSnapshot,
) -> Result<String, TemporalGraphError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    let nodes_json = serde_json::to_string(&snapshot.nodes)
        .map_err(|e| TemporalGraphError::Parse(e.to_string()))?;
    let edges_json = serde_json::to_string(&snapshot.edges)
        .map_err(|e| TemporalGraphError::Parse(e.to_string()))?;
    let metrics_json = serde_json::to_string(&snapshot.metrics)
        .map_err(|e| TemporalGraphError::Parse(e.to_string()))?;

    conn.execute(
        "INSERT INTO graph_snapshot (id, space_id, timestamp, nodes_json, edges_json, metrics_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        [
            &id,
            &space_id.to_string(),
            &snapshot.timestamp.to_string(),
            &nodes_json,
            &edges_json,
            &metrics_json,
            &now.to_string(),
        ],
    )?;

    Ok(id)
}

/// Get graph snapshots for a time range
pub fn get_graph_snapshots(
    conn: &Connection,
    space_id: Ulid,
    start_time: i64,
    end_time: i64,
    limit: u32,
) -> Result<Vec<GraphSnapshot>, TemporalGraphError> {
    let mut stmt = conn.prepare(
        "SELECT timestamp, nodes_json, edges_json, metrics_json
         FROM graph_snapshot
         WHERE space_id = ?1 AND timestamp BETWEEN ?2 AND ?3
         ORDER BY timestamp ASC LIMIT ?4",
    )?;

    let snapshots = stmt.query_map(
        [
            &space_id.to_string(),
            &start_time.to_string(),
            &end_time.to_string(),
            &limit.to_string(),
        ],
        |row| {
            let timestamp: i64 = row.get(0)?;
            let nodes_json: String = row.get(1)?;
            let edges_json: String = row.get(2)?;
            let metrics_json: String = row.get(3)?;

            let nodes: Vec<GraphNode> = serde_json::from_str(&nodes_json).unwrap_or_default();
            let edges: Vec<GraphEdge> = serde_json::from_str(&edges_json).unwrap_or_default();
            let metrics: GraphMetrics =
                serde_json::from_str(&metrics_json).unwrap_or(GraphMetrics {
                    total_nodes: 0,
                    total_edges: 0,
                    avg_degree: 0.0,
                    communities: 0,
                    growth_rate: 0.0,
                });

            Ok(GraphSnapshot {
                timestamp,
                nodes,
                edges,
                metrics,
            })
        },
    )?;

    let mut result = Vec::new();
    for snapshot in snapshots {
        result.push(snapshot?);
    }

    Ok(result)
}

/// Create a graph milestone
pub fn create_milestone(
    conn: &Connection,
    space_id: Ulid,
    milestone_type: &str,
    title: &str,
    description: &str,
    related_node_ids: Vec<String>,
) -> Result<GraphMilestone, TemporalGraphError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();
    let related_nodes_json = serde_json::to_string(&related_node_ids)
        .map_err(|e| TemporalGraphError::Parse(e.to_string()))?;

    conn.execute(
        "INSERT INTO graph_milestone (id, space_id, timestamp, milestone_type, title, description, related_nodes_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        [
            &id,
            &space_id.to_string(),
            &now.to_string(),
            milestone_type,
            title,
            description,
            &related_nodes_json,
            &now.to_string(),
        ],
    )?;

    Ok(GraphMilestone {
        id,
        timestamp: now,
        milestone_type: milestone_type.to_string(),
        title: title.to_string(),
        description: description.to_string(),
        related_node_ids,
    })
}

/// Get milestones for a time range
pub fn get_milestones(
    conn: &Connection,
    space_id: Ulid,
    start_time: i64,
    end_time: i64,
) -> Result<Vec<GraphMilestone>, TemporalGraphError> {
    let mut stmt = conn.prepare(
        "SELECT id, timestamp, milestone_type, title, description, related_nodes_json
         FROM graph_milestone
         WHERE space_id = ?1 AND timestamp BETWEEN ?2 AND ?3
         ORDER BY timestamp ASC",
    )?;

    let milestones = stmt.query_map(
        [
            &space_id.to_string(),
            &start_time.to_string(),
            &end_time.to_string(),
        ],
        |row| {
            let related_nodes_json: String = row.get(5)?;
            let related_node_ids: Vec<String> =
                serde_json::from_str(&related_nodes_json).unwrap_or_default();

            Ok(GraphMilestone {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                milestone_type: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                related_node_ids,
            })
        },
    )?;

    let mut result = Vec::new();
    for milestone in milestones {
        result.push(milestone?);
    }

    Ok(result)
}

/// Get full graph evolution for a time range
pub fn get_graph_evolution(
    conn: &Connection,
    space_id: Ulid,
    start_time: i64,
    end_time: i64,
    snapshot_limit: u32,
) -> Result<GraphEvolution, TemporalGraphError> {
    let snapshots = get_graph_snapshots(conn, space_id, start_time, end_time, snapshot_limit)?;
    let milestones = get_milestones(conn, space_id, start_time, end_time)?;

    Ok(GraphEvolution {
        time_range: (start_time, end_time),
        snapshots,
        milestones,
    })
}

/// Detect major note creation events (>2000 words)
pub fn detect_major_notes(
    conn: &Connection,
    space_id: Ulid,
) -> Result<Vec<GraphMilestone>, TemporalGraphError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, created_at, content FROM note
         WHERE space_id = ?1 AND deleted = 0 AND LENGTH(content) > 6000
         ORDER BY created_at DESC LIMIT 10",
    )?;

    let milestones = stmt.query_map([space_id.to_string()], |row| {
        let note_id: String = row.get(0)?;
        let title: String = row.get(1)?;
        let created_at: i64 = row.get(2)?;
        let content: String = row.get(3)?;
        let word_count = content.split_whitespace().count();

        Ok(GraphMilestone {
            id: Ulid::new().to_string(),
            timestamp: created_at,
            milestone_type: "major_note".to_string(),
            title: format!("Created: {}", title),
            description: format!("Major note with {} words created", word_count),
            related_node_ids: vec![note_id],
        })
    })?;

    let mut result = Vec::new();
    for milestone in milestones {
        result.push(milestone?);
    }

    Ok(result)
}

// Helper functions

/// Simple community detection using connected components
fn detect_communities(nodes: &[GraphNode], edges: &[GraphEdge]) -> u32 {
    use std::collections::{HashMap, HashSet};

    let mut adjacency: HashMap<String, HashSet<String>> = HashMap::new();

    for node in nodes {
        adjacency
            .entry(node.id.clone())
            .or_insert_with(HashSet::new);
    }

    for edge in edges {
        adjacency
            .entry(edge.source_id.clone())
            .or_insert_with(HashSet::new)
            .insert(edge.target_id.clone());
        adjacency
            .entry(edge.target_id.clone())
            .or_insert_with(HashSet::new)
            .insert(edge.source_id.clone());
    }

    let mut visited = HashSet::new();
    let mut communities = 0;

    for node in nodes {
        if !visited.contains(&node.id) {
            communities += 1;
            let mut stack = vec![node.id.clone()];

            while let Some(current) = stack.pop() {
                if visited.insert(current.clone()) {
                    if let Some(neighbors) = adjacency.get(&current) {
                        for neighbor in neighbors {
                            if !visited.contains(neighbor) {
                                stack.push(neighbor.clone());
                            }
                        }
                    }
                }
            }
        }
    }

    communities
}

/// Calculate growth rate (new nodes per day)
fn calculate_growth_rate(
    conn: &Connection,
    space_id: Ulid,
    days: i64,
) -> Result<f64, TemporalGraphError> {
    let now = Utc::now().timestamp();
    let start_time = now - (days * 86400);

    let mut stmt = conn.prepare(
        "SELECT COUNT(*) FROM note
         WHERE space_id = ?1 AND created_at >= ?2",
    )?;

    let count: i64 = stmt.query_row([&space_id.to_string(), &start_time.to_string()], |row| {
        row.get(0)
    })?;

    Ok(count as f64 / days as f64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_community_detection() {
        let nodes = vec![
            GraphNode {
                id: "1".to_string(),
                node_type: "note".to_string(),
                title: "Node 1".to_string(),
                created_at: 0,
                updated_at: 0,
                word_count: None,
                status: None,
            },
            GraphNode {
                id: "2".to_string(),
                node_type: "note".to_string(),
                title: "Node 2".to_string(),
                created_at: 0,
                updated_at: 0,
                word_count: None,
                status: None,
            },
        ];

        let edges = vec![GraphEdge {
            id: "edge1".to_string(),
            source_id: "1".to_string(),
            target_id: "2".to_string(),
            edge_type: "backlink".to_string(),
            created_at: 0,
            weight: 1.0,
        }];

        let communities = detect_communities(&nodes, &edges);
        assert_eq!(communities, 1); // Both nodes should be in one community
    }
}
