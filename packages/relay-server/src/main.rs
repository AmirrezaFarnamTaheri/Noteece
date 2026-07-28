use core_rs::sync::relay::BlindRelayServer;
use relay_server::app_with_state;
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, info};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Bind address is configurable; default to loopback so the relay is not
    // inadvertently exposed on all interfaces without an explicit opt-in.
    let addr = std::env::var("RELAY_BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:3000".to_string());

    let state = Arc::new(BlindRelayServer::new());

    // Periodically reclaim expired messages so abandoned queues cannot
    // accumulate for the full message-age window.
    let cleanup_state = Arc::clone(&state);
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(300));
        loop {
            ticker.tick().await;
            match cleanup_state.cleanup_expired() {
                Ok(removed) if removed > 0 => {
                    info!("[relay] cleanup_expired reclaimed {} messages", removed);
                }
                Ok(_) => {}
                Err(error) => {
                    // A poisoned in-memory state cannot be repaired by retrying
                    // forever. Stop the maintenance task and surface the fault.
                    error!("[relay] cleanup_expired failed: {}", error);
                    break;
                }
            }
        }
    });

    info!("Starting Relay Server on {}", addr);
    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(listener) => listener,
        Err(error) => {
            error!("Failed to bind {}: {}", addr, error);
            std::process::exit(1);
        }
    };
    if let Err(error) = axum::serve(listener, app_with_state(state)).await {
        error!("Relay server terminated: {}", error);
        std::process::exit(1);
    }
}
