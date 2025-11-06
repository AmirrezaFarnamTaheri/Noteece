# Noteece Quick Start Guide

Welcome to Noteece! This guide will help you get started with minimal technical knowledge.

## What is Noteece?

Noteece is a **secure, private note-taking and task management app** that works entirely on your device. Your data is encrypted and never leaves your computer unless you choose to sync it with other devices.

Think of it as a combination of:
- 📝 A note-taking app (like Notion or Obsidian)
- ✅ A task manager (like Todoist)
- 📊 A project tracker
- 🎯 A life organizer

**Key Benefits:**
- ✅ **Completely Private** - Your notes are encrypted with a password only you know
- ✅ **Works Offline** - No internet required
- ✅ **No Account Needed** - No sign-up, no emails, no tracking
- ✅ **Your Data, Your Control** - Export anytime to standard formats

---

## Installing Noteece

### Desktop (Windows, Mac, Linux)

#### Option 1: Download Pre-Built App (Recommended)

1. **Visit the Downloads Page**
   - Go to [releases page](https://github.com/AmirrezaFarnamTaheri/Noteece/releases)

2. **Choose Your Version**
   - **Windows**: Download the `.msi` file
   - **Mac**: Download the `.dmg` file
   - **Linux**: Download the `.AppImage` or `.deb` file

3. **Install the App**
   - **Windows**: Double-click the `.msi` file and follow the installer
   - **Mac**: Open the `.dmg` file and drag Noteece to Applications
   - **Linux**: Make the `.AppImage` executable or install the `.deb` package

4. **Open Noteece**
   - Find Noteece in your Applications or Start Menu
   - Click to launch

#### Option 2: Build from Source (Advanced Users)

If you're comfortable with command line:

```bash
# Install prerequisites
# - Node.js v18 or later
# - Rust (latest stable)
# - pnpm

# Clone and build
git clone https://github.com/AmirrezaFarnamTaheri/Noteece.git
cd noteece
pnpm install
cd apps/desktop
pnpm build:tauri
```

### Mobile (iOS & Android)

#### Current Status: In Development

The mobile app is currently in development. Features include:
- Same secure encrypted vault as desktop
- Works offline with background sync
- Quick capture with voice and camera
- Location-based reminders
- NFC tag triggers

**Coming Soon:**
- iOS: TestFlight beta (Q1 2026)
- Android: Google Play beta (Q1 2026)

---

## First Time Setup

### Step 1: Create Your Vault

When you first open Noteece, you'll create a **vault** - think of it as your encrypted workspace.

1. **Choose a Strong Password**
   - At least 8 characters
   - Mix of letters, numbers, and symbols
   - Write it down somewhere safe!
   - ⚠️ **Important**: There's NO password recovery. If you forget it, your data is lost.

2. **Confirm Your Password**
   - Type it again to make sure it's correct

3. **Save Your Recovery Codes** (if shown)
   - These are backup codes in case you forget your password
   - Print them or save them in a password manager
   - Keep them somewhere VERY safe

### Step 2: Understanding the Interface

After creating your vault, you'll see the **main interface**:

#### Desktop Layout

```
┌─────────────────────────────────────────────────────┐
│  Sidebar          │  Main Area                      │
│                   │                                  │
│  📝 Notes         │  Your content appears here      │
│  ✅ Tasks         │                                  │
│  📊 Projects      │  This is where you write,       │
│  📅 Calendar      │  edit, and view your notes      │
│  🎯 Goals         │                                  │
│  ⚙️ Settings     │                                  │
│                   │                                  │
└─────────────────────────────────────────────────────┘
```

#### Mobile Layout

```
┌─────────────────────┐
│   📱 Top Bar        │
│  Noteece            │
├─────────────────────┤
│                     │
│   Your Content      │
│                     │
│                     │
├─────────────────────┤
│  📝  ✅  📊  🎯  ⚙️  │
│  Bottom Navigation  │
└─────────────────────┘
```

---

## Basic Usage

### Creating a Note

#### Desktop
1. Click **"Notes"** in the sidebar
2. Click the **"+ New Note"** button (top right)
3. Type your note title
4. Start writing in the editor
5. Your note saves automatically

#### Mobile
1. Tap the **"+"** button (floating action button)
2. Choose **"Note"**
3. Type your title and content
4. Tap **"Done"** or back button (saves automatically)

### Creating a Task

#### Desktop
1. Click **"Tasks"** in the sidebar
2. Click **"+ New Task"**
3. Enter task name
4. (Optional) Set due date and priority
5. Click **"Create"**

#### Mobile
1. Tap the **"+"** button
2. Choose **"Task"**
3. Enter task details
4. Tap **"Create"**

### Quick Capture (Mobile)

The fastest way to save thoughts on mobile:

1. **Open the Capture Tab** (middle tab)
2. **Speak or Type**
   - Tap microphone for voice input
   - Or type directly
3. **Automatic Save**
   - It saves automatically as you go
   - No need to tap "Save"

### Using Markdown (Optional)

Noteece understands **Markdown**, a simple way to format text:

```markdown
# Big Heading
## Medium Heading

**bold text**
*italic text*

- Bullet point
- Another point

1. Numbered list
2. Another item

[[Link to Another Note]]
```

**Don't worry!** You don't need to learn Markdown. The editor has buttons for formatting.

---

## Key Features Explained Simply

### 🔍 Search Everything

**Desktop:** Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
**Mobile:** Tap the search icon in the top bar

Type anything to find notes, tasks, or projects instantly.

### 🏷️ Tags

Organize your notes with tags:

```
#work #important #todo
```

Click any tag to see all notes with that tag.

### 📅 Calendar View

See your tasks and events on a calendar:

1. Go to **Calendar** in the sidebar/tab
2. Click any day to see what's due
3. Drag tasks to reschedule (desktop)

### 📊 Dashboard

Your productivity overview:

- **Today's Tasks**: What's due today
- **Activity**: How much you've written
- **Progress**: Task completion stats
- **Goals**: Long-term goal tracking

### 🔄 Sync (Optional)

Sync your data across devices:

1. Go to **Settings → Sync**
2. Enable **"Background Sync"**
3. Ensure devices are on the same WiFi network
4. Data syncs automatically

**Security:** All sync is **end-to-end encrypted**. Even if someone intercepts it, they can't read it.

### 📤 Export Your Data

**Never locked in!** Export anytime:

#### Single Note
1. Open the note
2. Click **"•••"** (more options)
3. Choose **"Export"**
4. Select format: Markdown, HTML, or PDF

#### All Data
1. Go to **Settings → Export**
2. Choose **"Export All Data"**
3. Select destination folder
4. Get a ZIP file with everything

---

## Mobile-Specific Features

### 🎯 NFC Triggers (Android)

Use NFC tags to trigger quick actions:

1. **Get NFC Tags** (cheap on Amazon)
2. **Program a Tag**
   - Settings → NFC Triggers → Add Trigger
   - Choose action (create task, open note, etc.)
3. **Tap Tag** - Action happens instantly!

**Example Uses:**
- Tag on desk: Opens "Work Tasks"
- Tag on fridge: Opens "Shopping List"
- Tag in gym bag: Creates workout log

### 📍 Location Reminders

Get reminded about tasks at specific places:

1. Open a task
2. Tap **"Add Location Reminder"**
3. Choose or search for location
4. Set radius (how close you need to be)
5. Get notified when you arrive!

### 🔔 Quick Actions

Long-press the app icon (iOS/Android):
- Quick Capture
- New Task
- Today's Tasks
- Search

---

## Tips for Beginners

### 1. Start Simple
- Don't try to organize everything at once
- Start with a few notes and tasks
- Add more structure as you go

### 2. Use Daily Notes
- Create a note for each day
- Quick way to journal and track tasks
- Template: "Daily Note - [Date]"

### 3. Set Up Templates
- Create note templates for recurring needs
- Example: Meeting notes, project plans
- Settings → Templates → New Template

### 4. Enable Keyboard Shortcuts (Desktop)
- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + N`: New note
- `Ctrl/Cmd + T`: New task
- `Ctrl/Cmd + /`: Show all shortcuts

### 5. Regular Exports
- Export your data monthly as backup
- Settings → Export → Export All
- Store on external drive or cloud (already encrypted!)

---

## Troubleshooting

### I Forgot My Password
Unfortunately, **there's no way to recover a forgotten password**. This is by design for security. Your only options:
1. Use recovery codes (if you saved them)
2. Start fresh with a new vault (data lost)

**Prevention:**
- Use a password manager
- Write password on paper, keep it safe
- Export data regularly as encrypted backup

### App Won't Open
1. **Restart your computer/phone**
2. **Check for updates** in app store or GitHub
3. **Reinstall the app** (your data is safe, it's in a separate folder)

### Sync Not Working
1. **Check both devices are on same WiFi**
2. **Check Settings → Sync is enabled** on both
3. **Try manual sync** (Settings → Sync → Sync Now)
4. **Check firewall** isn't blocking the app

### Data Export Failed
1. **Check available disk space** (need 2x your data size)
2. **Choose different location** (not cloud folder)
3. **Try exporting smaller chunks** (one space at a time)

---

## Privacy & Security

### What We NEVER Do
- ❌ Collect your data
- ❌ Track your usage
- ❌ Phone home
- ❌ Require an account
- ❌ Store your password anywhere

### What IS Encrypted
- ✅ All your notes and tasks
- ✅ All attachments and images
- ✅ All metadata (titles, dates, tags)
- ✅ Sync traffic (if you enable sync)
- ✅ Everything in the database

### Password Storage
Your password is **never stored anywhere**. When you unlock:
1. You enter your password
2. It derives an encryption key (using Argon2id)
3. Key unlocks your vault
4. Password is discarded from memory
5. When you lock the app, keys are wiped

---

## Getting Help

### Built-in Help
- Press **`F1`** or **`?`** for keyboard shortcuts
- Settings → Help → User Guide

### Online Resources
- **User Guide**: [USER_GUIDE.md](USER_GUIDE.md) - Comprehensive feature guide
- **GitHub Issues**: [Report bugs](https://github.com/AmirrezaFarnamTaheri/Noteece/issues)
- **Discussions**: [Ask questions](https://github.com/AmirrezaFarnamTaheri/Noteece/discussions)

### Community
- Join our discussions for tips and workflows
- Share your experience to help others
- Request features you'd like to see

---

## Next Steps

Once you're comfortable with the basics:

1. **Explore Widgets** (Desktop)
   - Dashboard → Add Widget
   - Try Goals Tracker, Habit Tracker, Mood Tracker

2. **Try Templates**
   - Settings → Templates
   - Create templates for recurring notes

3. **Set Up Automation** (Advanced)
   - Auto-tag notes based on content
   - Create recurring tasks
   - Auto-export backups

4. **Import Existing Notes**
   - Settings → Import
   - Support for Obsidian, Notion, Markdown files

---

## Welcome to Noteece! 🎉

You're now ready to start using Noteece. Remember:

- **Your privacy is guaranteed**
- **Your data stays under your control**
- **No lock-in, export anytime**
- **Works completely offline**

**Have questions?** Check [USER_GUIDE.md](USER_GUIDE.md) or ask in [GitHub Discussions](https://github.com/AmirrezaFarnamTaheri/Noteece/discussions).

**Enjoy your private, secure workspace!**
