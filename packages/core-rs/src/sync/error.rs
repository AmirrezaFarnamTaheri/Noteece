#[derive(Debug)]
pub enum SyncError {
    DatabaseError(String),
    NetworkError(String),
    EncryptionError(String),
    ConflictError(String),
    InvalidData(String),
}

impl std::fmt::Display for SyncError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SyncError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            SyncError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            SyncError::EncryptionError(msg) => write!(f, "Encryption error: {}", msg),
            SyncError::ConflictError(msg) => write!(f, "Conflict error: {}", msg),
            SyncError::InvalidData(msg) => write!(f, "Invalid data: {}", msg),
        }
    }
}

impl std::error::Error for SyncError {}

impl From<rusqlite::Error> for SyncError {
    fn from(err: rusqlite::Error) -> Self {
        SyncError::DatabaseError(err.to_string())
    }
}
