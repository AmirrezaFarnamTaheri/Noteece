# Next Steps & Future Roadmap

This document outlines a comprehensive vision for the future of **Noteece**, expanding on its current "Production Ready" foundation. It serves as a guide for developers, designers, and product managers to take the project to the next level.

---

## 1. Core Architecture & Infrastructure

### 1.1. Decentralized Identity & Sync

- **DID (Decentralized Identity) Integration:** Move beyond simple user IDs to full W3C DIDs (e.g., `did:key` or `did:ion`) to allow for verifiable credentials and portable identity across vaults.
- **Relay Server Implementation:** While local-first P2P is great, an optional, blind relay server (encrypted store-and-forward) would dramatically improve sync reliability for devices not on the same LAN.
- **CRDT Optimization:** Implement delta-based CRDTs for the SQLite database itself (using `cr-sqlite` or similar) to allow for finer-grained conflict resolution at the row/column level rather than the entity level.
- **Multi-Vault Support:** Allow users to switch between entirely separate vaults (e.g., "Personal", "Work", "Creative") with distinct encryption keys and sync scopes.

### 1.2. Security Enhancements

- **Hardware Key Support:** Integrate YubiKey/WebAuthn for unlocking the vault, adding a physical layer of security.
- **Plausible Deniability:** Implement a "hidden volume" feature where a secondary password unlocks a dummy vault, useful for situations where user coercion is a threat.
- **[Done] Audit Logs:** Create a tamper-evident, encrypted log of all data access and modification events within the vault for user review. (Backend implementation complete in v14 migration).

### 1.3. Plugin System

- **WASM-Based Plugins:** Build a plugin architecture using WebAssembly (WASM). This allows 3rd party developers to write safe, sandboxed extensions in Rust, Go, or TypeScript that can manipulate notes and views without compromising core security.
- **UI Extension Points:** Define a strict API for plugins to inject widgets into the Dashboard or add new tabs to the Project Hub.

---

## 2. AI & Intelligence (Local-First)

### 2.1. On-Device LLM Integration

- **Local Inference:** Integrate lightweight LLMs (like Llama-3-8B-Quantized) running directly on the user's device (via `wgpu` in Rust or CoreML on mobile).
- **RAG (Retrieval-Augmented Generation):** Use the existing FTS5 and vector embeddings (already partially implemented) to let users "Chat with their Vault".
  - _Example:_ "What was the decision we made about the database schema last month?"
- **Auto-Tagging & Linking:** An agent that runs in the background to suggest tags and bi-directional links between notes based on semantic similarity.

### 2.2. proactive Insights

- **Personal Knowledge Graph:** Visualize the connections between notes, people, and dates in a 3D interactive graph.
- **Habit Correlation:** Correlate data from the Health Hub (e.g., sleep quality) with productivity metrics (e.g., tasks completed) to offer personalized advice.
  - _Insight:_ "You complete 30% more tasks on days you sleep >7 hours."

---

## 3. User Experience (UI/UX)

### 3.1. "Zen Mode" & Focus

- **[Done] Distraction-Free Editor (Zen Mode):** A writing mode that fades out all UI elements, leaving only the text. (Basic implementation complete).
- **Typewriter Scrolling:** Keep the cursor vertically centered to reduce eye strain.
- **Focus Timer Integration:** Link the Pomodoro timer to specific tasks, automatically enabling "Do Not Disturb" on the OS level (via system APIs) during focus sessions.

### 3.2. Mobile Experience

- **Quick Capture Widgets:** Home screen widgets for iOS/Android that allow one-tap entry of thoughts, voice notes, or camera captures directly into the daily note.
- **Share Sheet Integration:** Full integration with the OS share sheet to "Save to Noteece" from any app (browser, gallery, news reader).
- **Voice-to-Text:** Local, offline voice transcription for dictating notes on the go.

### 3.3. Visual Polish

- **Theming Engine:** Allow users to share and install community themes (CSS/JSON based).
- **Micro-Interactions:** Add subtle animations (confetti on task completion, smooth transitions between views) to make the app feel alive and premium.

---

## 4. Feature Expansion

### 4.1. Collaboration (Local-First)

- **Shared Folders:** Allow sharing a specific subset of notes (a folder or tag) with another user via a secure, invite-only P2P channel.
- **Real-Time Editing:** Implement CRDT-based real-time collaborative editing for shared notes (similar to Google Docs but p2p).

### 4.2. Multimedia & Files

- **PDF Annotation:** Built-in PDF viewer with highlight and annotation capabilities, saving annotations as Markdown/JSON sidecars.
- **Audio/Video Transcription:** Automatically generate transcripts for attached audio/video files to make them searchable.
- **Whiteboard/Canvas:** An infinite canvas (like Obsidian Canvas or Heptabase) for spatial organization of notes, images, and connection lines.

### 4.3. Task Management Evolution

- **Calendar Integration:** Two-way sync with system calendars (Google, iCloud, Outlook) via CalDAV.
- **Gantt Charts:** Auto-generate Gantt charts for projects based on task start/due dates and dependencies.
- **Recurring Tasks:** Advanced recurrence rules (e.g., "Last Friday of every month", "3 days after completion").

---

## 5. Developer Experience & Quality

### 5.1. Testing Strategy

- **Snapshot Testing:** Implement visual regression testing (Playwright/Storybook) to catch UI breaks.
- **Fuzz Testing:** Use `cargo-fuzz` on the backend parsers and sync protocol to find edge cases and potential crashes.

### 5.2. Documentation

- **Interactive API Docs:** Generate an OpenAPI spec for the IPC bridge (Tauri commands) to help frontend developers understand the backend capabilities.
- **Architecture Decision Records (ADRs):** Formalize the process of documenting architectural choices in `docs/adr/`.

### 5.3. Performance

- **Virtualization:** Ensure all lists (notes, tasks) use windowing/virtualization to handle vaults with 100,000+ items without lag.
- **Lazy Loading:** Defer loading of heavy assets (images, large graphs) until they scroll into view.

---

## 6. Publishing & Ecosystem

### 6.1. Public Gardens

- **Static Site Generation:** One-click "Publish" feature that generates a static HTML website from a selected folder of notes (Digital Garden), which can be hosted on GitHub Pages or Vercel.

### 6.2. Import/Export

- **Universal Importer:** Build robust importers for Evernote (.enex), Apple Notes, and Google Keep.
- **Print Support:** High-quality styling for printing notes to PDF or paper.

---

_This document is a living roadmap. Priorities may shift based on user feedback and technical discoveries._
