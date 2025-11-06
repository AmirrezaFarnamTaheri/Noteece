use core_rs::blob::{retrieve_blob, store_blob};
use tempfile::tempdir;

#[test]
fn test_blob_storage() {
    let dir = tempdir().unwrap();
    let vault_path = dir.path().to_str().unwrap();
    let mk = b"test-master-key-that-is-32-bytes";
    let content = b"hello, world!";

    let hex_hash = store_blob(vault_path, mk, content).unwrap();
    let retrieved_content = retrieve_blob(vault_path, mk, &hex_hash).unwrap();

    assert_eq!(content, retrieved_content.as_slice());
}
