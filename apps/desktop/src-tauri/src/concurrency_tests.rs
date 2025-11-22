#[cfg(test)]
mod tests {
    use crate::db_pool::EncryptedConnectionManager;
    use r2d2::Pool;
    use std::path::Path;
    use std::sync::Arc;
    use std::thread;
    use std::time::Duration;
    use tempfile::tempdir;

    #[test]
    fn test_concurrent_read_write() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let dek = [0u8; 32]; // Dummy key

        let manager = EncryptedConnectionManager::new(db_path.clone(), dek);
        let pool = Pool::builder().max_size(10).build(manager).unwrap();
        let pool = Arc::new(pool);

        // Initialize DB
        {
            let conn = pool.get().unwrap();
            conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, val TEXT)", []).unwrap();
        }

        let mut handles = vec![];

        // Writer thread: inserts 100 rows
        let pool_w = pool.clone();
        handles.push(thread::spawn(move || {
            for i in 0..100 {
                let conn = pool_w.get().unwrap();
                conn.execute("INSERT INTO test (val) VALUES (?1)", [format!("val-{}", i)]).unwrap();
            }
        }));

        // Reader threads: read continuously
        for _ in 0..4 {
            let pool_r = pool.clone();
            handles.push(thread::spawn(move || {
                for _ in 0..20 {
                    let conn = pool_r.get().unwrap();
                    // This query should not block waiting for the writer
                    let _count: i64 = conn.query_row("SELECT COUNT(*) FROM test", [], |r| r.get(0)).unwrap();
                    // Small sleep to yield
                    thread::sleep(Duration::from_millis(1));
                }
            }));
        }

        for h in handles {
            h.join().unwrap();
        }

        // Verify final count
        let conn = pool.get().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM test", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 100);
    }
}
