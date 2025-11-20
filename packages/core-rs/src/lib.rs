//! Core Noteece Library
//!
//! This library provides the backend logic for the Noteece application,
//! including database management, encryption, sync, and business logic.

pub mod analytics;
pub mod auth;
pub mod backlink;
pub mod backup;
pub mod blob;
pub mod caldav;
pub mod calendar;
pub mod collaboration;
pub mod correlation;
pub mod crdt;
pub mod crypto;
pub mod dashboard;
pub mod db;
pub mod editor;
pub mod foresight;
pub mod form;
pub mod goals;
pub mod habits;
pub mod health;
pub mod import;
pub mod llm;
pub mod logger;
pub mod meeting;
pub mod music;
pub mod mode;
pub mod note;
pub mod ocr;
pub mod personal_modes;
pub mod project;
pub mod search;
pub mod social;
pub mod space;
pub mod srs;
pub mod sync;
pub mod sync_agent;
pub mod tag;
pub mod task;
pub mod temporal_graph;
pub mod time_tracking;
pub mod vault;
pub mod versioning;
pub mod weekly_review;

use log;

/// Initialize the library, specifically the logger.
/// This should be called once at the start of the application.
pub fn init() {
    env_logger::init();
    log::info!("[core-rs] Library initialized");
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
