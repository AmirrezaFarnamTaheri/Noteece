# Import & Export Specifications

Noteece is committed to **Data Sovereignty**. You should always be able to get your data in and out easily.

## Export Formats

### 1. JSON (Full Dump)

A complete, machine-readable dump of the database. Useful for backups or migration to other tools.

- **Structure:**
  ```json
  {
    "version": 1,
    "exported_at": "2023-10-27T10:00:00Z",
    "spaces": [...],
    "notes": [
      {
        "id": "01HD...",
        "title": "My Note",
        "content": "# Markdown...",
        "tags": ["journal"],
        "created_at": 1698300000
      }
    ],
    "tasks": [...],
    "projects": [...]
  }
  ```

### 2. Markdown (Vault Export)

Designed for interoperability with other PKM tools (Obsidian, Logseq).

- **Directory Structure:**
  - Folders represent `Spaces` or `Tags` (User selectable).
  - Files are standard `.md` files.
  - Frontmatter (YAML) preserves metadata like `id`, `created_at`, `status`.

  ```yaml
  ---
  id: 01HD...
  title: My Note
  tags: [journal]
  created: 2023-10-27
  ---
  # Content...
  ```

### 3. ZIP Archive

A comprehensive backup that includes:

- The `database.json` dump.
- The `blobs/` directory (images/attachments) decrypted.

## Import Capabilities

### 1. Obsidian Vaults

Noteece can import an existing Obsidian vault.

- **Conversion:**
  - Folders are converted to **Tags** (since Noteece uses a flat, tag-based hierarchy).
  - `[[Links]]` remain as WikiLinks.
  - `#tags` are parsed and indexed.
  - Attachments are imported into the Blob store.

### 2. Notion Export (ZIP)

Supports importing the standard "Export to Markdown & CSV" from Notion.

- **Mapping:**
  - Notion "Pages" -> Noteece **Notes**.
  - Notion "Databases" -> Noteece **Projects** (best effort mapping).
  - Properties -> YAML Frontmatter.

### 3. CSV (Tasks)

Import tasks from Todoist, TickTick, or generic CSVs.

- **Required Columns:** `Title`.
- **Optional Columns:** `Due Date`, `Priority`, `Description`, `Status`.
