use core_rs::versioning::{create_snapshot, get_snapshots, restore_snapshot};
use tempfile::tempdir;

#[test]
fn test_versioning() {
    let dir = tempdir().unwrap();
    let vault_path = dir.path().to_str().unwrap();
    let note_id = "test-note-id";
    let content1 = b"hello, world!";
    let content2 = b"hello, universe!";

    create_snapshot(vault_path, note_id, content1).unwrap();
    let snapshots1 = get_snapshots(vault_path, note_id).unwrap();
    assert_eq!(snapshots1.len(), 1);

    create_snapshot(vault_path, note_id, content2).unwrap();
    let snapshots2 = get_snapshots(vault_path, note_id).unwrap();
    assert_eq!(snapshots2.len(), 2);

    let restored_content1 = restore_snapshot(vault_path, note_id, &snapshots2[0]).unwrap();
    let restored_content2 = restore_snapshot(vault_path, note_id, &snapshots2[1]).unwrap();
    assert!(
        (content1 == restored_content1.as_slice() && content2 == restored_content2.as_slice())
            || (content1 == restored_content2.as_slice()
                && content2 == restored_content1.as_slice())
    );
}
