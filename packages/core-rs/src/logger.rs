use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

/// Log level for messages
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3,
}

impl LogLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Debug => "DEBUG",
            LogLevel::Info => "INFO",
            LogLevel::Warn => "WARN",
            LogLevel::Error => "ERROR",
        }
    }
}

/// Log format options
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogFormat {
    /// Human-readable text format (default)
    Text,
    /// JSON structured logging format for log aggregation systems
    /// (e.g., Elasticsearch, Datadog, CloudWatch)
    Json,
}

/// Simple lightweight logger
pub struct Logger {
    file: Mutex<Option<File>>,
    min_level: LogLevel,
    console_output: bool,
    format: LogFormat,
}

impl Logger {
    /// Create a new logger that writes to a file
    pub fn new(
        log_path: Option<PathBuf>,
        min_level: LogLevel,
        console_output: bool,
    ) -> Result<Self, std::io::Error> {
        Self::with_format(log_path, min_level, console_output, LogFormat::Text)
    }

    /// Create a new logger with a specific output format
    pub fn with_format(
        log_path: Option<PathBuf>,
        min_level: LogLevel,
        console_output: bool,
        format: LogFormat,
    ) -> Result<Self, std::io::Error> {
        let file = if let Some(path) = log_path {
            let f = OpenOptions::new().create(true).append(true).open(path)?;
            Some(f)
        } else {
            None
        };

        Ok(Logger {
            file: Mutex::new(file),
            min_level,
            console_output,
            format,
        })
    }

    /// Log a message at the specified level
    pub fn log(&self, level: LogLevel, module: &str, message: &str) {
        if level < self.min_level {
            return;
        }

        let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ");
        let formatted = match self.format {
            LogFormat::Text => format!(
                "[{}] [{}] [{}] {}\n",
                timestamp,
                level.as_str(),
                module,
                message
            ),
            LogFormat::Json => {
                // Structured JSON log entry for log aggregation systems
                let escaped_msg = message
                    .replace('\\', "\\\\")
                    .replace('"', "\\\"")
                    .replace('\n', "\\n");
                let escaped_mod = module.replace('\\', "\\\\").replace('"', "\\\"");
                format!(
                    "{{\"timestamp\":\"{}\",\"level\":\"{}\",\"module\":\"{}\",\"message\":\"{}\"}}\n",
                    timestamp, level.as_str(), escaped_mod, escaped_msg
                )
            }
        };

        // Write to file with error reporting
        if let Ok(mut file_opt) = self.file.lock() {
            if let Some(file) = file_opt.as_mut() {
                if let Err(e) = file.write_all(formatted.as_bytes()) {
                    eprintln!("[LOGGER][FILE WRITE ERROR] {}", e);
                }
                if let Err(e) = file.flush() {
                    eprintln!("[LOGGER][FILE FLUSH ERROR] {}", e);
                }
            }
        } else {
            eprintln!("[LOGGER][LOCK ERROR] Failed to acquire file lock for logging");
        }

        // Write to console
        if self.console_output {
            // Send errors and warnings to stderr, info/debug to stdout
            match level {
                LogLevel::Error | LogLevel::Warn => {
                    eprint!("{}", formatted);
                }
                _ => {
                    print!("{}", formatted);
                }
            }
        }
    }

    /// Log a debug message
    pub fn debug(&self, module: &str, message: &str) {
        self.log(LogLevel::Debug, module, message);
    }

    /// Log an info message
    pub fn info(&self, module: &str, message: &str) {
        self.log(LogLevel::Info, module, message);
    }

    /// Log a warning message
    pub fn warn(&self, module: &str, message: &str) {
        self.log(LogLevel::Warn, module, message);
    }

    /// Log an error message
    pub fn error(&self, module: &str, message: &str) {
        self.log(LogLevel::Error, module, message);
    }
}

/// Global logger instance using thread-safe OnceLock
static GLOBAL_LOGGER: OnceLock<Logger> = OnceLock::new();

/// Initialize the global logger
pub fn init_logger(
    log_path: Option<PathBuf>,
    min_level: LogLevel,
    console_output: bool,
) -> Result<(), std::io::Error> {
    let logger = Logger::new(log_path, min_level, console_output)?;

    // OnceLock::set returns Err if already initialized, which we ignore
    // This ensures thread-safe single initialization without unsafe code
    let _ = GLOBAL_LOGGER.set(logger);

    Ok(())
}

/// Initialize the global logger with a specific output format
pub fn init_logger_with_format(
    log_path: Option<PathBuf>,
    min_level: LogLevel,
    console_output: bool,
    format: LogFormat,
) -> Result<(), std::io::Error> {
    let logger = Logger::with_format(log_path, min_level, console_output, format)?;
    let _ = GLOBAL_LOGGER.set(logger);
    Ok(())
}

/// Get the global logger
fn get_logger() -> Option<&'static Logger> {
    GLOBAL_LOGGER.get()
}

/// Log a debug message using the global logger
pub fn debug(module: &str, message: &str) {
    if let Some(logger) = get_logger() {
        logger.debug(module, message);
    }
}

/// Log an info message using the global logger
pub fn info(module: &str, message: &str) {
    if let Some(logger) = get_logger() {
        logger.info(module, message);
    }
}

/// Log a warning message using the global logger
pub fn warn(module: &str, message: &str) {
    if let Some(logger) = get_logger() {
        logger.warn(module, message);
    }
}

/// Log an error message using the global logger
pub fn error(module: &str, message: &str) {
    if let Some(logger) = get_logger() {
        logger.error(module, message);
    }
}

/// Convenience macro for logging
///
/// NOTE (Finding O10): Metrics & Observability
/// For production deployments, consider integrating OpenTelemetry for:
/// - Distributed tracing across sync operations
/// - Metrics (sync latency, conflict rates, query performance)
/// - Structured logging with correlation IDs
///
/// Recommended crates:
/// - `opentelemetry` + `opentelemetry-otlp` for trace/metric export
/// - `tracing` + `tracing-opentelemetry` for instrumented logging
/// - `tracing-subscriber` with JSON formatter for structured logs
///
/// Integration pattern:
/// ```text
/// use tracing::{info, instrument};
/// #[instrument(skip(conn))]
/// pub fn apply_deltas(conn: &Connection, deltas: Vec<SyncDelta>) { ... }
/// ```
#[macro_export]
macro_rules! log_debug {
    ($msg:expr) => {
        $crate::logger::debug(module_path!(), $msg)
    };
    ($fmt:expr, $($arg:tt)*) => {
        $crate::logger::debug(module_path!(), &format!($fmt, $($arg)*))
    };
}

#[macro_export]
macro_rules! log_info {
    ($msg:expr) => {
        $crate::logger::info(module_path!(), $msg)
    };
    ($fmt:expr, $($arg:tt)*) => {
        $crate::logger::info(module_path!(), &format!($fmt, $($arg)*))
    };
}

#[macro_export]
macro_rules! log_warn {
    ($msg:expr) => {
        $crate::logger::warn(module_path!(), $msg)
    };
    ($fmt:expr, $($arg:tt)*) => {
        $crate::logger::warn(module_path!(), &format!($fmt, $($arg)*))
    };
}

#[macro_export]
macro_rules! log_error {
    ($msg:expr) => {
        $crate::logger::error(module_path!(), $msg)
    };
    ($fmt:expr, $($arg:tt)*) => {
        $crate::logger::error(module_path!(), &format!($fmt, $($arg)*))
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_logger_creation() {
        let logger = Logger::new(None, LogLevel::Info, false).unwrap();
        logger.info("test", "Test message");
    }

    #[test]
    fn test_logger_file_output() {
        let temp_path = std::env::temp_dir().join("noteece_test.log");
        let logger = Logger::new(Some(temp_path.clone()), LogLevel::Debug, false).unwrap();

        logger.info("test", "Test file output");
        logger.debug("test", "Debug message");

        // Verify file exists and has content
        assert!(temp_path.exists());
        let content = fs::read_to_string(&temp_path).unwrap();
        assert!(content.contains("Test file output"));

        // Cleanup
        let _ = fs::remove_file(temp_path);
    }

    #[test]
    fn test_log_levels() {
        let logger = Logger::new(None, LogLevel::Warn, false).unwrap();

        // These should not be logged (below min level)
        logger.debug("test", "Debug message");
        logger.info("test", "Info message");

        // These should be logged
        logger.warn("test", "Warning message");
        logger.error("test", "Error message");
    }
}
