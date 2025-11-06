# Noteece Mobile

> Your Life OS on the go - Offline-first, end-to-end encrypted mobile companion

## Overview

Noteece Mobile is a React Native/Expo app that extends the Noteece desktop experience to iOS and Android devices. It features offline-first architecture, local-network sync, and advanced mobile capabilities like NFC triggers and location-based reminders.

## Features

### 🌅 Fused Reality Today View
A unified timeline that synthesizes all your data:
- **Calendar Events** from CalDAV sync
- **Tasks** with due dates and priorities
- **Insights** from Foresight correlation engine
- **Time Blocks** for focused work

### ⚡ Quick Capture
Rapid data entry from anywhere:
- Quick task creation
- Health metric logging
- Expense tracking
- Voice notes (coming soon)
- Photo capture with OCR (coming soon)

### 🎵 Music Lab
Focus and ambient music player:
- **37 royalty-free tracks** across 9 genres
- Genres: Lo-Fi, Ambient, Instrumental, Classical, Electronic, Nature, Meditation, Jazz, Cinematic
- Background playback with lock screen controls
- Auto-play next track
- Genre-based filtering
- Curated playlists for focus, relax, sleep, energize, and meditation
- Sources: Incompetech (Kevin MacLeod), Bensound, Free Music Archive

### 📲 NFC Triggers
Physical tag interactions for instant actions:
- Start time tracking by tapping NFC tag on desk
- Log habits by tapping tag at gym
- Open specific notes via NFC triggers
- Quick capture workflows

### 📍 Location-Based Reminders
Geofencing for contextual task reminders:
- Get notified when arriving at grocery store
- Remind about errands when leaving work
- Context-aware task suggestions

### 🔄 Offline-First Sync
Zero-server architecture with local-network sync:
- Works perfectly offline
- Automatic background sync over WiFi
- Conflict-free replicated data types (CRDTs)
- End-to-end encryption
- mDNS device discovery

### 🔐 Security & Data Management
Advanced security and data control:
- **Biometric Unlock**: Face ID / Touch ID / Fingerprint unlock
- **Password Management**: Change vault password anytime (iOS)
- **Data Export**: Export all data to JSON for backup
- **Data Clearing**: Securely wipe all local data
- **Encrypted Storage**: All data encrypted at rest with ChaCha20-Poly1305
- **Argon2id**: Password hashing with industry-standard parameters

## Architecture

### Tech Stack
- **React Native** 0.73 with Expo SDK 50
- **Expo Router** for file-based navigation
- **SQLite** for local database
- **Zustand** for state management
- **TypeScript** for type safety
- **Jest** for testing

### Core Modules

#### Sync Client (`src/lib/sync/sync-client.ts`)
Implements the sync protocol:
- Device discovery via mDNS
- ECDH key exchange for session keys
- Encrypted delta sync
- CRDT conflict resolution
- Vector clock tracking

#### Background Sync (`src/lib/sync/background-sync.ts`)
Handles periodic synchronization:
- Background fetch every 15 minutes
- Manual sync trigger
- WiFi-only mode (configurable)

#### Database (`src/lib/database.ts`)
Local SQLite database:
- All entity tables (tasks, notes, events, etc.)
- Sync queue for offline changes
- Conflict tracking
- FTS5 for search

#### NFC Manager (`src/lib/features/nfc-triggers.ts`)
NFC tag interactions:
- Tag scanning and detection
- Trigger registration
- Action execution
- iOS Core NFC / Android NFC

## Project Structure

```
apps/mobile/
├── app/                      # Expo Router pages
│   ├── (tabs)/              # Main tab navigation
│   │   ├── today.tsx        # Fused Reality Today View
│   │   ├── tasks.tsx        # Tasks screen
│   │   ├── capture.tsx      # Quick Capture
│   │   ├── insights.tsx     # Foresight Insights
│   │   ├── music.tsx        # Music Lab (37 tracks)
│   │   └── more.tsx         # Settings & more
│   ├── _layout.tsx          # Root layout
│   ├── index.tsx            # Entry point
│   └── unlock.tsx           # Vault unlock
├── src/
│   ├── components/          # Reusable components
│   │   ├── DailyBrief.tsx   # Foresight daily brief
│   │   ├── TimelineItemCard.tsx
│   │   └── ...
│   ├── hooks/               # Custom hooks
│   │   ├── useTodayTimeline.ts
│   │   └── ...
│   ├── lib/                 # Core libraries
│   │   ├── sync/            # Sync client
│   │   ├── features/        # NFC, location, etc.
│   │   ├── database.ts      # SQLite wrapper
│   │   ├── vault-utils.ts   # Vault password management
│   │   ├── data-utils.ts    # Data export/clear utilities
│   │   ├── music-service.ts # Music library (37 tracks)
│   │   └── theme.ts         # Design system
│   ├── store/               # Zustand stores
│   │   └── vault.ts         # Vault state
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   └── __tests__/           # Tests
├── assets/                  # Images, fonts, etc.
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## Setup

### Prerequisites
- Node.js 18+
- pnpm or npm
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
# Navigate to mobile app
cd apps/mobile

# Install dependencies
pnpm install

# Start development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

### Environment Setup

No environment variables required - the app is fully local-first!

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

## Sync Protocol

### Device Pairing

1. **Discovery**: Mobile app broadcasts mDNS query for Noteece desktop
2. **Connection**: WebSocket connection established over local network
3. **Key Exchange**: ECDH key exchange creates session key
4. **Authentication**: Verify both devices share same vault password
5. **Initial Sync**: Full data sync from desktop to mobile

### Ongoing Sync

- **Background**: Every 15 minutes when on WiFi
- **Manual**: Pull-to-refresh in Today view
- **Automatic**: When app enters foreground

### Conflict Resolution

Uses CRDTs for automatic merge:
- **Last-Write-Wins**: Scalar fields (title, status)
- **Set Union**: Tags, links
- **Operational Transform**: Rich text content

User resolution required for:
- Structural conflicts (task moved to different projects)
- Large text divergences (>30% diff)

## Security

### Encryption
- **At Rest**: SQLite database encrypted with SQLCipher
- **In Transit**: All sync data encrypted with ChaCha20-Poly1305
- **Key Derivation**: Argon2id for password → KEK → DEK

### Privacy
- **Zero Telemetry**: No analytics or tracking
- **Local-First**: Data never leaves your devices
- **E2E Encrypted**: Relay servers (if used) cannot read data

## Performance

### Optimizations
- **Lazy Loading**: Images and blobs loaded on-demand
- **Query Caching**: Frequently accessed data cached
- **Incremental Sync**: Only changed entities synced
- **Background Processing**: Heavy operations off main thread

### Benchmarks
- Cold start: <2s
- Timeline load: <100ms
- Sync (100 entities): <5s
- Search (1000 notes): <50ms

## Testing Strategy

### Unit Tests
- Sync protocol state machine
- CRDT merge logic
- Database queries
- Component rendering

### Integration Tests
- End-to-end sync flow
- Conflict resolution
- Offline queue handling

### Device Testing
- iOS 15+ (iPhone, iPad)
- Android 10+ (phone, tablet)
- Various screen sizes
- Dark/light mode

## Deployment

### Build for Production

#### iOS
```bash
# Create production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### Android
```bash
# Create production build
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

### Release Checklist
- [ ] Update version in `app.json`
- [ ] Run full test suite
- [ ] Test on physical devices
- [ ] Verify sync with desktop app
- [ ] Check app size (<50MB recommended)
- [ ] Update changelog
- [ ] Create release notes

## Roadmap

### Phase 1 ✅ (Completed)
- [x] Fused Reality Today View
- [x] Offline-first database
- [x] Basic sync protocol
- [x] Quick Capture
- [x] NFC triggers
- [x] Location-based reminders
- [x] Biometric unlock (Face ID / Touch ID / Fingerprint)
- [x] Music Lab (37 royalty-free tracks, 9 genres)
- [x] Data export and management
- [x] Vault password management
- [x] Background sync

### Phase 2 (Q2 2026)
- [ ] Voice command integration (Siri Shortcuts, Google Assistant)
- [ ] Apple Watch companion app
- [ ] Widgets for home screen
- [ ] Share extensions

### Phase 3 (Q3 2026)
- [ ] AR view for spatial notes
- [ ] Collaborative editing
- [ ] Advanced OCR with ML Kit
- [ ] Wearable integrations (Garmin, Fitbit)

## Contributing

See main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](../../LICENSE) in the main repository.

## Support

- **Documentation**: [docs.noteece.com](https://docs.noteece.com)
- **Issues**: [GitHub Issues](https://github.com/AmirrezaFarnamTaheri/Noteece/issues)
- **Community**: [Discord](https://discord.gg/noteece)

---

**Built with ❤️ using React Native + Expo**
