use core_rs::sync::relay::BlindRelayServer;
use relay_server::app_with_state;
use std::sync::Arc;
use std::time::Duration;
use tracing::info;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let addr = "0.0.0.0:3000";
    info!("Starting Relay Server on {}", addr);

    // Shared blind-relay state (queues are in-memory with 24h TTL + per-device
    // caps enforced in core-rs).
    let state = Arc::new(BlindRelayServer::new());

    // Periodic janitor: evict expired envelopes even when recipients never
    // fetch, so memory stays bounded for abandoned devices.
    let sweep_state = Arc::clone(&state);
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(600));
        loop {
            interval.tick().await;
            let removed = sweep_state.cleanup_expired();
            if removed > 0 {
                info!(component = "sweep", "expired {} messages", removed);
            }
        }
    });

    // TLS support: set TLS_CERT_PATH and TLS_KEY_PATH env vars to enable HTTPS.
    // If not set, the server falls back to plain HTTP (development only).
    let cert_path = std::env::var("TLS_CERT_PATH").ok();
    let key_path = std::env::var("TLS_KEY_PATH").ok();

    match (cert_path, key_path) {
        (Some(cert), Some(key)) => {
            info!("TLS enabled — loading certificate from {}", cert);
            let config = axum_server::tls_rustls::RustlsConfig::from_pem_file(cert, key)
                .await
                .expect("Failed to load TLS certificate/key");
            let handle = axum_server::Handle::new();
            let server = axum_server::bind_rustls(addr.parse().unwrap(), config)
                .handle(handle.clone())
                .serve(app_with_state(Arc::clone(&state)).into_make_service());

            let shutdown_signal = shutdown_signal(handle);
            tokio::select! {
                result = server => {
                    if let Err(e) = result {
                        tracing::error!("server error: {}", e);
                    }
                }
                _ = shutdown_signal => {
                    info!("Shutdown signal received, server stopping gracefully");
                }
            }
        }
        _ => {
            info!("TLS not configured — running plain HTTP (set TLS_CERT_PATH and TLS_KEY_PATH for production)");
            let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
            let handle = axum_server::Handle::new();
            let server = axum::serve(listener, app_with_state(Arc::clone(&state)))
                .with_graceful_shutdown(shutdown_signal(handle));

            if let Err(e) = server.await {
                tracing::error!("server error: {}", e);
            }
        }
    }

    info!("Server stopped");
}

/// Wait for SIGTERM (Unix) or Ctrl+C, then allow in-flight requests to drain
/// within a timeout before forcing shutdown.
async fn shutdown_signal(handle: axum_server::Handle) {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C (SIGINT), initiating graceful shutdown");
        }
        _ = terminate => {
            info!("Received SIGTERM, initiating graceful shutdown");
        }
    }

    // Graceful shutdown: wait for in-flight requests to complete (max 30s)
    info!("Waiting for in-flight requests to complete (max 30s)...");
    handle.graceful_shutdown(Some(Duration::from_secs(30)));
}
