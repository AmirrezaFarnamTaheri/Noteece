
/// Builder for complex task queries
#[derive(Default)]
pub struct TaskQueryBuilder {
    priority: Option<String>,
    completed: Option<bool>,
    search_term: Option<String>,
    due_before: Option<i64>,
}

impl TaskQueryBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn priority(mut self, priority: &str) -> Self {
        self.priority = Some(priority.to_string());
        self
    }

    pub fn completed(mut self, completed: bool) -> Self {
        self.completed = Some(completed);
        self
    }

    pub fn search(mut self, term: &str) -> Self {
        self.search_term = Some(term.to_string());
        self
    }

    pub fn due_before(mut self, timestamp: i64) -> Self {
        self.due_before = Some(timestamp);
        self
    }

    /// Build the SQL WHERE clause and parameters
    /// Note: This is a simplified version for the test audit.
    /// In a real implementation, this would return (String, Vec<Box<dyn ToSql>>)
    pub fn build(self) -> String {
        let mut conditions = Vec::new();

        if self.priority.is_some() {
            conditions.push("priority = ?");
        }

        if self.completed.is_some() {
            conditions.push("is_completed = ?");
        }

        if self.search_term.is_some() {
            conditions.push("title LIKE ?");
        }

        if self.due_before.is_some() {
            conditions.push("due_at < ?");
        }

        if conditions.is_empty() {
            return String::new();
        }

        format!("WHERE {}", conditions.join(" AND "))
    }
}
