use core_rs::sync::{sync_projects, sync_tasks};

#[test]
fn test_sync_placeholders() {
    assert!(sync_tasks().is_err());
    assert!(sync_projects().is_err());
}
