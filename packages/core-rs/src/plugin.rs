//! Plugin Interface
//! Defines the trait for third-party extensions to interact with the core.
//! Designed to be safe, constrained, and versioned.

use crate::db::DbError;
use rusqlite::Connection;
use serde_json::Value;

pub trait NoteecePlugin {
    /// Unique identifier for the plugin (e.g., "com.example.myplugin")
    fn id(&self) -> &str;

    /// Plugin version
    fn version(&self) -> &str;

    /// Initialize the plugin
    fn on_load(&mut self, _conn: &Connection) -> Result<(), DbError> {
        Ok(())
    }

    /// Handle a hook event (e.g., "note_created")
    fn on_event(&mut self, _event: &str, _payload: Option<Value>) -> Result<(), DbError> {
        Ok(())
    }

    /// Shutdown the plugin
    fn on_unload(&mut self) -> Result<(), DbError> {
        Ok(())
    }
}

/// Registry to manage loaded plugins
pub struct PluginRegistry {
    plugins: Vec<Box<dyn NoteecePlugin>>,
}

impl Default for PluginRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl PluginRegistry {
    pub fn new() -> Self {
        PluginRegistry {
            plugins: Vec::new(),
        }
    }

    pub fn register(&mut self, plugin: Box<dyn NoteecePlugin>) {
        self.plugins.push(plugin);
    }

    pub fn dispatch_event(&mut self, event: &str, payload: Option<Value>) {
        for plugin in &mut self.plugins {
            if let Err(e) = plugin.on_event(event, payload.clone()) {
                log::error!("[Plugin] Error in {}: {}", plugin.id(), e);
            }
        }
    }
}
