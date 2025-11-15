# Share Extensions for Noteece Mobile

This document explains the iOS Share Extension and Android Share Target implementation for Noteece, allowing users to share content from other apps directly into the Social Hub.

## Overview

The share extension system consists of three main components:

1. **Expo Config Plugin** (`plugins/withShareExtension.js`)
   - Automatically configures native projects during build
   - Creates iOS Share Extension target with Swift code
   - Configures Android Share Target intent filters

2. **Share Handler** (`src/lib/share-handler.ts`)
   - Processes shared content from native storage
   - Manages pending items queue
   - Provides API for UI integration

3. **UI Integration** (`src/hooks/useSharedContent.ts` + `SocialHub.tsx`)
   - Displays shared content banner
   - Allows users to review and process shared items
   - Syncs with app state and deep links

## How It Works

### iOS Share Extension

When a user shares content from another app (Safari, Twitter, Instagram, etc.):

1. iOS displays the Share Sheet with "Share to Noteece" option
2. User selects Noteece, triggering the Share Extension
3. Share Extension extracts the content (URL, text, or image)
4. Content is saved to App Group UserDefaults (`group.com.noteece.app.social`)
5. Share Extension closes with "Saving to Noteece..." feedback
6. Main app launches (via deep link or next open)
7. Share Handler reads from App Group and queues items
8. SocialHub displays shared content banner
9. User taps item to process or dismiss

**Supported Content Types:**

- URLs (web links, social media posts)
- Plain text
- Images (up to 5)

### Android Share Target

When a user shares content from another app:

1. Android displays Share menu with "Share to Noteece" option
2. User selects Noteece, triggering ShareActivity
3. ShareActivity extracts the content from Intent
4. Content is saved to SharedPreferences (`noteece_shared_items`)
5. ShareActivity launches main app with intent extra
6. Share Handler reads from SharedPreferences and queues items
7. SocialHub displays shared content banner
8. User taps item to process or dismiss

**Supported Content Types:**

- Text (plain text, shared text)
- Images (single or multiple)

## Building with Share Extensions

### Prerequisites

- EAS Build account (required for building with config plugins)
- iOS: Valid provisioning profile with App Groups capability
- Android: No special requirements

### Build Configuration

The share extension is configured automatically via the Expo config plugin:

```json
{
  "expo": {
    "plugins": ["./plugins/withShareExtension.js"]
  }
}
```

### Building for iOS

```bash
# Development build (with share extension)
eas build --profile development --platform ios

# Production build
eas build --profile production --platform ios
```

**Important:** The iOS Share Extension requires the App Groups entitlement, which is automatically configured by the plugin:

- App Group ID: `group.com.noteece.app.social`
- Configured in both main app and share extension targets

### Building for Android

```bash
# Development build (with share target)
eas build --profile development --platform android

# Production build
eas build --profile production --platform android
```

The plugin automatically:

- Creates `ShareActivity.kt` in the app package
- Adds intent filters to `AndroidManifest.xml`
- Configures share target for text and images

## Testing

### Testing iOS Share Extension

1. Build and install the app on a physical device or simulator
2. Open Safari and navigate to any website
3. Tap the Share button (square with up arrow)
4. Scroll down and tap "Share to Noteece"
5. Share extension should appear with "Saving to Noteece..." message
6. Open Noteece app
7. Navigate to Social tab
8. Shared content banner should appear at top

**Troubleshooting:**

- If extension doesn't appear: Check App Groups entitlement in Xcode
- If content not appearing: Check UserDefaults with key `sharedItems`
- View logs in Xcode for debugging

### Testing Android Share Target

1. Build and install the app on a physical device or emulator
2. Open any app (Chrome, Twitter, Instagram, etc.)
3. Find content to share (link, text, or image)
4. Tap the Share button
5. Select "Share to Noteece"
6. Noteece app should open
7. Navigate to Social tab
8. Shared content banner should appear at top

**Troubleshooting:**

- If Noteece doesn't appear: Check AndroidManifest.xml has ShareActivity
- If content not appearing: Check SharedPreferences with `adb`
- View logs with `adb logcat -s ReactNativeJS ShareActivity`

## Architecture

### Data Flow

```
Other App
    ↓ (User shares)
Share Extension/Target
    ↓ (Saves to native storage)
App Group / SharedPreferences
    ↓ (App reads on launch/foreground)
Share Handler
    ↓ (Queues in AsyncStorage)
Pending Items Queue
    ↓ (Displayed in UI)
SocialHub Banner
    ↓ (User processes)
Social Database
```

### Native Storage

**iOS (App Group):**

```swift
let appGroupId = "group.com.noteece.app.social"
let userDefaults = UserDefaults(suiteName: appGroupId)
userDefaults.set(sharedItems, forKey: "sharedItems")
```

**Android (SharedPreferences):**

```kotlin
val prefs = getSharedPreferences("noteece_shared_items", Context.MODE_PRIVATE)
prefs.edit().putString("items", itemsJson).apply()
```

### Pending Items Queue

Shared items are stored in AsyncStorage as JSON:

```typescript
{
  "type": "url" | "text" | "image",
  "url": string,
  "text": string,
  "timestamp": number,
  "savedAt": number,
  "processedAt": number | null
}
```

Items are:

- Added when read from native storage
- Marked as processed when user taps "Process"
- Cleaned up after 24 hours

## Limitations

### Current Implementation

The current implementation uses a **placeholder pattern** for native module access:

- iOS App Group reading is not yet implemented (requires native module)
- Android SharedPreferences reading is not yet implemented (requires native module)
- Share extensions work but require manual native module integration

### Future Improvements

To complete the implementation:

1. **Create Native Module** for reading App Group/SharedPreferences:

   ```typescript
   // Future API
   import { SharedStorage } from "./native-modules/SharedStorage";
   const items = await SharedStorage.getItems();
   ```

2. **Alternative: Use Deep Linking**
   - Share extension could launch app with deep link containing data
   - Avoids need for native module
   - Limited by URL length for large content

3. **Alternative: Use expo-shared-preferences** (if available)
   - Community package for SharedPreferences access
   - Would work for both iOS and Android

## File Structure

```
apps/mobile/
├── plugins/
│   └── withShareExtension.js        # Expo config plugin
├── src/
│   ├── lib/
│   │   ├── share-handler.ts         # Share content processing
│   │   └── social-security.ts       # Biometric lock for shared content
│   ├── hooks/
│   │   └── useSharedContent.ts      # React hook for shared content
│   └── screens/
│       └── SocialHub.tsx            # UI integration
└── docs/
    └── SHARE_EXTENSIONS.md          # This file
```

## Security Considerations

### iOS App Groups

- App Groups are sandboxed to your app and extensions
- Data is encrypted at rest by iOS
- Cannot be accessed by other apps

### Android SharedPreferences

- SharedPreferences are private to your app
- Stored in app's data directory
- Can be backed up (consider excluding if sensitive)

### Biometric Protection

Shared content respects the biometric lock setting:

- If biometric lock enabled for Social Hub
- User must authenticate before viewing shared items
- Session-based (locks when app backgrounds)

## API Reference

### useSharedContent Hook

```typescript
const {
  hasSharedContent, // boolean: Are there unprocessed items?
  sharedItems, // SharedItem[]: Array of pending items
  processItems, // (timestamps: number[]) => Promise<void>
  refresh, // () => Promise<void>: Reload from native storage
} = useSharedContent();
```

### Share Handler Functions

```typescript
// Get shared items from native storage
getSharedItems(): Promise<SharedItem[]>

// Clear shared items from native storage
clearSharedItems(): Promise<void>

// Process shared items (move to pending queue)
processSharedItems(): Promise<number>

// Get pending items for display
getPendingItems(): Promise<PendingItem[]>

// Mark items as processed
markItemsProcessed(timestamps: number[]): Promise<void>

// Cleanup old processed items
cleanupProcessedItems(): Promise<void>
```

## Contributing

To contribute to the share extension implementation:

1. Test on both iOS and Android
2. Handle edge cases (large content, multiple items, errors)
3. Add unit tests for share handler logic
4. Document any changes to the config plugin
5. Update this documentation

## Resources

- [iOS Share Extension Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Share.html)
- [Android Sharing Simple Data](https://developer.android.com/training/sharing)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)
- [App Groups (iOS)](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_application-groups)

## License

Same as Noteece project license.
