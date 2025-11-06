use thiserror::Error;

#[derive(Error, Debug)]
pub enum SyncError {
    #[error("Not yet implemented")]
    NotImplemented,
}

pub fn sync_tasks() -> Result<(), SyncError> {
    Err(SyncError::NotImplemented)
}

pub fn sync_projects() -> Result<(), SyncError> {
    Err(SyncError::NotImplemented)
}
