   Compiling core-rs v0.1.0 (/app/packages/core-rs)
warning: unused import: `DateTime`
 --> packages/core-rs/src/caldav.rs:1:14
  |
1 | use chrono::{DateTime, Utc};
  |              ^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default

warning: unused import: `std::collections::HashMap`
 --> packages/core-rs/src/caldav.rs:5:5
  |
5 | use std::collections::HashMap;
  |     ^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `ical::parser::Component`
   --> packages/core-rs/src/caldav.rs:936:9
    |
936 |     use ical::parser::Component;
    |         ^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `Duration`
 --> packages/core-rs/src/correlation.rs:1:14
  |
1 | use chrono::{Duration, Utc};
  |              ^^^^^^^^

warning: unused import: `DateTime`
 --> packages/core-rs/src/foresight.rs:1:14
  |
1 | use chrono::{DateTime, Duration, Utc};
  |              ^^^^^^^^

warning: unused import: `std::time::Duration`
   --> packages/core-rs/src/ocr.rs:111:9
    |
111 |     use std::time::Duration;
    |         ^^^^^^^^^^^^^^^^^^^

warning: unused import: `crate::project::Project`
 --> packages/core-rs/src/search.rs:3:5
  |
3 | use crate::project::Project;
  |     ^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `crate::task::Task`
 --> packages/core-rs/src/search.rs:4:5
  |
4 | use crate::task::Task;
  |     ^^^^^^^^^^^^^^^^^

warning: unused import: `SocketAddr`
 --> packages/core-rs/src/social/mobile_sync.rs:6:24
  |
6 | use std::net::{IpAddr, SocketAddr};
  |                        ^^^^^^^^^^

warning: unused import: `std::net::IpAddr`
   --> packages/core-rs/src/social/mobile_sync.rs:297:13
    |
297 |         use std::net::IpAddr;
    |             ^^^^^^^^^^^^^^^^

warning: unused import: `SocialAccount`
  --> packages/core-rs/src/social/sync.rs:10:22
   |
10 | use super::account::{SocialAccount, SocialError};
   |                      ^^^^^^^^^^^^^

warning: unexpected `cfg` condition value: `insecure-test-crypto`
  --> packages/core-rs/src/sync/ecdh.rs:78:39
   |
78 |     #[cfg(any(test, debug_assertions, feature = "insecure-test-crypto"))]
   |                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: remove the condition
   |
   = note: no expected values for `feature`
   = help: consider adding `insecure-test-crypto` as a feature in `Cargo.toml`
   = note: see <https://doc.rust-lang.org/nightly/rustc/check-cfg/cargo-specifics.html> for more information about checking conditional configuration
   = note: `#[warn(unexpected_cfgs)]` on by default

warning: unexpected `cfg` condition value: `insecure-test-crypto`
  --> packages/core-rs/src/sync/ecdh.rs:88:43
   |
88 |     #[cfg(not(any(test, debug_assertions, feature = "insecure-test-crypto")))]
   |                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: remove the condition
   |
   = note: no expected values for `feature`
   = help: consider adding `insecure-test-crypto` as a feature in `Cargo.toml`
   = note: see <https://doc.rust-lang.org/nightly/rustc/check-cfg/cargo-specifics.html> for more information about checking conditional configuration

warning: unexpected `cfg` condition value: `insecure-test-crypto`
   --> packages/core-rs/src/sync/ecdh.rs:106:39
    |
106 |     #[cfg(any(test, debug_assertions, feature = "insecure-test-crypto"))]
    |                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: remove the condition
    |
    = note: no expected values for `feature`
    = help: consider adding `insecure-test-crypto` as a feature in `Cargo.toml`
    = note: see <https://doc.rust-lang.org/nightly/rustc/check-cfg/cargo-specifics.html> for more information about checking conditional configuration

warning: unexpected `cfg` condition value: `insecure-test-crypto`
   --> packages/core-rs/src/sync/ecdh.rs:118:43
    |
118 |     #[cfg(not(any(test, debug_assertions, feature = "insecure-test-crypto")))]
    |                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: remove the condition
    |
    = note: no expected values for `feature`
    = help: consider adding `insecure-test-crypto` as a feature in `Cargo.toml`
    = note: see <https://doc.rust-lang.org/nightly/rustc/check-cfg/cargo-specifics.html> for more information about checking conditional configuration

warning: unused import: `std::net::IpAddr`
 --> packages/core-rs/src/sync/peer_discovery.rs:5:5
  |
5 | use std::net::IpAddr;
  |     ^^^^^^^^^^^^^^^^

warning: unused import: `DateTime`
 --> packages/core-rs/src/temporal_graph.rs:1:14
  |
1 | use chrono::{DateTime, Utc};
  |              ^^^^^^^^

error[E0425]: cannot find function `init_llm_tables` in module `crate::db`
   --> packages/core-rs/src/llm/mod.rs:188:20
    |
188 |         crate::db::init_llm_tables(&conn).unwrap();
    |                    ^^^^^^^^^^^^^^^ not found in `crate::db`

warning: unused import: `std::path::Path`
   --> packages/core-rs/src/logger.rs:214:9
    |
214 |     use std::path::Path;
    |         ^^^^^^^^^^^^^^^

warning: unused variable: `callback`
   --> packages/core-rs/src/sync/peer_discovery.rs:142:9
    |
142 |         callback: impl Fn(DiscoveryEvent) + Send + Sync + 'static,
    |         ^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_callback`
    |
    = note: `#[warn(unused_variables)]` (part of `#[warn(unused)]`) on by default

warning: variable does not need to be mutable
    --> packages/core-rs/src/caldav.rs:1253:9
     |
1253 |     let mut events_pushed = 0u32;
     |         ----^^^^^^^^^^^^^
     |         |
     |         help: remove this `mut`
     |
     = note: `#[warn(unused_mut)]` (part of `#[warn(unused)]`) on by default

warning: unused variable: `task`
   --> packages/core-rs/src/correlation.rs:864:25
    |
864 |             if let Some(task) = context
    |                         ^^^^ help: if this is intentional, prefix it with an underscore: `_task`

warning: unused variable: `conn`
   --> packages/core-rs/src/foresight.rs:503:5
    |
503 |     conn: &Connection,
    |     ^^^^ help: if this is intentional, prefix it with an underscore: `_conn`

warning: unused variable: `dek`
   --> packages/core-rs/src/import.rs:351:5
    |
351 |     dek: &[u8],
    |     ^^^ help: if this is intentional, prefix it with an underscore: `_dek`

warning: unused variable: `request`
  --> packages/core-rs/src/llm/cache.rs:58:23
   |
58 |     pub fn get(&self, request: &LLMRequest) -> Result<Option<LLMResponse>, LLMError> {
   |                       ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_request`

warning: unused variable: `request`
   --> packages/core-rs/src/llm/cache.rs:121:23
    |
121 |     pub fn set(&self, request: &LLMRequest, response: &LLMResponse) -> Result<(), LLMError> {
    |                       ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_request`

warning: unused variable: `response`
   --> packages/core-rs/src/llm/cache.rs:121:45
    |
121 |     pub fn set(&self, request: &LLMRequest, response: &LLMResponse) -> Result<(), LLMError> {
    |                                             ^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_response`

warning: unused variable: `dek`
  --> packages/core-rs/src/social/webview.rs:25:5
   |
25 |     dek: &[u8],
   |     ^^^ help: if this is intentional, prefix it with an underscore: `_dek`

warning: unused variable: `msg`
   --> packages/core-rs/src/sync_agent.rs:342:46
    |
342 |                 Err(SyncError::ConflictError(msg)) => {
    |                                              ^^^ help: if this is intentional, prefix it with an underscore: `_msg`

warning: variable `use_join` is assigned to, but never used
   --> packages/core-rs/src/temporal_graph.rs:196:13
    |
196 |     let mut use_join = false;
    |             ^^^^^^^^
    |
    = note: consider using `_use_join` instead

warning: value assigned to `use_join` is never read
   --> packages/core-rs/src/temporal_graph.rs:205:9
    |
205 |         use_join = true;
    |         ^^^^^^^^
    |
    = help: maybe it is overwritten before being read?
    = note: `#[warn(unused_assignments)]` (part of `#[warn(unused)]`) on by default

warning: function `sanitize_event_uid` is never used
   --> packages/core-rs/src/caldav.rs:723:4
    |
723 | fn sanitize_event_uid(uid: &str) -> Result<String, CalDavError> {
    |    ^^^^^^^^^^^^^^^^^^
    |
    = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default

warning: function `push_calendar_event` is never used
   --> packages/core-rs/src/caldav.rs:759:4
    |
759 | fn push_calendar_event(
    |    ^^^^^^^^^^^^^^^^^^^

warning: function `delete_calendar_event` is never used
   --> packages/core-rs/src/caldav.rs:823:4
    |
823 | fn delete_calendar_event(
    |    ^^^^^^^^^^^^^^^^^^^^^

warning: function `generate_icalendar` is never used
    --> packages/core-rs/src/caldav.rs:1183:4
     |
1183 | fn generate_icalendar(event: &CalDavEvent) -> Result<String, CalDavError> {
     |    ^^^^^^^^^^^^^^^^^^

warning: fields `short_term_days` and `long_term_days` are never read
  --> packages/core-rs/src/correlation.rs:55:5
   |
54 | pub struct CorrelationEngine {
   |            ----------------- fields in this struct
55 |     short_term_days: i64,
   |     ^^^^^^^^^^^^^^^
56 |     medium_term_days: i64,
57 |     long_term_days: i64,
   |     ^^^^^^^^^^^^^^

warning: methods `import_database` and `clear_database` are never used
   --> packages/core-rs/src/social/backup.rs:316:8
    |
 74 | impl BackupService {
    | ------------------ methods in this implementation
...
316 |     fn import_database(
    |        ^^^^^^^^^^^^^^^
...
399 |     fn clear_database(&self, conn: &Connection) -> Result<(), BackupError> {
    |        ^^^^^^^^^^^^^^

warning: constant `SYNC_PROTOCOL_VERSION` is never used
  --> packages/core-rs/src/social/mobile_sync.rs:50:7
   |
50 | const SYNC_PROTOCOL_VERSION: u32 = 1;
   |       ^^^^^^^^^^^^^^^^^^^^^

warning: field `port` is never read
  --> packages/core-rs/src/sync/peer_discovery.rs:42:5
   |
39 | pub struct PeerDiscovery {
   |            ------------- field in this struct
...
42 |     port: u16,
   |     ^^^^

warning: associated function `parse_txt_records` is never used
  --> packages/core-rs/src/sync/peer_discovery.rs:95:8
   |
46 | impl PeerDiscovery {
   | ------------------ associated function in this implementation
...
95 |     fn parse_txt_records(
   |        ^^^^^^^^^^^^^^^^^

warning: function `detect_os_version` is never used
   --> packages/core-rs/src/sync/peer_discovery.rs:170:4
    |
170 | fn detect_os_version() -> String {
    |    ^^^^^^^^^^^^^^^^^

error[E0308]: mismatched types
   --> packages/core-rs/src/social/category.rs:457:28
    |
457 |         crate::db::migrate(&conn).unwrap();
    |         ------------------ ^^^^^ types differ in mutability
    |         |
    |         arguments to this function are incorrect
    |
    = note: expected mutable reference `&mut rusqlite::Connection`
                       found reference `&rusqlite::Connection`
note: function defined here
   --> packages/core-rs/src/db.rs:79:8
    |
 79 | pub fn migrate(conn: &mut Connection) -> Result<(), DbError> {
    |        ^^^^^^^ ---------------------

warning: variable does not need to be mutable
   --> packages/core-rs/src/auth.rs:486:13
    |
486 |         let mut session = auth.authenticate("testuser", "password123").unwrap();
    |             ----^^^^^^^
    |             |
    |             help: remove this `mut`
    |
    = note: `#[warn(unused_mut)]` (part of `#[warn(unused)]`) on by default

warning: variable does not need to be mutable
    --> packages/core-rs/src/caldav.rs:1253:9
     |
1253 |     let mut events_pushed = 0u32;
     |         ----^^^^^^^^^^^^^
     |         |
     |         help: remove this `mut`

warning: `core-rs` (lib) generated 39 warnings (run `cargo fix --lib -p core-rs` to apply 14 suggestions)
error[E0609]: no field `dek` on type `Vault`
  --> packages/core-rs/tests/foresight_tests.rs:15:24
   |
15 |     (vault.conn, vault.dek)
   |                        ^^^ unknown field
   |
   = note: available field is: `conn`

error[E0599]: no method named `to_path_buf` found for reference `&str` in the current scope
  --> packages/core-rs/tests/foresight_tests.rs:19:37
   |
19 |     let path = conn.path().unwrap().to_path_buf();
   |                                     ^^^^^^^^^^^ method not found in `&str`

error[E0061]: this function takes 3 arguments but 4 arguments were supplied
  --> packages/core-rs/tests/foresight_tests.rs:30:19
   |
30 |     let project = create_project(&conn, space_id, "Test Project", Some("Test description"))
   |                   ^^^^^^^^^^^^^^        --------                  ------------------------ unexpected argument #4 of type `Option<&str>`
   |                                         |
   |                                         expected `&str`, found `Ulid`
   |
note: function defined here
  --> /app/packages/core-rs/src/project.rs:62:8
   |
62 | pub fn create_project(
   |        ^^^^^^^^^^^^^^
help: remove the extra argument
   |
30 -     let project = create_project(&conn, space_id, "Test Project", Some("Test description"))
30 +     let project = create_project(&conn, /* &str */, "Test Project")
   |

error[E0308]: mismatched types
  --> packages/core-rs/tests/foresight_tests.rs:44:14
   |
44 |         Some("Test description"),
   |         ---- ^^^^^^^^^^^^^^^^^^ expected `String`, found `&str`
   |         |
   |         arguments to this enum variant are incorrect
   |
help: the type constructed contains `&'static str` due to the type of the argument passed
  --> packages/core-rs/tests/foresight_tests.rs:44:9
   |
44 |         Some("Test description"),
   |         ^^^^^------------------^
   |              |
   |              this argument influences the type of `Some`
note: tuple variant defined here
  --> /rustc/f8297e351a40c1439a467bbbb6879088047f50b3/library/core/src/option.rs:602:5
help: try using a conversion method
   |
44 |         Some("Test description".to_string()),
   |                                ++++++++++++

error[E0061]: this function takes 4 arguments but 6 arguments were supplied
  --> packages/core-rs/tests/foresight_tests.rs:40:16
   |
40 |     let task = create_task(
   |                ^^^^^^^^^^^
...
45 |         Some(tomorrow),
   |         -------------- unexpected argument #5 of type `Option<i64>`
46 |         Some(project.id),
   |         ---------------- unexpected argument #6 of type `Option<String>`
   |
note: function defined here
  --> /app/packages/core-rs/src/task.rs:26:8
   |
26 | pub fn create_task(
   |        ^^^^^^^^^^^
help: remove the extra arguments
   |
44 -         Some("Test description"),
45 -         Some(tomorrow),
44 +         Some("Test description"),
   |

error[E0061]: this function takes 4 arguments but 6 arguments were supplied
  --> packages/core-rs/tests/foresight_tests.rs:74:5
   |
74 |     create_task(
   |     ^^^^^^^^^^^
...
79 |         Some(yesterday),
   |         --------------- unexpected argument #5 of type `Option<i64>`
80 |         None,
   |         ---- unexpected argument #6 of type `Option<_>`
   |
note: function defined here
  --> /app/packages/core-rs/src/task.rs:26:8
   |
26 | pub fn create_task(
   |        ^^^^^^^^^^^
help: remove the extra arguments
   |
78 -         None,
79 -         Some(yesterday),
78 +         None,
   |

error[E0061]: this function takes 4 arguments but 6 arguments were supplied
  --> packages/core-rs/tests/foresight_tests.rs:84:5
   |
84 |     create_task(
   |     ^^^^^^^^^^^
...
89 |         Some(yesterday),
   |         --------------- unexpected argument #5 of type `Option<i64>`
90 |         None,
   |         ---- unexpected argument #6 of type `Option<_>`
   |
note: function defined here
  --> /app/packages/core-rs/src/task.rs:26:8
   |
26 | pub fn create_task(
   |        ^^^^^^^^^^^
help: remove the extra arguments
   |
88 -         None,
89 -         Some(yesterday),
88 +         None,
   |

error[E0061]: this function takes 3 arguments but 4 arguments were supplied
   --> packages/core-rs/tests/foresight_tests.rs:121:19
    |
121 |     let project = create_project(&conn, space_id, "Stagnant Project", Some("Old project"))
    |                   ^^^^^^^^^^^^^^        --------                      ------------------- unexpected argument #4 of type `Option<&str>`
    |                                         |
    |                                         expected `&str`, found `Ulid`
    |
note: function defined here
   --> /app/packages/core-rs/src/project.rs:62:8
    |
 62 | pub fn create_project(
    |        ^^^^^^^^^^^^^^
help: remove the extra argument
    |
121 -     let project = create_project(&conn, space_id, "Stagnant Project", Some("Old project"))
121 +     let project = create_project(&conn, /* &str */, "Stagnant Project")
    |

error[E0599]: no variant or associated item named `ProjectStagnation` found for enum `core_rs::foresight::InsightType` in the current scope
   --> packages/core-rs/tests/foresight_tests.rs:136:56
    |
136 |         .any(|i| matches!(i.insight_type, InsightType::ProjectStagnation));
    |                                                        ^^^^^^^^^^^^^^^^^ variant or associated item not found in `core_rs::foresight::InsightType`
    |
help: there is a variant with a similar name
    |
136 -         .any(|i| matches!(i.insight_type, InsightType::ProjectStagnation));
136 +         .any(|i| matches!(i.insight_type, InsightType::ProjectStagnant));
    |

error[E0061]: this function takes 4 arguments but 6 arguments were supplied
   --> packages/core-rs/tests/foresight_tests.rs:155:5
    |
155 |     create_task(&conn, space_id, "Urgent Task", None, Some(soon), None)
    |     ^^^^^^^^^^^                                       ----------  ---- unexpected argument #6 of type `Option<_>`
    |                                                       |
    |                                                       unexpected argument #5 of type `Option<i64>`
    |
note: function defined here
   --> /app/packages/core-rs/src/task.rs:26:8
    |
 26 | pub fn create_task(
    |        ^^^^^^^^^^^
help: remove the extra arguments
    |
155 -     create_task(&conn, space_id, "Urgent Task", None, Some(soon), None)
155 +     create_task(&conn, space_id, "Urgent Task", None)
    |

error[E0061]: this function takes 3 arguments but 4 arguments were supplied
   --> packages/core-rs/tests/foresight_tests.rs:175:9
    |
175 |         create_project(&conn, space_id, "Test Project", None).expect("Failed to create project");
    |         ^^^^^^^^^^^^^^        --------                  ---- unexpected argument #4 of type `Option<_>`
    |                               |
    |                               expected `&str`, found `Ulid`
    |
note: function defined here
   --> /app/packages/core-rs/src/project.rs:62:8
    |
 62 | pub fn create_project(
    |        ^^^^^^^^^^^^^^
help: remove the extra argument
    |
175 -         create_project(&conn, space_id, "Test Project", None).expect("Failed to create project");
175 +         create_project(&conn, /* &str */, "Test Project").expect("Failed to create project");
    |

error[E0061]: this function takes 4 arguments but 6 arguments were supplied
   --> packages/core-rs/tests/foresight_tests.rs:183:5
    |
183 |     create_task(
    |     ^^^^^^^^^^^
...
188 |         Some(tomorrow),
    |         -------------- unexpected argument #5 of type `Option<i64>`
189 |         Some(project.id),
    |         ---------------- unexpected argument #6 of type `Option<String>`
    |
note: function defined here
   --> /app/packages/core-rs/src/task.rs:26:8
    |
 26 | pub fn create_task(
    |        ^^^^^^^^^^^
help: remove the extra arguments
    |
187 -         None,
188 -         Some(tomorrow),
187 +         None,
    |

Some errors have detailed explanations: E0061, E0308, E0599, E0609.
For more information about an error, try `rustc --explain E0061`.
error: could not compile `core-rs` (test "foresight_tests") due to 12 previous errors
warning: build failed, waiting for other jobs to finish...
warning: unused variable: `dek`
   --> packages/core-rs/src/social/category.rs:622:13
    |
622 |         let dek = [0u8; 32];
    |             ^^^ help: if this is intentional, prefix it with an underscore: `_dek`

warning: variable does not need to be mutable
   --> packages/core-rs/src/sync/conflict_resolver.rs:300:13
    |
300 |         let mut local = create_entity("entity1", "device1", 100);
    |             ----^^^^^
    |             |
    |             help: remove this `mut`

warning: unused variable: `discovery`
   --> packages/core-rs/src/sync/peer_discovery.rs:265:13
    |
265 |         let discovery = PeerDiscovery::new("device123".to_string(), "My Desktop".to_string(), 8765);
    |             ^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_discovery`

Some errors have detailed explanations: E0308, E0425.
For more information about an error, try `rustc --explain E0308`.
warning: `core-rs` (lib test) generated 34 warnings (28 duplicates)
error: could not compile `core-rs` (lib test) due to 2 previous errors; 34 warnings emitted
