# Noteece Social Media Suite - Mobile Architecture

**Version:** 1.0 (Architectural Specification)
**Status:** Design Document
**Target:** Future Implementation

---

## Executive Summary

This document outlines the architectural design for extending the Noteece Social Media Suite to mobile platforms (iOS and Android). The desktop implementation (Weeks 1-14) provides a solid foundation of local-first, encrypted social media aggregation. The mobile implementation will:

1. **Extend** the desktop experience to mobile devices
2. **Sync** data between desktop and mobile
3. **Integrate** with native mobile features (share sheets, notifications, background sync)
4. **Maintain** the same security and privacy standards

**Key Principle:** Mobile is an **extension**, not a replacement. Desktop remains the primary data hub.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Data Sync Protocol](#data-sync-protocol)
4. [Mobile Components](#mobile-components)
5. [Native Integrations](#native-integrations)
6. [Security Considerations](#security-considerations)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Technical Challenges](#technical-challenges)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Noteece Ecosystem                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │  Desktop App     │              │  Mobile App      │       │
│  │  (Tauri + Rust)  │◄────sync────►│  (React Native)  │       │
│  │                  │              │                  │       │
│  │ ┌─────────────┐  │              │ ┌─────────────┐  │       │
│  │ │ SQLCipher DB │  │              │ │ SQLCipher DB │  │       │
│  │ │  (Primary)   │  │              │ │  (Replica)   │  │       │
│  │ └─────────────┘  │              │ └─────────────┘  │       │
│  │                  │              │                  │       │
│  │ • 18 Extractors  │              │ • Read-only view │       │
│  │ • WebView Sync   │              │ • Share Target   │       │
│  │ • Full CRUD      │              │ • Notifications  │       │
│  └─────────────────┘              └─────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

**1. Desktop-Centric**

- Desktop is the **source of truth**
- Mobile is a **read-mostly replica**
- Extractors run on desktop only (WebView complexity)
- Mobile syncs from desktop, doesn't scrape platforms directly

**2. Local-First Sync**

- Sync over local network (WiFi)
- No cloud intermediary
- Optional cloud sync (user-controlled, encrypted)
- Offline-first mobile app

**3. Security Parity**

- Same encryption (SQLCipher + AEAD)
- Same master password
- Same privacy protections
- Biometric unlock (mobile convenience)

**4. Native Integration**

- iOS: Share Sheet, Notifications, Widgets
- Android: Share Target, Notifications, Widgets, Background Services
- Platform-specific features (Siri Shortcuts, Google Assistant)

---

## Technology Stack

### Mobile Framework: React Native

**Why React Native?**

- ✅ Cross-platform (iOS + Android from one codebase)
- ✅ TypeScript support (matches desktop frontend)
- ✅ Large ecosystem (libraries for everything)
- ✅ Near-native performance
- ✅ Hot reload (fast development)
- ❌ Not Rust (but can bridge to Rust via FFI)

**Alternatives Considered:**

- **Flutter**: Good, but different language (Dart)
- **Swift + Kotlin**: Native but 2× development work
- **Capacitor**: Similar to React Native, less mature
- **Tauri Mobile** (future): When stable, consider migration

### Core Technologies

**React Native Stack:**

```typescript
{
  "framework": "React Native 0.73+",
  "language": "TypeScript 5.0+",
  "ui": "React Native Paper (Material Design)",
  "navigation": "React Navigation 6+",
  "state": "TanStack Query (React Query)",
  "database": "SQLCipher for React Native",
  "crypto": "react-native-quick-crypto",
  "storage": "react-native-mmkv (encrypted)",
  "network": "axios + mDNS (for local sync)"
}
```

**Native Modules (iOS):**

- Share Extension (Swift)
- Background Sync (BackgroundTasks API)
- Keychain (for master password)
- Local Authentication (Face ID / Touch ID)
- Widgets (SwiftUI)

**Native Modules (Android):**

- Share Target (Kotlin)
- Background Service (WorkManager)
- Keystore (for master password)
- Biometric Auth (BiometricPrompt)
- Widgets (Jetpack Compose)

### Rust Integration (Optional)

**Why Rust on Mobile?**

- Reuse core logic (social module)
- Consistent encryption (same code as desktop)
- Performance-critical operations
- Trust existing, audited code

**How:**

```
Rust Core (packages/core-rs)
         ↓
    Compile to:
    • iOS: Static library (.a)
    • Android: JNI (.so)
         ↓
    React Native Bridge
         ↓
    JavaScript API
```

**Tools:**

- `cargo-ndk` (Android builds)
- `cargo-lipo` (iOS universal binary)
- `react-native-rust-bridge` or custom FFI

**Challenges:**

- Complex build setup
- Debugging across language boundaries
- Binary size (+5-10MB per architecture)
- May defer to pure TypeScript implementation

---

## Data Sync Protocol

### Sync Architecture

```
Desktop (Primary)            Mobile (Replica)
┌────────────────┐          ┌────────────────┐
│  SQLCipher DB  │          │  SQLCipher DB  │
│                │          │                │
│  18,000 posts  │──sync──► │  18,000 posts  │
│  5 accounts    │          │  5 accounts    │
│  10 categories │          │  10 categories │
└────────────────┘          └────────────────┘
         ↑                           │
         │                           │
         └───── sync changes ────────┘
              (categories, new accounts)
```

### Sync Protocol Options

**Option 1: Local Network Sync (Recommended)**

**How it Works:**

```
1. Desktop runs sync server (HTTP REST API)
   - Listens on local WiFi (e.g., 192.168.1.100:8080)
   - mDNS discovery (noteece._tcp.local)
   - TLS with self-signed cert (pinned on mobile)

2. Mobile discovers desktop via mDNS
   - Scans for noteece._tcp.local
   - Shows list of available desktops
   - User selects which desktop to sync with

3. Authentication
   - Mobile sends master password hash
   - Desktop verifies
   - Establishes encrypted session

4. Sync Protocol
   - Mobile sends last_sync_timestamp
   - Desktop returns all changes since then
   - Mobile applies changes to local DB
   - Bidirectional (mobile changes → desktop too)
```

**API Endpoints:**

```typescript
POST / api / v1 / auth; // Authenticate mobile client
GET / api / v1 / sync / status; // Get sync status
POST / api / v1 / sync / pull; // Pull changes from desktop
POST / api / v1 / sync / push; // Push changes to desktop
GET / api / v1 / accounts; // List accounts
GET / api / v1 / posts; // List posts (paginated)
GET / api / v1 / categories; // List categories
POST / api / v1 / category; // Create category (mobile → desktop)
```

**Security:**

```
• TLS 1.3 (self-signed cert)
• Certificate pinning on mobile
• Master password for auth
• JWT tokens for session
• Rate limiting (prevent brute force)
```

**Pros:**

- ✅ Fast (local network)
- ✅ Private (no cloud)
- ✅ No infrastructure cost
- ✅ Works offline (after initial sync)

**Cons:**

- ❌ Requires same WiFi network
- ❌ Desktop must be running
- ❌ No sync when traveling

---

**Option 2: Cloud Sync (Optional, Future)**

**How it Works:**

```
1. Desktop encrypts database
   - SQLCipher DB → Export → Encrypt with user key
   - Upload to user's cloud (S3, Dropbox, iCloud)

2. Mobile downloads encrypted blob
   - Decrypt with same user key
   - Import into local SQLCipher DB

3. Conflict Resolution
   - Last-write-wins (simple)
   - or CRDTs (complex but correct)
```

**User-Controlled Cloud:**

- User provides their own cloud storage
- Noteece never sees unencrypted data
- User pays for storage (if applicable)

**Pros:**

- ✅ Sync anywhere
- ✅ No desktop running required
- ✅ Backup included

**Cons:**

- ❌ Cloud cost (user pays)
- ❌ Slower than local
- ❌ Requires trust in cloud provider
- ❌ More complex encryption

---

**Option 3: Peer-to-Peer Sync (Future)**

**How it Works:**

- Desktop and mobile establish P2P connection
- Use libp2p or WebRTC Data Channels
- Sync over internet (NAT traversal)
- No cloud intermediary

**Pros:**

- ✅ No cloud
- ✅ Sync anywhere (not just local network)

**Cons:**

- ❌ Complex (NAT traversal, signaling)
- ❌ May require STUN/TURN servers (cost)
- ❌ Battery drain on mobile

---

### Sync Data Model

**Tables to Sync:**

```typescript
// Full sync
- social_account (read-only on mobile)
- social_post (read-only on mobile)
- social_category (read-write)
- social_post_category (read-write)
- social_focus_mode (read-write)
- social_automation_rule (read-write)

// Not synced (desktop-only)
- social_webview_session (desktop-specific)
- social_sync_history (desktop-specific)

// Not synced (mobile-only)
- mobile_share_history
- mobile_notification_history
```

**Sync Manifest:**

```json
{
  "last_sync": "2025-01-07T14:30:00Z",
  "changes": {
    "social_post": {
      "added": 42,
      "updated": 3,
      "deleted": 1
    },
    "social_category": {
      "added": 2,
      "updated": 0,
      "deleted": 0
    }
  },
  "conflicts": []
}
```

---

## Mobile Components

### React Native UI Components

**1. SocialHub.tsx** (Main Screen)

```typescript
/**
 * Main social feed screen
 * Shows unified timeline of all synced posts
 */
interface SocialHubProps {
  accounts: SocialAccount[];
  posts: TimelinePost[];
  categories: SocialCategory[];
  onRefresh: () => Promise<void>;
}

Features:
- Pull-to-refresh (triggers sync)
- Infinite scroll
- Platform filter chips
- Category filter chips
- Time range selector
- Search bar
```

**2. PostCard.tsx** (Post Display)

```typescript
/**
 * Individual post card in timeline
 * Matches desktop design
 */
interface PostCardProps {
  post: TimelinePost;
  onCategoryAssign: (categoryId: string) => void;
  onShare: () => void;
}

Features:
- Platform badge
- Author avatar + name
- Content (text + HTML)
- Media (images, videos)
- Engagement metrics
- Timestamp
- Category tags
- Share button
```

**3. AccountList.tsx** (Account Management)

```typescript
/**
 * List of connected accounts
 * Read-only (accounts added on desktop)
 */
interface AccountListProps {
  accounts: SocialAccount[];
  onAccountTap: (accountId: string) => void;
}

Features:
- Account avatar + username
- Platform badge
- Last sync time
- Enable/disable toggle (syncs to desktop)
- View account-specific posts
```

**4. CategoryPicker.tsx** (Category Assignment)

```typescript
/**
 * Bottom sheet for assigning categories
 * Write permission (syncs to desktop)
 */
interface CategoryPickerProps {
  categories: SocialCategory[];
  selectedCategoryIds: string[];
  onSelect: (categoryIds: string[]) => void;
}

Features:
- Multi-select
- Create new category (syncs to desktop)
- Color indicators
- Search categories
```

**5. SearchScreen.tsx** (Search Interface)

```typescript
/**
 * Full-text search across synced posts
 * Uses SQLite FTS5
 */
interface SearchScreenProps {
  onSearch: (query: string) => Promise<TimelinePost[]>;
}

Features:
- Search input with debounce
- Recent searches
- Search suggestions
- Filters (platform, category, time)
```

**6. AnalyticsScreen.tsx** (Insights)

```typescript
/**
 * Usage analytics and insights
 * Uses react-native-charts
 */
interface AnalyticsProps {
  posts: TimelinePost[];
  categories: SocialCategory[];
}

Features:
- Platform breakdown chart
- Activity timeline graph
- Category statistics
- Top posts
- Engagement metrics
```

**7. SettingsScreen.tsx** (App Settings)

```typescript
/**
 * App settings and sync config
 */
Features:
- Sync settings (frequency, WiFi-only)
- Biometric unlock toggle
- Notifications settings
- Cache management
- About / version
```

### Navigation Structure

```typescript
<RootNavigator>
  <BottomTabNavigator>
    <Tab name="Timeline" component={SocialHub} />
    <Tab name="Search" component={SearchScreen} />
    <Tab name="Analytics" component={AnalyticsScreen} />
    <Tab name="Settings" component={SettingsScreen} />
  </BottomTabNavigator>

  <StackNavigator>
    <Screen name="PostDetail" component={PostDetailScreen} />
    <Screen name="AccountPosts" component={AccountPostsScreen} />
    <Screen name="CategoryPosts" component={CategoryPostsScreen} />
    <Screen name="Sync" component={SyncScreen} />
  </StackNavigator>
</RootNavigator>
```

---

## Native Integrations

### iOS Share Extension

**Feature:** Share posts from Twitter, Instagram, etc. → Noteece

**How it Works:**

```
User in Twitter app
   ↓
Tap Share button
   ↓
Select "Save to Noteece"
   ↓
Share Extension opens
   ↓
Extract URL from share data
   ↓
Detect platform from URL
   ↓
Fetch post metadata (if possible)
   ↓
Save to local queue
   ↓
Background sync sends to desktop
```

**Implementation:**

```swift
// ShareExtension.swift
class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Extract shared URL
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = item.attachments,
              let provider = attachments.first else { return }

        provider.loadItem(forTypeIdentifier: "public.url", options: nil) { (url, error) in
            guard let shareURL = url as? URL else { return }

            // Detect platform
            let platform = detectPlatform(from: shareURL)

            // Save to queue
            saveToQueue(url: shareURL, platform: platform)

            // Dismiss
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
```

**Platforms Supported:**

- Twitter: twitter.com/user/status/ID
- Instagram: instagram.com/p/POST_ID
- YouTube: youtube.com/watch?v=VIDEO_ID
- TikTok: tiktok.com/@user/video/ID
- LinkedIn: linkedin.com/posts/...
- Reddit: reddit.com/r/sub/comments/ID
- Pinterest: pinterest.com/pin/ID

**User Experience:**

```
1. User browsing Twitter
2. Sees interesting post
3. Tap Share → "Save to Noteece"
4. Post saved instantly
5. Next sync: appears in desktop timeline
```

---

### Android Share Target

**Feature:** Same as iOS Share Extension

**Implementation:**

```kotlin
// ShareActivity.kt
class ShareActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        when (intent?.action) {
            Intent.ACTION_SEND -> {
                val sharedUrl = intent.getStringExtra(Intent.EXTRA_TEXT)
                if (sharedUrl != null) {
                    val platform = detectPlatform(sharedUrl)
                    saveToQueue(sharedUrl, platform)
                    finish()
                }
            }
        }
    }
}
```

**Manifest:**

```xml
<activity android:name=".ShareActivity">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>
</activity>
```

---

### Background Sync

**iOS: BackgroundTasks API**

```swift
import BackgroundTasks

func registerBackgroundTasks() {
    BGTaskScheduler.shared.register(
        forTaskWithIdentifier: "com.noteece.sync",
        using: nil
    ) { task in
        self.handleAppRefresh(task: task as! BGAppRefreshTask)
    }
}

func handleAppRefresh(task: BGAppRefreshTask) {
    // Connect to desktop
    // Pull latest posts
    // Update local DB
    // Show notification if new posts
    task.setTaskCompleted(success: true)
}
```

**Limitations:**

- iOS limits background execution (15-30s)
- Only works on WiFi (by default)
- Battery considerations

**Android: WorkManager**

```kotlin
class SyncWorker(appContext: Context, workerParams: WorkerParameters)
    : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        // Connect to desktop
        // Pull latest posts
        // Update local DB
        // Show notification if new posts
        return Result.success()
    }
}

// Schedule periodic sync
val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
    30, TimeUnit.MINUTES  // Every 30 min
)
.setConstraints(
    Constraints.Builder()
        .setRequiredNetworkType(NetworkType.UNMETERED)  // WiFi only
        .build()
)
.build()

WorkManager.getInstance(context).enqueue(syncRequest)
```

---

### Notifications

**Use Cases:**

1. **New Posts Synced**: "42 new posts from 3 platforms"
2. **Focus Mode Reminder**: "Deep Work mode is active"
3. **Sync Complete**: "Synced with desktop"
4. **Sync Error**: "Can't connect to desktop"

**Implementation:**

```typescript
// React Native Push Notification
import PushNotification from "react-native-push-notification";

PushNotification.localNotification({
  channelId: "noteece-sync",
  title: "Sync Complete",
  message: "42 new posts from 3 platforms",
  playSound: true,
  soundName: "default",
});
```

**Android Channels:**

```
- noteece-sync: Sync notifications
- noteece-focus: Focus mode reminders
- noteece-alerts: Important alerts
```

**iOS Categories:**

```
- NoteeceSync
- NoteeceFocus
- NoteeceAlerts
```

---

### Widgets

**iOS Widget (SwiftUI)**

```swift
struct SocialTimelineWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SocialTimelineWidget", provider: Provider()) { entry in
            SocialTimelineWidgetView(entry: entry)
        }
        .configurationDisplayName("Social Timeline")
        .description("Recent posts from your social accounts")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct SocialTimelineWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading) {
            ForEach(entry.posts) { post in
                HStack {
                    Image(systemName: platformIcon(post.platform))
                    Text(post.author)
                    Spacer()
                    Text(post.timestamp, style: .relative)
                }
                Text(post.content)
                    .lineLimit(2)
            }
        }
    }
}
```

**Android Widget (Jetpack Compose)**

```kotlin
@Composable
fun SocialTimelineWidget() {
    val posts = remember { getRecentPosts(limit = 5) }

    Column {
        posts.forEach { post ->
            Row {
                Icon(platformIcon(post.platform))
                Text(post.author)
                Spacer()
                Text(formatRelativeTime(post.timestamp))
            }
            Text(
                text = post.content,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
```

**Widget Sizes:**

- Small: Post count per platform
- Medium: 3-5 recent posts
- Large: 10 recent posts + mini analytics

---

## Security Considerations

### Encryption

**Same as Desktop:**

- SQLCipher database encryption
- XChaCha20-Poly1305 for credentials
- Argon2 password hashing

**Mobile-Specific:**

- Biometric unlock (optional convenience)
- Secure Enclave / Keystore for master password
- App sandbox (iOS/Android enforced)

### Master Password Storage

**Option 1: Never Store (Most Secure)**

- User enters password on every app launch
- Annoying but most secure
- Lost password = no recovery

**Option 2: Biometric Unlock (Recommended)**

```
First time:
→ User enters master password
→ Derive DEK from password
→ Encrypt DEK with biometric key
→ Store encrypted DEK in Keychain/Keystore

Subsequent launches:
→ User authenticates with Face ID / Fingerprint
→ Decrypt DEK from Keychain/Keystore
→ Unlock database

Security:
→ Biometric key never leaves Secure Enclave / Keystore
→ DEK encrypted at rest
→ Biometric can be disabled (falls back to password)
```

**iOS Keychain:**

```swift
// Store encrypted DEK
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "noteece-dek",
    kSecValueData as String: encryptedDEK,
    kSecAttrAccessControl as String: sacObject
]

SecItemAdd(query as CFDictionary, nil)

// Retrieve with biometric
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "noteece-dek",
    kSecReturnData as String: true,
    kSecUseOperationPrompt as String: "Unlock Noteece"
]

var item: CFTypeRef?
let status = SecItemCopyMatching(query as CFDictionary, &item)
// User prompted for Face ID / Touch ID
```

**Android Keystore:**

```kotlin
// Generate biometric key
val keyGenerator = KeyGenerator.getInstance(
    KeyProperties.KEY_ALGORITHM_AES,
    "AndroidKeyStore"
)
val keyGenParameterSpec = KeyGenParameterSpec.Builder(
    "noteece-dek-key",
    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
)
.setBlockModes(KeyProperties.BLOCK_MODE_GCM)
.setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
.setUserAuthenticationRequired(true)
.setUserAuthenticationValidityDurationSeconds(30)
.build()

keyGenerator.init(keyGenParameterSpec)
val key = keyGenerator.generateKey()

// Encrypt DEK with biometric key
val cipher = Cipher.getInstance("AES/GCM/NoPadding")
cipher.init(Cipher.ENCRYPT_MODE, key)
val encryptedDEK = cipher.doFinal(dek)

// Store encrypted DEK in shared preferences (encrypted)
```

### Network Security

**TLS Configuration:**

```typescript
// Certificate pinning
const pinnedCert = `
-----BEGIN CERTIFICATE-----
[Desktop's self-signed cert]
-----END CERTIFICATE-----
`;

axios.get("https://192.168.1.100:8080/api/v1/sync/status", {
  httpsAgent: new https.Agent({
    ca: pinnedCert,
    rejectUnauthorized: true,
  }),
});
```

**mDNS Security:**

- mDNS traffic not encrypted (discovery only)
- Actual sync over TLS
- Authenticate before sync (password check)

---

## Implementation Roadmap

### Phase 1: Foundation (4 weeks)

**Week 1: Project Setup**

- [ ] Initialize React Native project
- [ ] Configure TypeScript
- [ ] Set up navigation (React Navigation)
- [ ] Integrate SQLCipher for React Native
- [ ] Set up dev environment (iOS + Android)

**Week 2: Database & Sync**

- [ ] Port database schema to mobile SQLCipher
- [ ] Implement data models (TypeScript)
- [ ] Create sync protocol client
- [ ] Implement mDNS discovery
- [ ] Basic sync (pull only)

**Week 3: UI Components**

- [ ] Create SocialHub (timeline)
- [ ] Create PostCard component
- [ ] Create AccountList
- [ ] Create CategoryPicker
- [ ] Implement pull-to-refresh

**Week 4: Core Features**

- [ ] Full-text search (FTS5)
- [ ] Filtering (platform, category, time)
- [ ] Infinite scroll
- [ ] Category assignment
- [ ] Settings screen

### Phase 2: Native Integration (4 weeks)

**Week 5: Share Extensions**

- [ ] iOS Share Extension
- [ ] Android Share Target
- [ ] URL detection & parsing
- [ ] Queue management
- [ ] Sync queued shares to desktop

**Week 6: Background Sync**

- [ ] iOS BackgroundTasks integration
- [ ] Android WorkManager integration
- [ ] WiFi-only constraint
- [ ] Battery optimization
- [ ] Error handling & retry

**Week 7: Notifications**

- [ ] Push notification setup
- [ ] Notification channels (Android)
- [ ] Notification categories (iOS)
- [ ] New posts notifications
- [ ] Focus mode reminders
- [ ] Sync status notifications

**Week 8: Widgets**

- [ ] iOS Widget (SwiftUI)
- [ ] Android Widget (Jetpack Compose)
- [ ] Timeline preview
- [ ] Analytics summary
- [ ] Widget configuration

### Phase 3: Polish & Release (4 weeks)

**Week 9: Biometric Auth**

- [ ] iOS Face ID / Touch ID
- [ ] Android Biometric Prompt
- [ ] Keychain / Keystore integration
- [ ] Fallback to password
- [ ] Security settings

**Week 10: Analytics**

- [ ] Port analytics dashboard to mobile
- [ ] Charts (react-native-charts)
- [ ] Platform breakdown
- [ ] Activity timeline
- [ ] Category stats

**Week 11: Testing**

- [ ] Unit tests (Jest)
- [ ] Integration tests
- [ ] E2E tests (Detox)
- [ ] Manual testing (TestFlight / Play Beta)
- [ ] Performance profiling

**Week 12: Release**

- [ ] App Store submission (iOS)
- [ ] Play Store submission (Android)
- [ ] Documentation
- [ ] Marketing materials
- [ ] Launch!

**Total:** 12 weeks (3 months)

---

## Technical Challenges

### 1. SQLCipher on Mobile

**Challenge:** SQLCipher requires native compilation, complex on React Native

**Solutions:**

- Use `react-native-sqlcipher-storage` (maintained fork)
- Or `@journeyapps/react-native-quick-sqlite` + SQLCipher patch
- Pre-compiled binaries for common architectures
- CI/CD for custom builds

**Fallback:** Pure JavaScript encryption (slower but works)

---

### 2. mDNS Discovery

**Challenge:** mDNS not natively supported in React Native

**Solutions:**

- iOS: Use NWBrowser (Network framework) via native module
- Android: Use NsdManager via native module
- Fallback: Manual IP entry

**Libraries:**

- `react-native-zeroconf`
- Custom native module (preferred)

---

### 3. Background Sync Limitations

**Challenge:** iOS severely limits background execution

**Solutions:**

- Use BackgroundTasks API (30s max)
- Optimize sync (incremental, only new data)
- User expectation: Not real-time, syncs periodically
- Prompt user to open app for full sync

**Android:** More permissive, but battery drain concerns

---

### 4. Database Size on Mobile

**Challenge:** 10,000+ posts = large database, slow queries

**Solutions:**

- Limit mobile replica (e.g., last 30 days only)
- Lazy loading (fetch older posts on demand)
- Optimize indexes for mobile queries
- Periodic cleanup

---

### 5. Conflict Resolution

**Challenge:** User edits category on mobile, edits same category on desktop

**Solutions:**

- Last-write-wins (simple, may lose data)
- CRDTs (complex, correct)
- Timestamp + user prompt (manual resolution)

**Recommendation:** Start with last-write-wins, add CRDTs later

---

### 6. Binary Size

**Challenge:** React Native + SQLCipher + native libs = large app

**Solutions:**

- Enable Hermes (JS engine, smaller)
- ProGuard / R8 (Android minification)
- Remove unused dependencies
- Split APKs by architecture (Android)

**Expected Size:**

- iOS: 40-60 MB
- Android: 30-50 MB (split APKs)

---

## Conclusion

The mobile implementation extends Noteece's local-first social media suite to iOS and Android, maintaining the same security and privacy standards while integrating with native mobile features. The architecture prioritizes:

1. **Desktop as source of truth** (extractors run on desktop)
2. **Local-first sync** (no cloud, optional user-controlled cloud)
3. **Security parity** (same encryption, biometric convenience)
4. **Native integration** (share sheets, notifications, widgets)

**Estimated Timeline:** 12 weeks (3 months)
**Team Size:** 1-2 mobile developers

**Next Steps:**

1. Finalize sync protocol specification
2. Build desktop sync server (HTTP REST API)
3. Prototype React Native app with basic sync
4. Implement native integrations
5. Beta test with early users
6. Release to App Store & Play Store

---

_Noteece Social Media Suite - Mobile Architecture_
_Version 1.0 - January 2025_
_Design Document - Not Yet Implemented_
