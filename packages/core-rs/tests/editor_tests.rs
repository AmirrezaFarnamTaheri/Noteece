use core_rs::editor::{generate_block_id, parse_markdown, serialize_markdown};
use ulid::Ulid;

#[test]
fn test_generate_block_id() {
    let id = generate_block_id();
    assert!(Ulid::from_string(&id).is_ok());
}

#[test]
fn test_markdown_parsing() {
    let content = "hello\nworld";
    let blocks = parse_markdown(content);
    assert_eq!(blocks.len(), 2);
    assert_eq!(blocks[0].content, "hello");
    assert_eq!(blocks[1].content, "world");
}

#[test]
fn test_markdown_serialization() {
    let blocks = vec![
        core_rs::editor::Block {
            id: generate_block_id(),
            content: "hello".to_string(),
        },
        core_rs::editor::Block {
            id: generate_block_id(),
            content: "world".to_string(),
        },
    ];
    let content = serialize_markdown(&blocks);
    assert_eq!(content, "hello\nworld\n");
}
