# Settings Guide

Noteece offers extensive customization through its Settings panel.

## Accessing Settings

- Click the gear icon in the sidebar
- Press `Ctrl/Cmd + ,`
- Use Command Palette: "Open Settings"

## Settings Categories

### General

| Setting       | Description                       |
| ------------- | --------------------------------- |
| Language      | Choose from 7 supported languages |
| Start Page    | Default page on launch            |
| Auto-save     | Automatic note saving interval    |
| Quick Capture | Global capture shortcut           |

### Appearance

| Setting      | Description            |
| ------------ | ---------------------- |
| Theme        | Light, Dark, or System |
| Accent Color | Primary UI color       |
| Font Size    | Editor font size       |
| Editor Width | Note editor width      |

#### Theme Options

1. **Light Mode** - Bright, daytime-friendly
2. **Dark Mode** - Reduced eye strain
3. **System** - Follows OS preference (auto-syncs)

### Widgets & Features

Access the **Control Panel** to manage:

- **Widgets**: Enable/disable dashboard widgets
- **Features**: Toggle application features
- **Presets**: Apply predefined configurations

See [Dashboard Guide](02_Dashboard.md) for details.

### Sync

| Setting   | Description                  |
| --------- | ---------------------------- |
| P2P Sync  | Enable device-to-device sync |
| Sync Port | Network port for sync        |
| Auto-Sync | Automatic sync interval      |
| Devices   | Manage paired devices        |

### Backup

| Setting         | Description               |
| --------------- | ------------------------- |
| Auto-Backup     | Automatic backup schedule |
| Backup Location | Where backups are stored  |
| Backup History  | Number of backups to keep |
| Export Format   | Markdown, JSON, or both   |

### Security

| Setting      | Description                |
| ------------ | -------------------------- |
| Lock Timeout | Auto-lock after inactivity |
| Biometric    | Fingerprint/Face unlock    |
| Password     | Change vault password      |
| Clear Data   | Securely wipe all data     |

### AI Settings

| Setting       | Description                 |
| ------------- | --------------------------- |
| Local AI      | Enable Ollama integration   |
| Ollama URL    | Local Ollama server address |
| Default Model | Preferred local model       |
| Cloud AI      | Enable cloud providers      |
| Provider      | OpenAI, Claude, or Gemini   |
| API Key       | Cloud provider API key      |
| Cost Tracking | Monitor API costs           |
| Cache         | Cache AI responses          |

### CalDAV

| Setting       | Description             |
| ------------- | ----------------------- |
| Server URL    | CalDAV server address   |
| Username      | CalDAV account          |
| Sync Interval | Calendar sync frequency |

## Keyboard Shortcuts

Customize keyboard shortcuts in Settings → Shortcuts.

### Default Shortcuts

| Action          | Windows/Linux      | macOS             |
| --------------- | ------------------ | ----------------- |
| Settings        | `Ctrl + ,`         | `Cmd + ,`         |
| Quick Capture   | `Ctrl + Shift + N` | `Cmd + Shift + N` |
| Command Palette | `Ctrl + K`         | `Cmd + K`         |
| Toggle Sidebar  | `Ctrl + B`         | `Cmd + B`         |
| Focus Mode      | `Ctrl + Shift + F` | `Cmd + Shift + F` |

## Import/Export Settings

### Export Settings

1. Go to Settings → Backup
2. Click "Export Settings"
3. Choose location
4. Settings saved as JSON

### Import Settings

1. Go to Settings → Backup
2. Click "Import Settings"
3. Select settings file
4. Confirm import

## Resetting Settings

To reset all settings to defaults:

1. Go to Settings → General
2. Click "Reset to Defaults"
3. Confirm reset

---

_See also: [Getting Started](01_Getting_Started.md) | [Dashboard](02_Dashboard.md)_
