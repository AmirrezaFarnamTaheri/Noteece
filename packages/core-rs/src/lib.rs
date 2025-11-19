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
pub mod db;
pub mod editor;
pub mod foresight;
pub mod form;
pub mod import;
pub mod llm;
pub mod logger;
pub mod meeting;
pub mod mode;
pub mod note;
pub mod ocr;
pub mod personal_modes;
pub mod project;
pub mod search;
// pub mod social; // social::mobile_sync was moved
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

pub fn init() {
    env_logger::init();
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
