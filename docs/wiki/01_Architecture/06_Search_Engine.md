# Search Engine Architecture

Noteece provides a powerful, sub-millisecond search experience that respects the encrypted nature of the data. To achieve this, we use a **Hybrid Search Architecture** combining SQLite's FTS5 (Full-Text Search) with specialized regex-based filtering.

## 1. The Challenge

1.  **Encryption:** Content is encrypted at rest. Standard SQLite FTS cannot index encrypted blobs.
2.  **Performance:** Searching 10,000 notes with regex in Rust is fast, but doing it in SQL is faster for simple text.
3.  **Complex Queries:** Users want `tag:work status:active "exact phrase"`.

## 2. The Solution: Two-Tier Indexing

### Tier 1: The Encrypted Content
The actual Markdown content (`content_md`) is stored as an encrypted blob in the `note` table.
- *Status:* Opaque to the database engine.
- *Searchability:* Zero (via SQL).

### Tier 2: The Decrypted Search Index (FTS5)
To allow search, we maintain a **shadow FTS5 table** (`fts_note`).
- **When:** On `save()`, the application decrypts the content (in memory), tokenizes it, and updates the FTS index.
- **Security Trade-off:** The FTS index contains tokenized plaintext. However, this index lives inside the *same* SQLCipher-encrypted database file.
    - If the DB is locked (file on disk), the index is encrypted.
    - If the DB is unlocked (app running), the index is queryable.
    - *Mitigation:* We do not store the full content in the FTS table (Contentless or external content mode), only the index tokens, minimizing the leak surface if memory is dumped.

## 3. Query Parsing Logic

The search bar accepts a rich syntax. The backend parses this string into a structured `SearchQuery` object.

| Syntax | Example | Meaning |
| :--- | :--- | :--- |
| `term` | `apple` | Contains "apple" (FTS) |
| `"phrase"` | `"apple pie"` | Exact phrase match |
| `tag:` | `tag:work` | Has tag "work" (Relational Join) |
| `status:` | `status:active` | Note/Task status is active |
| `due:` | `due:today` | Due date is <= today |
| `has:` | `has:task` | Note contains a task |
| `-term` | `-banana` | Does NOT contain "banana" |

### Execution Flow

1.  **Parse:** The query string is parsed by the `advanced.rs` module.
2.  **Build SQL:**
    - Text terms are converted to FTS syntax: `fts_note MATCH 'apple AND "apple pie" NOT banana'`.
    - Filter terms are converted to standard SQL WHERE clauses: `AND note.id IN (SELECT note_id FROM note_tags WHERE tag_id = ...)`
3.  **Execute:** The query runs against SQLite.
4.  **Rank:** Results are ordered by `rank` (BM25 algorithm provided by FTS5), boosting matches in `title` over `body`.

## 4. Snippet Generation

Once results are found, we need to show the user *where* the match occurred.
- We cannot ask SQLite for snippets because the FTS table doesn't have the original text (contentless).
- **Process:**
    1.  Fetch `rowid` from FTS.
    2.  Fetch encrypted `content_md` from `note` table.
    3.  Decrypt in Rust.
    4.  Locate the term offsets.
    5.  Extract a window (e.g., 50 chars before/after).
    6.  Highlight: `...found the **apple** in the...`

## 5. Mobile Considerations

On Android/iOS, we use the same SQLite database. The FTS5 extension is standard in modern Android/iOS SQLite builds (or bundled via `expo-sqlite`). This ensures 100% feature parity between Desktop and Mobile search.

## 6. Future Improvements

- **Vector Search (Embeddings):** We plan to add a local LLM (like BERT or basic Word2Vec) to generate embeddings for notes, stored in a `vec_note` table (using `sqlite-vss` or similar). This would allow "Semantic Search" (searching for "fruit" finds "apple").

---

**References:**
- [SQLite FTS5 Extension](https://www.sqlite.org/fts5.html)
- [BM25 Ranking Function](https://en.wikipedia.org/wiki/Okapi_BM25)
