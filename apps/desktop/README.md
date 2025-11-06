# Noteece Desktop Application

The Noteece desktop application is built with Tauri v2, React 18, TypeScript, and Mantine v7. It provides a fast, secure, and feature-rich workspace for notes, tasks, and projects.

## Tech Stack

- **Framework**: Tauri v2 (Rust backend + Web frontend)
- **UI Library**: React 18 with Mantine v7 components
- **Language**: TypeScript 5
- **Build Tool**: Vite 4
- **State Management**: Zustand + React Query
- **Editor**: Lexical rich text editor
- **Styling**: Mantine's CSS-in-JS + PostCSS

## Getting Started

### Prerequisites

#### For Windows:

- Install `Microsoft Visual Studio C++ Build Tools` from [here](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Select `C++ build tools` and `Windows 10 SDK` in the installer.
- Download and run the `Evergreen Bootstrapper` from [here](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section).
- Install `Rust` with `rustup` from [here](https://www.rust-lang.org/tools/install).
- Install `Node.js` from [here](https://nodejs.org/en/download/).
- Install `pnpm` from [here](https://pnpm.io/installation). (Optional)

#### For Linux(Debian/Ubuntu):

- Run the following commands in your terminal:

  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.0-dev \
     build-essential \
     curl \
     wget \
     file \
     libssl-dev \
     libgtk-3-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev
  ```

- To install Rust on Linux, open a terminal and enter the following command:

  ```bash
  curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
  ```

#### For MacOS:

- To install Rust on macOS, open a terminal and enter the following command:

  ```bash
  curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
  ```

To find more detailed information about prerequisites check [docs](https://tauri.app/v1/guides/getting-started/prerequisites).

### Installation

1. Clone the Noteece repository:

   ```bash
   git clone https://github.com/your-org/noteece.git
   cd noteece
   ```

2. Install dependencies (from repository root):

   ```bash
   pnpm install
   ```

3. Navigate to desktop app:
   ```bash
   cd apps/desktop
   ```

## Usage

### Development

To start the development server `using Tauri`, run the following command:

```bash
pnpm dev:tauri
```

You can start the development server `without using Tauri`. To do this, run the following command:

```bash
pnpm dev
```

### Build

To build the production application:

```bash
pnpm build:tauri
```

This will:

1. Compile the TypeScript and React code with Vite
2. Build the Rust backend with cargo
3. Create platform-specific installers (DMG for macOS, MSI for Windows, etc.)

For more details, see the [Tauri build documentation](https://tauri.app/v1/guides/building).

## Project Structure

```
apps/desktop/
├── src/                    # React application source
│   ├── components/        # React components
│   │   ├── widgets/      # Dashboard widgets
│   │   └── project_hub/  # Project management views
│   ├── hooks/            # Custom React hooks (queries, mutations)
│   ├── services/         # API services
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main application component
│   ├── store.ts          # Zustand store
│   └── theme.ts          # Mantine theme configuration
├── src-tauri/            # Tauri Rust backend
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── package.json          # Node dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite build configuration
```

## Features

### Core Features

- **Vault Management**: Create and unlock encrypted vaults
- **Note Editor**: Full Lexical editor with markdown support
- **Task Board**: Kanban-style task management
- **Project Hub**: Timeline, milestones, risks, and dependencies
- **Dashboard**: 12+ customizable widgets
- **Search**: Advanced search with field-based filters
- **Spaced Repetition**: SRS system for knowledge retention

### Recent Updates

- Migrated to Tauri v2 API
- Updated to Mantine v7 UI framework
- Improved type safety and fixed 80+ TypeScript errors
- Enhanced React Query integration for better data management
- Fixed router context usage across nested routes

## Development Tips

- Use the React Query DevTools (enabled in dev mode) to debug data fetching
- Check the browser console for detailed error messages
- The Rust backend logs are visible in the terminal running `pnpm dev:tauri`
- Hot reload is enabled for both frontend and backend changes

## Troubleshooting

### Build Errors

- Ensure all dependencies are installed: `pnpm install`
- Clear the build cache: `rm -rf dist` and `cargo clean` in `src-tauri/`
- Check that Rust and Node.js versions meet the prerequisites

### Runtime Errors

- Check that the Tauri backend is running (terminal logs)
- Verify database vault is properly initialized
- Check browser console for frontend errors

For more help, see [ISSUES.md](../../ISSUES.md) in the repository root.
