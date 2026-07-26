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

    // Periodically reclaim expired messages so abandoned queues cannot accumulate
    // for the full message-age window. `cleanup_expired` was previously never called.
    let cleanup_state = Arc::clone(&state);
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(300));
        loop {
            ticker.tick().await;
            let removed = cleanup_state.cleanup_expired();
            if removed > 0 {
                info!("[relay] cleanup_expired reclaimed {} messages", removed);
            }
        }
    });

    info!("Starting Relay Server on {}", addr);
    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            error!("Failed to bind {}: {}", addr, e);
            std::process::exit(1);
        }
    };
    if let Err(e) = axum::serve(listener, app_with_state(state)).await {
        error!("Relay server terminated: {}", e);
        std::process::exit(1);
    }
}
