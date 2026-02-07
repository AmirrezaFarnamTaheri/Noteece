use core_rs::plugin::{NoteecePlugin, PluginRegistry};
use core_rs::db::DbError;
use rusqlite::Connection;
use serde_json::Value;
use std::sync::{Arc, Mutex};

struct TestPlugin {
    id: String,
    event_count: Arc<Mutex<usize>>,
}

impl TestPlugin {
    fn new(id: &str, counter: Arc<Mutex<usize>>) -> Self {
        Self {
            id: id.to_string(),
            event_count: counter,
        }
    }
}

impl NoteecePlugin for TestPlugin {
    fn id(&self) -> &str {
        &self.id
    }

    fn version(&self) -> &str {
        "0.1.0"
    }

    fn on_load(&mut self, _conn: &Connection) -> Result<(), DbError> {
        Ok(())
    }

    fn on_event(&mut self, event: &str, _payload: Option<Value>) -> Result<(), DbError> {
        if event == "test_event" {
            let mut count = self.event_count.lock().unwrap();
            *count += 1;
        }
        Ok(())
    }
}

#[test]
fn test_plugin_registry() {
    let counter = Arc::new(Mutex::new(0));
    let plugin = TestPlugin::new("test.plugin", counter.clone());

    let mut registry = PluginRegistry::new();
    registry.register(Box::new(plugin));

    // Dispatch event
    registry.dispatch_event("test_event", None);

    // Verify counter incremented
    assert_eq!(*counter.lock().unwrap(), 1);

    // Dispatch unrelated event
    registry.dispatch_event("other_event", None);
    assert_eq!(*counter.lock().unwrap(), 1);
}
