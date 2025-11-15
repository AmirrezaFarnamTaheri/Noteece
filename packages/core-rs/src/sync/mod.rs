pub mod conflict_resolver;
pub mod ecdh;
pub mod peer_discovery;
/// Distributed Sync Module
/// Handles desktop-mobile synchronization with:
/// - Vector clocks for causal ordering
/// - ECDH for secure pairing
/// - Conflict resolution with multiple strategies
/// - mDNS-based peer discovery
/// - Delta sync with compression
pub mod vector_clock;

pub use conflict_resolver::{
    ConflictResolution, ConflictResolver, ResolutionStrategy, VersionedEntity,
};
pub use ecdh::{KeyPair, PairingManager, PairingState, PrivateKey, PublicKey};
pub use peer_discovery::{DiscoveredDevice, DiscoveryEvent, NetworkValidator, PeerDiscovery};
pub use vector_clock::VectorClock;
