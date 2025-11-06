use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Block {
    pub id: String,
    pub content: String,
}

pub fn generate_block_id() -> String {
    let id = Ulid::new().to_string();
    log::info!("[editor] Generated block ID: {}", id);
    id
}

pub fn parse_markdown(content: &str) -> Vec<Block> {
    log::info!("[editor] Parsing markdown content");
    let mut blocks = Vec::new();
    for line in content.lines() {
        blocks.push(Block {
            id: generate_block_id(),
            content: line.to_string(),
        });
    }
    blocks
}

pub fn serialize_markdown(blocks: &[Block]) -> String {
    log::info!("[editor] Serializing markdown content");
    let mut content = String::new();
    for block in blocks {
        content.push_str(&block.content);
        content.push('\n');
    }
    content
}
