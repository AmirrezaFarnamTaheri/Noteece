use core_rs::note::create_note;
use core_rs::search::search_notes;
use core_rs::space::create_space;
use core_rs::vault::{create_vault, unlock_vault};
use log::info;
use std::fs;
use std::time::Instant;

fn main() {
    env_logger::init();
    info!("Starting Phase 0 performance harness");

    let num_notes = 50_000;
    let vault_path = "./perf-vault.noteece";
    let vault_key = "perf-password";

    // --- Phase 0 Acceptance Criteria ---
    println!("--- Phase 0 Performance & Correctness Gates ---");

    // 1. Vault Creation & Cold Start
    info!("Testing vault creation and cold start...");
    let start = Instant::now();
    if fs::metadata(vault_path).is_ok() {
        fs::remove_dir_all(vault_path).unwrap();
    }
    let mut vault = create_vault(vault_path, vault_key).expect("Vault creation failed");
    let duration = start.elapsed();
    println!("[GATE] Vault Creation (cold start): {:?}", duration);

    // 2. Note Creation (50k notes)
    info!("Testing bulk note creation...");
    let space_id = create_space(&mut vault.conn, "performance_space").unwrap();
    let start = Instant::now();
    for i in 0..num_notes {
        let title = format!("Note Title {}", i);
        let content = if i == num_notes / 2 {
            "Special unique content for search test".to_string()
        } else {
            format!("This is the content for note number {}", i)
        };
        create_note(&vault.conn, &space_id.to_string(), &title, &content).unwrap();
    }
    let duration = start.elapsed();
    println!(
        "[GATE] Bulk Note Creation ({} notes): {:?}",
        num_notes, duration
    );
    let unlock_start = Instant::now();
    let unlocked_vault = unlock_vault(vault_path, vault_key).expect("Vault unlock failed");
    let unlock_duration = unlock_start.elapsed();
    println!("[GATE] Vault Unlock (cold read): {:?}", unlock_duration);

    // 3. Global Search (50k notes)
    info!("Testing global search...");
    let search_start = Instant::now();
    let results = search_notes(&unlocked_vault.conn, "unique", &space_id.to_string()).unwrap();
    let search_duration = search_start.elapsed();
    assert_eq!(
        results.len(),
        1,
        "Expected exactly one search result for the unique term."
    );
    println!(
        "[GATE] Global Search ({} notes, unique term): {:?}",
        num_notes, search_duration
    );

    // 4. Undo/Redo
    println!("[INFO] Undo/Redo: Manual test, not benchmarked.");

    // 5. Export/Import
    println!("[INFO] Export/Import: Not yet implemented in harness.");

    info!("Performance harness finished. Cleaning up.");
    fs::remove_dir_all(vault_path).unwrap();
    println!("\n--- Harness Complete ---");
}
