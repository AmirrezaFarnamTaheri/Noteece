//! SQLCipher Pragma Tuning
//!
//! Automatic performance configuration for SQLite/SQLCipher databases.
//! Detects device capabilities and applies optimal settings.
//!
//! SPDX-License-Identifier: AGPL-3.0-or-later
//! Copyright (c) 2024-2025 Amirreza 'Farnam' Taheri <taherifarnam@gmail.com>

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Device profile for pragma optimization
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeviceProfile {
    /// High-performance desktop with SSD
    HighPerformance,
    /// Standard desktop/laptop
    Standard,
    /// Mobile device with limited resources
    Mobile,
    /// Low-end device or storage-constrained
    LowEnd,
}

/// Pragma configuration for the database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PragmaConfig {
    /// Journal mode (DELETE, TRUNCATE, PERSIST, MEMORY, WAL, OFF)
    pub journal_mode: String,
    /// Synchronous mode (OFF=0, NORMAL=1, FULL=2, EXTRA=3)
    pub synchronous: u8,
    /// Cache size in pages (negative = KB)
    pub cache_size: i32,
    /// Memory-mapped I/O size in bytes (0 = disabled)
    pub mmap_size: u64,
    /// Page size in bytes
    pub page_size: u32,
    /// Enable foreign keys
    pub foreign_keys: bool,
    /// Temp store location (DEFAULT=0, FILE=1, MEMORY=2)
    pub temp_store: u8,
    /// Busy timeout in milliseconds
    pub busy_timeout: u32,
    /// Auto-vacuum mode (NONE=0, FULL=1, INCREMENTAL=2)
    pub auto_vacuum: u8,
    /// SQLCipher KDF iterations (higher = more secure, slower)
    pub kdf_iter: Option<u32>,
}

impl Default for PragmaConfig {
    fn default() -> Self {
        Self {
            journal_mode: "WAL".to_string(),
            synchronous: 1,     // NORMAL
            cache_size: -64000, // 64MB
            mmap_size: 0,
            page_size: 4096,
            foreign_keys: true,
            temp_store: 2, // MEMORY
            busy_timeout: 5000,
            auto_vacuum: 2, // INCREMENTAL
            kdf_iter: Some(256000),
        }
    }
}

impl PragmaConfig {
    /// Create config optimized for the given device profile
    pub fn for_profile(profile: DeviceProfile) -> Self {
        match profile {
            DeviceProfile::HighPerformance => Self {
                journal_mode: "WAL".to_string(),
                synchronous: 1,       // NORMAL (good balance for SSDs)
                cache_size: -128000,  // 128MB
                mmap_size: 268435456, // 256MB
                page_size: 4096,
                foreign_keys: true,
                temp_store: 2, // MEMORY
                busy_timeout: 10000,
                auto_vacuum: 2, // INCREMENTAL
                kdf_iter: Some(256000),
            },
            DeviceProfile::Standard => Self {
                journal_mode: "WAL".to_string(),
                synchronous: 1,
                cache_size: -64000,   // 64MB
                mmap_size: 134217728, // 128MB
                page_size: 4096,
                foreign_keys: true,
                temp_store: 2,
                busy_timeout: 5000,
                auto_vacuum: 2,
                kdf_iter: Some(256000),
            },
            DeviceProfile::Mobile => Self {
                journal_mode: "WAL".to_string(),
                synchronous: 1,
                cache_size: -16000, // 16MB
                mmap_size: 0,       // Disabled on mobile
                page_size: 4096,
                foreign_keys: true,
                temp_store: 1, // FILE (save RAM)
                busy_timeout: 3000,
                auto_vacuum: 2,
                kdf_iter: Some(128000), // Faster on mobile
            },
            DeviceProfile::LowEnd => Self {
                journal_mode: "DELETE".to_string(), // More compatible
                synchronous: 2,                     // FULL (safer on slow storage)
                cache_size: -8000,                  // 8MB
                mmap_size: 0,
                page_size: 4096,
                foreign_keys: true,
                temp_store: 1, // FILE
                busy_timeout: 3000,
                auto_vacuum: 0,        // NONE (manual vacuum)
                kdf_iter: Some(64000), // Faster
            },
        }
    }
}

/// Pragma tuner for automatic database optimization
pub struct PragmaTuner {
    config: PragmaConfig,
}

impl PragmaTuner {
    /// Create a new tuner with the given configuration
    pub fn new(config: PragmaConfig) -> Self {
        Self { config }
    }

    /// Create a tuner that auto-detects the optimal profile
    pub fn auto_detect() -> Self {
        let profile = Self::detect_profile();
        Self::new(PragmaConfig::for_profile(profile))
    }

    /// Detect the optimal device profile based on system characteristics
    pub fn detect_profile() -> DeviceProfile {
        // Check available memory
        let available_memory = Self::get_available_memory();

        // Check storage speed
        let storage_speed = Self::benchmark_storage();

        // Determine profile
        if available_memory > 8_000_000_000 && storage_speed > 500.0 {
            DeviceProfile::HighPerformance
        } else if available_memory > 2_000_000_000 && storage_speed > 100.0 {
            DeviceProfile::Standard
        } else if available_memory > 500_000_000 {
            DeviceProfile::Mobile
        } else {
            DeviceProfile::LowEnd
        }
    }

    /// Get available system memory in bytes
    fn get_available_memory() -> u64 {
        // Platform-specific implementation
        #[cfg(target_os = "linux")]
        {
            if let Ok(meminfo) = std::fs::read_to_string("/proc/meminfo") {
                for line in meminfo.lines() {
                    if line.starts_with("MemAvailable:") {
                        if let Some(kb) = line.split_whitespace().nth(1) {
                            if let Ok(kb_value) = kb.parse::<u64>() {
                                return kb_value * 1024;
                            }
                        }
                    }
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            // macOS: use sysctl
            // For simplicity, return a reasonable default
            return 8_000_000_000; // 8GB default for macOS
        }

        #[cfg(target_os = "windows")]
        {
            // Windows: use GlobalMemoryStatusEx
            // For simplicity, return a reasonable default
            return 8_000_000_000; // 8GB default for Windows
        }

        // Default fallback
        4_000_000_000 // 4GB
    }

    /// Benchmark storage speed (MB/s)
    fn benchmark_storage() -> f64 {
        let temp_file = std::env::temp_dir().join("noteece_bench.tmp");
        let data = vec![0u8; 1024 * 1024]; // 1MB

        let start = Instant::now();

        // Write
        if std::fs::write(&temp_file, &data).is_err() {
            return 50.0; // Conservative default
        }

        // Read
        if std::fs::read(&temp_file).is_err() {
            let _ = std::fs::remove_file(&temp_file);
            return 50.0;
        }

        let elapsed = start.elapsed();
        let _ = std::fs::remove_file(&temp_file);

        // Calculate MB/s (2MB total for write + read)
        2.0 / elapsed.as_secs_f64()
    }

    /// Apply the configuration to a database connection
    pub fn apply(&self, conn: &Connection) -> Result<(), rusqlite::Error> {
        let cfg = &self.config;

        // Journal mode (must be set before other pragmas in some cases)
        conn.execute_batch(&format!("PRAGMA journal_mode = {};", cfg.journal_mode))?;

        // Synchronous mode
        conn.execute_batch(&format!("PRAGMA synchronous = {};", cfg.synchronous))?;

        // Cache size
        conn.execute_batch(&format!("PRAGMA cache_size = {};", cfg.cache_size))?;

        // Memory-mapped I/O
        if cfg.mmap_size > 0 {
            conn.execute_batch(&format!("PRAGMA mmap_size = {};", cfg.mmap_size))?;
        }

        // Foreign keys
        conn.execute_batch(&format!(
            "PRAGMA foreign_keys = {};",
            if cfg.foreign_keys { "ON" } else { "OFF" }
        ))?;

        // Temp store
        conn.execute_batch(&format!("PRAGMA temp_store = {};", cfg.temp_store))?;

        // Busy timeout
        conn.execute_batch(&format!("PRAGMA busy_timeout = {};", cfg.busy_timeout))?;

        // Auto-vacuum
        conn.execute_batch(&format!("PRAGMA auto_vacuum = {};", cfg.auto_vacuum))?;

        // SQLCipher-specific (if available)
        if let Some(kdf_iter) = cfg.kdf_iter {
            // This will fail silently if SQLCipher is not available
            let _ = conn.execute_batch(&format!("PRAGMA kdf_iter = {};", kdf_iter));
        }

        Ok(())
    }

    /// Get the current pragma values from a connection
    pub fn get_current(conn: &Connection) -> Result<PragmaConfig, rusqlite::Error> {
        let journal_mode: String = conn.query_row("PRAGMA journal_mode;", [], |row| row.get(0))?;
        let synchronous: u8 = conn.query_row("PRAGMA synchronous;", [], |row| row.get(0))?;
        let cache_size: i32 = conn.query_row("PRAGMA cache_size;", [], |row| row.get(0))?;
        let mmap_size: u64 = conn.query_row("PRAGMA mmap_size;", [], |row| row.get(0))?;
        let page_size: u32 = conn.query_row("PRAGMA page_size;", [], |row| row.get(0))?;
        let foreign_keys: i32 = conn.query_row("PRAGMA foreign_keys;", [], |row| row.get(0))?;
        let temp_store: u8 = conn.query_row("PRAGMA temp_store;", [], |row| row.get(0))?;
        let busy_timeout: u32 = conn.query_row("PRAGMA busy_timeout;", [], |row| row.get(0))?;
        let auto_vacuum: u8 = conn.query_row("PRAGMA auto_vacuum;", [], |row| row.get(0))?;

        Ok(PragmaConfig {
            journal_mode,
            synchronous,
            cache_size,
            mmap_size,
            page_size,
            foreign_keys: foreign_keys != 0,
            temp_store,
            busy_timeout,
            auto_vacuum,
            kdf_iter: None, // Can't reliably query this
        })
    }

    /// Optimize the database (VACUUM, ANALYZE)
    pub fn optimize(conn: &Connection) -> Result<(), rusqlite::Error> {
        // Run ANALYZE to update query planner statistics
        conn.execute_batch("ANALYZE;")?;

        // Run incremental vacuum if enabled
        conn.execute_batch("PRAGMA incremental_vacuum;")?;

        // Optimize FTS tables if any
        let _ = conn.execute_batch("INSERT INTO note_fts(note_fts) VALUES('optimize');");
        let _ = conn.execute_batch(
            "INSERT INTO note_embeddings_fts(note_embeddings_fts) VALUES('optimize');",
        );

        Ok(())
    }

    /// Get database statistics
    pub fn get_stats(conn: &Connection) -> Result<DatabaseStats, rusqlite::Error> {
        let page_count: u64 = conn.query_row("PRAGMA page_count;", [], |row| row.get(0))?;
        let page_size: u64 = conn.query_row("PRAGMA page_size;", [], |row| row.get(0))?;
        let freelist_count: u64 = conn.query_row("PRAGMA freelist_count;", [], |row| row.get(0))?;

        Ok(DatabaseStats {
            total_pages: page_count,
            page_size,
            database_size: page_count * page_size,
            free_pages: freelist_count,
            fragmentation: if page_count > 0 {
                (freelist_count as f64 / page_count as f64) * 100.0
            } else {
                0.0
            },
        })
    }
}

/// Database statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub total_pages: u64,
    pub page_size: u64,
    pub database_size: u64,
    pub free_pages: u64,
    pub fragmentation: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = PragmaConfig::default();
        assert_eq!(config.journal_mode, "WAL");
        assert_eq!(config.synchronous, 1);
        assert!(config.foreign_keys);
    }

    #[test]
    fn test_profile_configs() {
        let high = PragmaConfig::for_profile(DeviceProfile::HighPerformance);
        let standard = PragmaConfig::for_profile(DeviceProfile::Standard);
        let mobile = PragmaConfig::for_profile(DeviceProfile::Mobile);
        let low = PragmaConfig::for_profile(DeviceProfile::LowEnd);

        // High performance should have larger cache
        assert!(high.cache_size.abs() > standard.cache_size.abs());

        // Mobile should have smaller cache
        assert!(mobile.cache_size.abs() < standard.cache_size.abs());

        // Low end should have DELETE journal mode
        assert_eq!(low.journal_mode, "DELETE");

        // Mobile should have lower KDF iterations
        assert!(mobile.kdf_iter.unwrap() < standard.kdf_iter.unwrap());
    }

    #[test]
    fn test_apply_config() {
        let conn = Connection::open_in_memory().unwrap();
        let tuner = PragmaTuner::new(PragmaConfig::default());

        let result = tuner.apply(&conn);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_current() {
        let conn = Connection::open_in_memory().unwrap();

        let config = PragmaTuner::get_current(&conn);
        assert!(config.is_ok());

        let cfg = config.unwrap();
        assert!(cfg.page_size > 0);
    }

    #[test]
    fn test_get_stats() {
        let conn = Connection::open_in_memory().unwrap();

        // Create a table to have some data
        conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)", [])
            .unwrap();

        let stats = PragmaTuner::get_stats(&conn);
        assert!(stats.is_ok());

        let s = stats.unwrap();
        assert!(s.page_size > 0);
    }

    #[test]
    fn test_optimize() {
        let conn = Connection::open_in_memory().unwrap();

        conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)", [])
            .unwrap();

        let result = PragmaTuner::optimize(&conn);
        assert!(result.is_ok());
    }

    #[test]
    fn test_auto_detect() {
        let tuner = PragmaTuner::auto_detect();
        // Should not panic and should produce a valid config
        assert!(!tuner.config.journal_mode.is_empty());
    }

    #[test]
    fn test_detect_profile() {
        let profile = PragmaTuner::detect_profile();
        // Should return a valid profile
        assert!(matches!(
            profile,
            DeviceProfile::HighPerformance
                | DeviceProfile::Standard
                | DeviceProfile::Mobile
                | DeviceProfile::LowEnd
        ));
    }
}
