    if current_version < 15 {
        log::info!("[db] Migrating to version 15 - Add updated_at to Task/Project");
        tx.execute_batch(
            "
            ALTER TABLE task ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE project ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

            -- Update existing records to set updated_at to now (approx) or 0
            UPDATE task SET updated_at = strftime('%s', 'now');
            UPDATE project SET updated_at = strftime('%s', 'now');

            -- Note: space_id on sync_conflict was already added in V10, so we don't add it here.
            -- If it was missing in some dev versions, we rely on V10 being correct in this codebase.

            INSERT INTO schema_version (version) VALUES (15);
            ",
        )?;
    }
