# Hybrid Search Engine

## Overview

Search is a critical feature for a "Second Brain". Noteece provides a fast, privacy-respecting search engine that works seamlessly with the encrypted database.

## Architecture

The search system handles the unique constraint of **SQLCipher**. Since the database file is encrypted, an external search indexer (like Elasticsearch or a standard file crawler) cannot read the content. The search must happen _inside_ the encrypted boundary or within the application memory.

Noteece uses a **Hybrid Strategy**:

### 1. FTS5 (Full-Text Search)

**Primary Engine.**
SQLite's FTS5 extension provides a virtual table module that allows for efficient full-text searching.

- **Setup:** A virtual table `note_fts` is created. Triggers on the `note` table automatically update this index whenever a note is inserted, updated, or deleted.
- **Query:** `MATCH` queries are used for extreme speed.
- **Stemming:** Uses the Porter stemming algorithm (via `porter` tokenizer) so that searching for "run" matches "running", "ran", etc.

**Constraint:** The `fts5` feature is sometimes incompatible with certain SQLCipher builds depending on the platform and linking strategy.

### 2. Fallback Logic (The "Hybrid" Part)

To ensure robustness across all platforms (especially where FTS5 might fail to build or load), `core-rs` implements a runtime check.

```rust
// Simplified Logic
fn search(query: &str) -> Result<Vec<Note>> {
    if is_fts_available() {
        // FAST: Use FTS5 MATCH
        return db.query("SELECT * FROM note_fts WHERE content MATCH ?", [query]);
    } else {
        // ROBUST: Fallback to standard LIKE
        // Slower, but guaranteed to work.
        // SQLCipher transparently decrypts pages in memory, so LIKE works on plaintext.
        return db.query("SELECT * FROM note WHERE content LIKE ?", [%query%]);
    }
}
```

## Advanced Search Syntax

The search parser (`search.rs`) supports advanced filters beyond simple text matching.

| Filter     | Description              | Example                               |
| :--------- | :----------------------- | :------------------------------------ |
| `tag:`     | Filter by tag            | `tag:journal`                         |
| `created:` | Filter by creation date  | `created:today`, `created:2023-01-01` |
| `due:`     | Filter tasks by due date | `due:tomorrow`                        |
| `is:`      | Boolean flags            | `is:done`, `is:todo`                  |
| `space:`   | Scope to specific space  | `space:work`                          |

## Indexing Encrypted Content

A common question is: _"How does FTS index encrypted data?"_

1.  **At Rest:** The `note_fts` table (like all tables) is stored on encrypted pages in the SQLite file. It is essentially random noise on disk.
2.  **At Runtime:** When the app provides the correct key, SQLCipher decrypts pages into memory buffers.
3.  **Indexing:** The FTS engine reads/writes these _decrypted memory buffers_.
4.  **Result:** Search works normally for the authenticated user, but the index is completely unreadable to an attacker without the key.
