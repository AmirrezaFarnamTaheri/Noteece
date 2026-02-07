use core_rs::blob::{retrieve_blob, store_blob, retrieve_chunk, store_chunk};
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

#[test]
fn test_blob_chunking_large_payload() {
    let dir = tempdir().unwrap();
    let vault_path = dir.path().to_str().unwrap();
    let mk = b"test-master-key-that-is-32-bytes";

    // Create a 10KB payload (exceeds 4KB chunk size)
    let content: Vec<u8> = (0..10240).map(|i| (i % 255) as u8).collect();

    let hex_hash = store_blob(vault_path, mk, &content).unwrap();
    let retrieved_content = retrieve_blob(vault_path, mk, &hex_hash).unwrap();

    assert_eq!(content, retrieved_content);

    // Verify chunks exist individually (implementation detail test)
    // The manifest should contain 3 lines (4096 + 4096 + 2048)
    let manifest_path = dir.path().join("objects").join(&hex_hash[0..2]).join(&hex_hash[2..]);
    let manifest = std::fs::read_to_string(manifest_path).unwrap();
    let chunks: Vec<&str> = manifest.lines().collect();

    assert_eq!(chunks.len(), 3, "Should be split into 3 chunks");

    // Verify we can retrieve the first chunk independently
    let chunk0 = retrieve_chunk(vault_path, mk, chunks[0]).unwrap();
    assert_eq!(chunk0.len(), 4096);
    assert_eq!(chunk0[0..10], content[0..10]);
}
