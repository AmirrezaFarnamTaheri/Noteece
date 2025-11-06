use crate::note::create_note;
use gray_matter::engine::YAML;
use gray_matter::Matter;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::Path;
use thiserror::Error;
use ulid::Ulid;
use walkdir::WalkDir;
use zip::{write::FileOptions, ZipArchive, ZipWriter};

#[derive(Error, Debug)]
pub enum ImportError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Unsupported format")]
    UnsupportedFormat,
    #[error("Database error: {0}")]
    Db(#[from] crate::db::DbError),
    #[error("Zip error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("Gray Matter parse error: {0}")]
    GrayMatter(String),
}

pub fn import_from_obsidian(
    conn: &Connection,
    space_id: Ulid,
    path: &str,
) -> Result<(), ImportError> {
    log::info!("[import] Starting Obsidian import from path: {}", path);
    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path = entry.path();
            if let Some("md") = path.extension().and_then(|s| s.to_str()) {
                log::info!("[import] Importing file: {:?}", path);
                let content = std::fs::read_to_string(path)?;
                let matter = Matter::<YAML>::new();
                let result = matter.parse(&content);
                let title = path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled");
                create_note(conn, &space_id.to_string(), title, &result.content)?;
            }
        }
    }
    log::info!("[import] Finished Obsidian import");
    Ok(())
}

pub fn import_from_notion(
    conn: &Connection,
    space_id: Ulid,
    path: &str,
) -> Result<(), ImportError> {
    log::info!("[import] Starting Notion import from path: {}", path);
    let file = fs::File::open(path)?;
    let mut archive = ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        if let Some(outpath) = file.enclosed_name() {
            if outpath.extension().and_then(|s| s.to_str()) == Some("md") {
                log::info!("[import] Importing file: {:?}", outpath);
                let mut content = String::new();
                file.read_to_string(&mut content)?;
                let matter = Matter::<YAML>::new();
                let result = matter.parse(&content);
                let title = outpath
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled");
                create_note(conn, &space_id.to_string(), title, &result.content)?;
            }
        }
    }
    log::info!("[import] Finished Notion import");
    Ok(())
}

// Export functionality

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportData {
    pub notes: Vec<ExportNote>,
    pub tasks: Vec<ExportTask>,
    pub projects: Vec<ExportProject>,
    pub tags: Vec<ExportTag>,
    pub metadata: ExportMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportTask {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub deadline: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportProject {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportTag {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportMetadata {
    pub version: String,
    pub exported_at: i64,
    pub space_id: String,
    pub item_count: usize,
}

/// Export space data to JSON
///
/// SECURITY: This function decrypts note content before export to prevent leaking
/// encrypted ciphertext in the exported JSON. If decryption fails, the content
/// field is cleared to avoid exporting unusable data.
pub fn export_to_json(
    conn: &Connection,
    space_id: Ulid,
    dek: &[u8],
) -> Result<String, ImportError> {
    let mut export_data = gather_export_data(conn, space_id, dek)?;

    // Decrypt note contents before serializing to prevent exporting ciphertext
    for note in &mut export_data.notes {
        // Attempt decryption; if it fails, clear content to avoid leaking unusable ciphertext
        match crate::crypto::decrypt_string(&note.content, dek) {
            Ok(plaintext) => {
                note.content = plaintext;
            }
            Err(e) => {
                // Log the error and remove content to prevent exporting unusable ciphertext
                log::warn!(
                    "Failed to decrypt note {} during export: {}. Content will be omitted.",
                    note.id,
                    e
                );
                note.content.clear();
            }
        }
    }

    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| ImportError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
    Ok(json)
}

/// Export space data to ZIP archive
pub fn export_to_zip(
    conn: &Connection,
    space_id: Ulid,
    output_path: &Path,
    dek: &[u8],
) -> Result<(), ImportError> {
    let file = fs::File::create(output_path)?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    // Create dedicated notes directory in the archive
    zip.add_directory("notes/", options)?;

    // Export notes as markdown files
    let mut stmt = conn.prepare(
        "SELECT id, title, encrypted_content, created_at
         FROM notes
         WHERE space_id = ?1",
    )?;

    let notes = stmt.query_map([space_id.to_string()], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i64>(3)?,
        ))
    })?;

    for note in notes {
        let (id, title, enc_content, created_at) = note?;
        // Use unique filename with ID prefix to prevent collisions
        let safe_title = sanitize_filename(&title);
        let filename = format!("notes/{}_{}.md", id, safe_title);

        zip.start_file(&filename, options)?;

        // Decrypt content before export
        let decrypted = match crate::crypto::decrypt_string(&enc_content, dek) {
            Ok(s) => s,
            Err(e) => {
                // Write placeholder with error to avoid silent corruption
                writeln!(zip, "---")?;
                writeln!(zip, "id: {}", id)?;
                writeln!(zip, "title: {}", title)?;
                writeln!(zip, "created_at: {}", created_at)?;
                writeln!(zip, "export_warning: failed to decrypt content: {}", e)?;
                writeln!(zip, "---")?;
                writeln!(zip)?;
                continue;
            }
        };

        // Write frontmatter
        writeln!(zip, "---")?;
        writeln!(zip, "id: {}", id)?;
        writeln!(zip, "title: {}", title)?;
        writeln!(zip, "created_at: {}", created_at)?;
        writeln!(zip, "---")?;
        writeln!(zip)?;

        // Write decrypted content
        write!(zip, "{}", decrypted)?;
    }

    // Export tasks as JSON
    let tasks_json = export_tasks_json(conn, space_id)?;
    zip.start_file("tasks.json", options)?;
    write!(zip, "{}", tasks_json)?;

    // Export projects as JSON
    let projects_json = export_projects_json(conn, space_id)?;
    zip.start_file("projects.json", options)?;
    write!(zip, "{}", projects_json)?;

    // Export metadata
    let metadata = ExportMetadata {
        version: "1.0.0".to_string(),
        exported_at: chrono::Utc::now().timestamp(),
        space_id: space_id.to_string(),
        item_count: 0, // Would count all items
    };
    let metadata_json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| ImportError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
    zip.start_file("metadata.json", options)?;
    write!(zip, "{}", metadata_json)?;

    zip.finish()?;
    Ok(())
}

/// Export space data to Markdown files
pub fn export_to_markdown(
    conn: &Connection,
    space_id: Ulid,
    output_dir: &Path,
    dek: &[u8],
) -> Result<(), ImportError> {
    fs::create_dir_all(output_dir)?;

    // Export notes
    let notes_dir = output_dir.join("notes");
    fs::create_dir_all(&notes_dir)?;

    let mut stmt = conn.prepare(
        "SELECT id, title, encrypted_content, created_at
         FROM notes
         WHERE space_id = ?1",
    )?;

    let notes = stmt.query_map([space_id.to_string()], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i64>(3)?,
        ))
    })?;

    for note in notes {
        let (id, title, enc_content, created_at) = note?;
        let filename = format!("{}.md", sanitize_filename(&title));
        let filepath = notes_dir.join(&filename);

        let mut file = fs::File::create(filepath)?;

        // Decrypt content before export
        let decrypted = match crate::crypto::decrypt_string(&enc_content, dek) {
            Ok(s) => s,
            Err(e) => {
                // Write placeholder with error to avoid silent corruption
                writeln!(file, "---")?;
                writeln!(file, "id: {}", id)?;
                writeln!(file, "title: {}", title)?;
                writeln!(file, "created_at: {}", created_at)?;
                writeln!(file, "export_warning: failed to decrypt content: {}", e)?;
                writeln!(file, "---")?;
                writeln!(file)?;
                continue;
            }
        };

        // Write frontmatter
        writeln!(file, "---")?;
        writeln!(file, "id: {}", id)?;
        writeln!(file, "title: {}", title)?;
        writeln!(file, "created_at: {}", created_at)?;
        writeln!(file, "---")?;
        writeln!(file)?;

        // Write decrypted content
        write!(file, "{}", decrypted)?;
    }

    // Export tasks
    let tasks_json = export_tasks_json(conn, space_id)?;
    fs::write(output_dir.join("tasks.json"), tasks_json)?;

    // Export projects
    let projects_json = export_projects_json(conn, space_id)?;
    fs::write(output_dir.join("projects.json"), projects_json)?;

    Ok(())
}

// Helper functions

fn gather_export_data(
    conn: &Connection,
    space_id: Ulid,
    dek: &[u8],
) -> Result<ExportData, ImportError> {
    let mut notes = Vec::new();
    let mut tasks = Vec::new();
    let mut projects = Vec::new();

    // Gather notes
    let mut stmt = conn.prepare(
        "SELECT id, title, encrypted_content, created_at, updated_at
         FROM notes
         WHERE space_id = ?1",
    )?;

    let note_rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(ExportNote {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            tags: vec![], // Would fetch tags
        })
    })?;

    for note in note_rows {
        notes.push(note?);
    }

    // Gather tasks
    let mut stmt = conn.prepare(
        "SELECT id, title, description, status, priority, deadline, created_at, updated_at
         FROM tasks
         WHERE space_id = ?1",
    )?;

    let task_rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(ExportTask {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2).ok(),
            status: row.get(3)?,
            priority: row.get(4).ok(),
            deadline: row.get(5).ok(),
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;

    for task in task_rows {
        tasks.push(task?);
    }

    // Gather projects
    let mut stmt = conn.prepare(
        "SELECT id, name, description, status, created_at, updated_at
         FROM projects
         WHERE space_id = ?1",
    )?;

    let project_rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(ExportProject {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2).ok(),
            status: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    for project in project_rows {
        projects.push(project?);
    }

    let metadata = ExportMetadata {
        version: "1.0.0".to_string(),
        exported_at: chrono::Utc::now().timestamp(),
        space_id: space_id.to_string(),
        item_count: notes.len() + tasks.len() + projects.len(),
    };

    Ok(ExportData {
        notes,
        tasks,
        projects,
        tags: vec![],
        metadata,
    })
}

fn export_tasks_json(conn: &Connection, space_id: Ulid) -> Result<String, ImportError> {
    let mut tasks = Vec::new();

    let mut stmt = conn.prepare(
        "SELECT id, title, description, status, priority, deadline, created_at, updated_at
         FROM tasks
         WHERE space_id = ?1",
    )?;

    let rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(ExportTask {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2).ok(),
            status: row.get(3)?,
            priority: row.get(4).ok(),
            deadline: row.get(5).ok(),
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;

    for row in rows {
        tasks.push(row?);
    }

    serde_json::to_string_pretty(&tasks)
        .map_err(|e| ImportError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))
}

fn export_projects_json(conn: &Connection, space_id: Ulid) -> Result<String, ImportError> {
    let mut projects = Vec::new();

    let mut stmt = conn.prepare(
        "SELECT id, name, description, status, created_at, updated_at
         FROM projects
         WHERE space_id = ?1",
    )?;

    let rows = stmt.query_map([space_id.to_string()], |row| {
        Ok(ExportProject {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2).ok(),
            status: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    for row in rows {
        projects.push(row?);
    }

    serde_json::to_string_pretty(&projects)
        .map_err(|e| ImportError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => c,
        })
        .collect()
}
