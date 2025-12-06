# Prime Interception (Android Sideload)

**Prime Interception** is the flagship feature of the Noteece Android "Prime" flavor (Sideload only). It allows Noteece to act as an intelligent layer *over* other applications, capturing context and linking it to your knowledge base without relying on official "Share" menus.

## 1. The Architecture

The system consists of three distinct layers interacting across process boundaries.

### Layer A: The Overlay Service (Java/Kotlin)
*Component:* `OverlayService.kt`
*Type:* Android Accessibility Service + System Alert Window.
*Role:*
- **Draws UI:** Renders the floating "N" button (the Anchor) on top of other apps.
- **Reads Screen:** Uses `AccessibilityEvent` to traverse the View Hierarchy of the active app.
- **Extracts Text:** Identifies `TextView`, `EditText`, and `ContentDescription` nodes to gather raw text.
- **Extracts Metadata:** Grabs Package Name (e.g., `com.twitter.android`), Activity Name, and Screen Bounds.

### Layer B: The JSI Bridge (C++)
*Component:* `NoteeceCore.cpp`
*Role:*
- Acts as the high-performance glue between the Java layer and the React Native JavaScript runtime.
- Methods like `nativeProcessStream(text, metadata)` allow passing large strings without the serialization overhead of the old RN Bridge.

### Layer C: The Stream Processor (Rust)
*Component:* `stream_processor.rs`
*Role:*
- **Ingestion:** Receives the raw text stream from the Overlay.
- **Deduplication:** Uses a Bloom Filter (and simple history buffer) to ignore text we just processed (e.g., while scrolling).
- **Pattern Matching:** Regex engines (`social/processing/extractors/`) look for known patterns (e.g., "Tweet by @user", "YouTube Video Title").
- **Insight Generation:** If a pattern matches, it structures the data into a `SocialPost` or `ContextItem`.

## 2. The Workflow: "Anchoring"

1.  **User Action:** User sees a tweet they want to remember. They tap the floating Noteece button.
2.  **Snapshot:** The `OverlayService` freezes the current accessibility tree.
3.  **Heuristics:** It calculates the bounds of the content on screen.
4.  **Capture:** It sends the text + coordinates to the Rust core.
5.  **Creation:** Noteece creates a new Note (or opens a Quick Note modal).
6.  **Linking:** The Note includes a "Backlink" to the app content.
    - *Format:* `noteece://anchor?pkg=com.twitter.android&data=...`
    - *Future:* Deep linking to re-open that specific tweet.

## 3. Privacy & Security

This feature requires the dangerous `BIND_ACCESSIBILITY_SERVICE` permission.

- **Whitelisting:** Prime only activates for specific apps defined in `socialConfig.ts` (e.g., Twitter, LinkedIn, Chrome). It stays dormant in banking apps or settings.
- **Local Processing:** All text extraction happens in Rust memory. No data is sent to a cloud server.
- **Transparency:** A persistent notification is required by Android when the service is running.
- **Isolation:** The captured data is encrypted immediately upon saving to the database.

## 4. Technical Challenges

- **DOM Thrashing:** Accessibility events fire thousands of times per second during scrolling. We use debouncing and the Bloom filter to prevent CPU spikes.
- **Obfuscation:** Apps like Facebook use `View` classes with obfuscated names (`x.y.z.View`). We rely on text heuristics ("Like", "Comment", "Share" proximity) rather than class names.
- **Battery:** Constant screen reading drains battery. The service aggressively pauses itself when the screen is off or Noteece is backgrounded.

## 5. Why Sideload?

Google Play policies (and Apple App Store rules) strictly forbid apps from using Accessibility Services for anything other than assisting users with disabilities. "Productivity" is not a valid use case for them. Therefore, this feature cannot exist in the Store version.

---

**References:**
- [Android AccessibilityService API](https://developer.android.com/reference/android/accessibilityservice/AccessibilityService)
- [React Native JSI](https://reactnative.dev/docs/the-new-architecture/landing-page)
