/// Distributed Sync Module
/// Handles desktop-mobile synchronization with:
/// - Vector clocks for causal ordering
/// - ECDH for secure pairing
/// - Conflict resolution with multiple strategies
/// - mDNS-based peer discovery
/// - Delta sync with compression

pub mod vector_clock;
pub mod ecdh;
pub mod conflict_resolver;
pub mod peer_discovery;

pub use vector_clock::VectorClock;
pub use ecdh::{PublicKey, PrivateKey, KeyPair, PairingManager, PairingState};
pub use conflict_resolver::{ConflictResolver, ConflictResolution, ResolutionStrategy, VersionedEntity};
pub use peer_discovery::{PeerDiscovery, DiscoveredDevice, DiscoveryEvent, NetworkValidator};
