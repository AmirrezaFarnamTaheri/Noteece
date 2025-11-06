use rusqlite::{Connection, Result};
use thiserror::Error;

use serde_json;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("Message: {0}")]
    Message(String),
    #[error("Serde JSON error: {0}")]
    SerdeJson(#[from] serde_json::Error),
}

pub fn migrate(conn: &mut Connection) -> Result<(), DbError> {
    log::info!("[db] Starting migration");
    let tx = conn.transaction()?;

    tx.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        );
        ",
    )?;

    let current_version: i64 = {
        let mut stmt = tx.prepare("SELECT MAX(version) FROM schema_version")?;
        let mut rows = stmt.query([])?;
        match rows.next()? {
            Some(row) => row.get(0).unwrap_or(0),
            None => 0,
        }
    };
    log::info!("[db] Current schema version: {}", current_version);

    if current_version < 1 {
        log::info!("[db] Migrating to version 1");
        tx.execute_batch(
            "
            CREATE TABLE space(
              id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT,
              enabled_modes_json TEXT NOT NULL DEFAULT '[]'
            );

            CREATE TABLE note(
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
              title TEXT NOT NULL DEFAULT '', content_md TEXT NOT NULL,
              created_at INTEGER NOT NULL, modified_at INTEGER NOT NULL,
              is_trashed INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE task(
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
              note_id TEXT REFERENCES note(id), project_id TEXT REFERENCES project(id),
              parent_task_id TEXT REFERENCES task(id),
              title TEXT NOT NULL,
              description TEXT,
              status TEXT NOT NULL CHECK(status IN('inbox','next','in_progress','waiting','done','cancelled')),
              due_at INTEGER, start_at INTEGER, completed_at INTEGER,
              priority INTEGER CHECK(priority BETWEEN 1 AND 4),
              estimate_minutes INTEGER, recur_rule TEXT,
              context TEXT, area TEXT
            );

            CREATE TABLE task_recur_exdate(
              task_id TEXT REFERENCES task(id), exdate INTEGER NOT NULL,
              PRIMARY KEY(task_id, exdate)
            );

            CREATE TABLE project(
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
              title TEXT NOT NULL, goal_outcome TEXT,
              status TEXT NOT NULL CHECK(status IN('proposed','active','blocked','done','archived')),
              confidence INTEGER, start_at INTEGER, target_end_at INTEGER
            );

            CREATE TABLE tag(
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
              name TEXT NOT NULL, color TEXT, UNIQUE(space_id, name)
            );

            CREATE TABLE note_tags(note_id TEXT REFERENCES note(id), tag_id TEXT REFERENCES tag(id), PRIMARY KEY(note_id, tag_id));
            CREATE TABLE task_tags(task_id TEXT REFERENCES task(id), tag_id TEXT REFERENCES tag(id), PRIMARY KEY(task_id, tag_id));

            CREATE TABLE link(source_note_id TEXT, target_note_id TEXT,
              PRIMARY KEY(source_note_id, target_note_id));

            CREATE TABLE note_meta(note_id TEXT, key TEXT, value TEXT,
              PRIMARY KEY(note_id, key));

            CREATE TABLE person(
              id TEXT PRIMARY KEY, space_id TEXT,
              name TEXT, email TEXT, org TEXT
            );

            CREATE TABLE task_people(task_id TEXT, person_id TEXT,
              PRIMARY KEY(task_id, person_id));

            CREATE TABLE project_milestone(
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project(id),
              title TEXT, due_at INTEGER, status TEXT
            );

            CREATE TABLE project_dependency(
              project_id TEXT NOT NULL REFERENCES project(id),
              depends_on_project_id TEXT NOT NULL REFERENCES project(id),
              PRIMARY KEY(project_id, depends_on_project_id)
            );

            CREATE TABLE project_risk(
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project(id),
              description TEXT, impact TEXT, likelihood TEXT, mitigation TEXT,
              owner_person_id TEXT REFERENCES person(id)
            );

            CREATE TABLE project_update(
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project(id),
              when_at INTEGER, health TEXT, summary TEXT
            );

            CREATE TABLE saved_search(
              id TEXT PRIMARY KEY, space_id TEXT REFERENCES space(id),
              title TEXT NOT NULL, query_string TEXT NOT NULL,
              scope TEXT NOT NULL CHECK(scope IN('note','project','space','vault_all'))
            );

            CREATE INDEX task_due   ON task(due_at)   WHERE status IN('inbox','next','in_progress','waiting');
            CREATE INDEX task_start ON task(start_at);
            CREATE INDEX note_mod   ON note(modified_at DESC);
            CREATE INDEX meta_kv    ON note_meta(key, value);

            CREATE VIRTUAL TABLE fts_note USING fts5(
              title, content_md, note_id UNINDEXED,
              tokenize='porter unicode61 remove_diacritics 2'
            );

            INSERT INTO schema_version (version) VALUES (1);
            ",
        )?;
    }
    if current_version < 2 {
        log::info!("[db] Migrating to version 2");
        tx.execute_batch(
            "
            CREATE TABLE knowledge_card (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL REFERENCES note(id),
                deck_id TEXT,
                state TEXT NOT NULL CHECK(state IN('new', 'learning', 'review', 'relearning')),
                due_at INTEGER NOT NULL,
                stability REAL NOT NULL,
                difficulty REAL NOT NULL,
                lapses INTEGER NOT NULL,
                revision_history_json TEXT NOT NULL
            );

            CREATE TABLE review_log (
                id TEXT PRIMARY KEY,
                card_id TEXT NOT NULL REFERENCES knowledge_card(id),
                review_at INTEGER NOT NULL,
                rating INTEGER NOT NULL,
                state TEXT NOT NULL,
                due_at INTEGER NOT NULL,
                stability REAL NOT NULL,
                difficulty REAL NOT NULL,
                lapses INTEGER NOT NULL
            );

            INSERT INTO schema_version (version) VALUES (2);
            ",
        )?;
    }
    if current_version < 3 {
        log::info!("[db] Migrating to version 3");
        tx.execute_batch(
            "
            CREATE TABLE space_people (
                space_id TEXT NOT NULL REFERENCES space(id),
                person_id TEXT NOT NULL REFERENCES person(id),
                role TEXT NOT NULL CHECK(role IN('owner', 'admin', 'member', 'guest')),
                PRIMARY KEY(space_id, person_id)
            );

            INSERT INTO schema_version (version) VALUES (3);
            ",
        )?;
    }
    if current_version < 4 {
        log::info!("[db] Migrating to version 4");
        tx.execute_batch(
            "
            CREATE TABLE form_template (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                name TEXT NOT NULL,
                fields_json TEXT NOT NULL
            );

            INSERT INTO schema_version (version) VALUES (4);
            ",
        )?;
    }
    if current_version < 5 {
        log::info!("[db] Migrating to version 5");
        tx.execute_batch(
            "
            CREATE TABLE time_entry (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                task_id TEXT REFERENCES task(id),
                project_id TEXT REFERENCES project(id),
                note_id TEXT REFERENCES note(id),
                description TEXT,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                duration_seconds INTEGER,
                is_running INTEGER NOT NULL DEFAULT 0,
                CHECK(
                    (task_id IS NOT NULL AND project_id IS NULL AND note_id IS NULL) OR
                    (task_id IS NULL AND project_id IS NOT NULL AND note_id IS NULL) OR
                    (task_id IS NULL AND project_id IS NULL AND note_id IS NOT NULL)
                )
            );

            CREATE INDEX time_entry_task ON time_entry(task_id) WHERE task_id IS NOT NULL;
            CREATE INDEX time_entry_project ON time_entry(project_id) WHERE project_id IS NOT NULL;
            CREATE INDEX time_entry_started ON time_entry(started_at DESC);
            CREATE INDEX time_entry_running ON time_entry(is_running) WHERE is_running = 1;

            INSERT INTO schema_version (version) VALUES (5);
            ",
        )?;
    }
    tx.commit()?;
    log::info!("[db] Migration finished");
    Ok(())
}
