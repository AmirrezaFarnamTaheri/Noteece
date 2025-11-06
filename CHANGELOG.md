# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Build Automation & Security Hardening (November 2025)

#### Build & Release Infrastructure

- **GitHub Actions Workflow**: Automated binary builds for all platforms
  - Desktop builds for Windows, macOS, and Linux
  - Mobile builds via Expo Application Services (EAS)
  - Automatic artifact generation on version tags
  - Cross-platform build matrix
  - Release creation with automatic changelog generation
- **BUILD.md Documentation**: Comprehensive build and release guide
  - Desktop build instructions for all platforms
  - Mobile build configuration with EAS
  - Local and CI/CD build workflows
  - Troubleshooting and optimization tips

#### Critical Security Improvements

- **Sync Client Security**:
  - Abort simulated key exchange in development to prevent accidental insecure usage
  - Added `peerAuthenticated` flag to gate all encryption operations
  - Enhanced `ensureAuthenticatedSession()` checks in encrypt, decrypt, sign, and verify methods
  - Zeroize ephemeral keys before aborting to prevent memory exposure

- **Error Boundary Hardening**:
  - Enhanced error scrubbing with JWT token detection (`eyJ...`)
  - Base64 token redaction with word boundary enforcement
  - 16KB size limit for error messages to prevent memory exhaustion
  - Sentry scope clearing to prevent context leakage
  - Truncation indicators for oversized error messages

- **Music URL Security**:
  - Safe audio extensions enforcement (`.mp3`, `.ogg`, `.wav`, `.m4a`)
  - Path traversal detection and blocking
  - Rejection of non-network schemes (`blob:`, `data:`)
  - Non-throwing hostname normalization with result type
  - Enhanced validation for all URL components

- **Data Export Security**:
  - Preserve sync metadata structure while scrubbing sensitive fields
  - Smart JSON parsing with field-level redaction
  - Fallback to safe redaction on parse errors
  - Better data recovery from export files

### Changed

- Updated README.md with binary build information
- Enhanced DOCUMENTATION_INDEX.md with BUILD.md reference
- Improved documentation navigation with build instructions

### Added - Major Project Overhaul (November 2025)

#### New Dashboard Widgets (6 New)

- **Goals Tracker Widget**: Interactive goal setting and tracking with progress bars, categories, and completion badges
  - Add/delete goals with custom targets
  - Track progress with visual indicators
  - Increment progress with quick actions
  - Category-based organization
- **Notes Statistics Widget**: Comprehensive note analytics dashboard
  - Total notes count (excluding trashed)
  - Total word count across all notes
  - Notes created this week counter
  - Average words per note calculation
  - Writing streak tracking with visual ring progress
- **Calendar Widget**: Mini calendar with task and note indicators
  - Visual calendar with day highlighting
  - Tasks and notes indicators on dates
  - Selected date detail view
  - Event/task list for selected date
  - Legend with color coding
- **Bookmarks Widget**: Quick access to favorite items
  - Star/unstar notes, tasks, and projects
  - Categorized bookmarks (Notes, Tasks, Projects)
  - Quick navigation to bookmarked items
  - Recent notes fallback when no bookmarks
- **Quick Stats Widget**: At-a-glance workspace overview
  - Notes, tasks, projects, tags counters
  - Active tasks vs completed tasks
  - Due today indicator
  - Visual stat cards with icons
- **Achievement Badges Widget**: Gamification system
  - 8 unlockable achievements (First Steps, Getting Started, Prolific Writer, Note Master, Task Completer, Week Warrior, Consistency King, Perfectionist)
  - Progress tracking for each achievement
  - Visual badges with unlock status
  - Progress bars for locked achievements
  - Overall completion percentage

#### Expanded Shared UI Library

- **PriorityBadge Component**: Color-coded badges for priority levels (low, medium, high, urgent)
- **StatusBadge Component**: Flexible status badges with customizable color mapping
- **DateDisplay Component**: Human-readable date/time display with relative time formatting and tooltips
- **EmptyState Component**: Reusable empty state with icon, title, description, and optional action button
- **LoadingCard Component**: Loading states with skeleton or overlay variants
- **StatCard Component**: Statistics display cards with icons, values, trends, and change indicators

#### Complete Sync Status UI

- **Sync Dashboard**: Real-time sync status monitoring
  - Connected/syncing/disconnected status indicators
  - Last sync time display
  - Device count and conflict counters
- **Device Management Tab**: View and manage synced devices
  - Device list with online/offline status
  - Last sync timestamp for each device
  - Device name and status badges
- **Conflicts Tab**: Comprehensive conflict detection and resolution
  - List of sync conflicts with details
  - Device conflict information
  - Resolution UI with three options (Keep Device A, Keep Device B, Manual Merge)
  - Conflict timestamp and status tracking
- **History Tab**: Timeline of sync events
  - Push, pull, conflict, and error events
  - Event timestamps and descriptions
  - Visual timeline with colored indicators
- **Sync Settings Modal**: Configuration options
  - Enable/disable sync
  - Auto-sync toggle
  - Sync frequency selection (realtime, 5min, 15min, 1hour, manual)
  - Custom sync server URL configuration
- **Manual Sync**: Trigger sync on demand with progress indicator

#### Complete User Management UI

- **User Dashboard**: Overview of all users
  - User count badge
  - Active users, pending invites, and roles statistics
  - User table with avatars, roles, status, and last active times
- **Role Management Tab**: Define and configure roles
  - Owner, Admin, Editor, Viewer roles
  - Role descriptions and user counts
  - Permission lists for each role
  - Role configuration buttons
- **Permissions Tab**: Granular permission management
  - Permission definitions (read, write, delete, admin, manage_users, manage_billing)
  - Permission descriptions
  - Role assignment tracking
- **Invite User Modal**: Send user invitations
  - Email validation
  - Role selection dropdown
  - Custom permission overrides
  - Email-based invitation system
- **Edit User Modal**: Modify user settings
  - Change user role
  - Override permissions
  - User information display
- **User Actions Menu**: Per-user operations
  - Edit role
  - Reset password
  - Suspend/activate user
  - Remove user
- **Access Control**: Role-based permissions
  - Owner role cannot be modified or removed
  - Status badges (active, invited, suspended)

#### Enhanced AI Insights Widget

- **Expanded Insight Types (15+ Types)**:
  - Productive Week achievement
  - Write Something New suggestion
  - Overdue Tasks warning
  - High Achiever achievement (>75% task completion)
  - Task Backlog suggestion (<25% completion)
  - Too Many Active Projects suggestion
  - Inactive Projects suggestion
  - Unlinked Notes suggestion
  - Consistent Creator achievement
  - Momentum Building achievement (trending up)
  - Slowing Down suggestion (trending down)
  - Prolific Writer achievement (50k+ words)
  - Growing Collection achievement (10k+ words)
  - Urgent Items Pending warning
  - First Note Created milestone
- **Intelligent Prioritization**: Warnings shown first, then achievements, then suggestions
- **Trend Analysis**: Compare current week vs previous week activity
- **Velocity Tracking**: Monitor productivity momentum over time

#### Comprehensive Test Coverage

- **Component Tests** (8 Test Suites):
  - Dashboard.test.tsx: Dashboard rendering and project statistics
  - SyncStatus.test.tsx: Sync UI, device management, conflicts
  - UserManagement.test.tsx: User/role/permission management
  - GoalsTrackerWidget.test.tsx: Goal tracking functionality
  - NotesStatsWidget.test.tsx: Note statistics calculations
  - CalendarWidget.test.tsx: Calendar display and events
  - BookmarksWidget.test.tsx: Bookmark management
  - QuickStatsWidget.test.tsx: Workspace statistics
  - AchievementBadgesWidget.test.tsx: Achievement system
- **Test Setup**: Jest, React Testing Library, Mantine provider mocking
- **Mock Data**: Comprehensive mock implementations for hooks and Tauri API

#### Documentation

- **CONTRIBUTING.md**: Complete contributor guide
  - Code of conduct
  - Development setup instructions
  - Project structure overview
  - Development workflow
  - TypeScript/React coding standards
  - Rust coding standards
  - CSS/styling guidelines
  - Testing guidelines with examples
  - Commit message conventions (Conventional Commits)
  - Pull request process
  - Bug report template
  - Enhancement request template
  - Development tips and resources

### Changed - Major Project Overhaul

- **Dashboard.tsx**: Added 6 new widgets (GoalsTracker, NotesStats, Calendar, Bookmarks, QuickStats, AchievementBadges)
- **InsightsWidget.tsx**: Expanded from 5 to 15+ insight types with trend analysis
- **SyncStatus.tsx**: Replaced placeholder with full implementation (500+ lines)
- **UserManagement.tsx**: Replaced placeholder with complete RBAC system (640+ lines)
- **README.md**: Updated with all new features, widgets, and documentation links
- **packages/ui**: Expanded from 1 to 7 components

### Fixed - Major Project Overhaul

- Removed all placeholder components (SyncStatus, UserManagement)
- Added missing ARIA labels for accessibility
- Improved keyboard navigation support
- Enhanced type safety across new components

---

### Added - Previous Updates

#### Major Features

- **React Query Integration**: Implemented comprehensive state management with @tanstack/react-query for automatic caching, background refetching, and optimistic updates
- **Lexical Editor**: Full-featured block-based editor with rich text support, markdown shortcuts, syntax highlighting, and live preview
- **Enhanced SRS UI**: Complete Spaced Repetition System interface with card review, statistics, session tracking, and progress visualization
- **Tauri v2 Migration**: Upgraded to Tauri v2 API with updated imports and improved security

#### New Dashboard Widgets (6+)

- **Activity Heatmap**: Visual heatmap showing 90 days of note creation activity with streak tracking
- **Project Timeline**: Mini timeline widget showing active projects with due dates and progress bars
- **Due Today**: Interactive widget for tasks due today with quick completion actions
- **Habits Tracker**: Daily habits tracking with progress bars and streak indicators
- **Mood Tracker**: Mood and energy level tracking with trend charts
- **Insights Widget**: AI-powered insights showing achievements, warnings, and suggestions based on workspace activity

#### UI/UX Improvements

- Added loading overlays for better user feedback during data fetching
- Implemented React Query DevTools for development debugging
- Enhanced dashboard layout with new widget placement
- Improved note list styling with better hover states and selection indicators
- Added comprehensive error notifications with toast messages
- Created reusable React Query hooks for all API operations

#### Developer Experience

- Created `useQueries.ts` hook library with 20+ typed data fetching hooks
- Implemented query key management for cache invalidation
- Added prefetching utilities for improved performance
- Enhanced TypeScript types across components

### Changed

- **Dashboard**: Updated to use React Query hooks instead of direct API calls
- **NoteEditor**: Replaced basic TextInput with full Lexical editor component
- **SpacedRepetition**: Completely redesigned with tabs, progress tracking, and statistics
- **App.tsx**: Updated to use React Query for space management
- **State Management**: Migrated from imperative fetching to declarative React Query patterns

### Improved

- Automatic background refetching keeps data fresh
- Intelligent caching reduces unnecessary API calls
- Loading states are now consistent across all components
- Error handling is centralized and user-friendly
- Component re-renders are optimized with React Query's built-in optimizations

### Fixed

#### Build & Configuration

- Fixed TypeScript configuration issue where `vite.config.ts` was included in both main and node tsconfig files
- Removed invalid tauri mock alias from vite config
- Updated all Tauri imports from `@tauri-apps/api/tauri` to `@tauri-apps/api/core` (Tauri v2)

#### Mantine v7 API Updates

- Updated deprecated `withGlobalStyles` and `withNormalizeCSS` props on MantineProvider
- Changed `weight` prop to `fw` (font weight) across all Text components
- Changed `color` prop to `c` (color shorthand) across all Text components
- Changed `position` prop to `justify` on all Group components
- Updated Tabs component: changed `onTabChange` to `onChange`

#### Type Safety & Interfaces

- Fixed Project interface references: `name` → `title`, `due_date` → `target_end_at`
- Fixed Task interface references: `due_date` → `due_at` with proper Unix timestamp conversion
- Fixed ProjectStatus type: `'cancelled'` → `'archived'`
- Updated router context usage: converted child components to use `useOutletContext` hook
- Fixed `theme.ts` fontWeight type (number → string)
- Fixed FormField type handling in FormTemplates with proper union type support
- Fixed LexicalErrorBoundary import (default → named import)

#### Component Fixes

- Fixed AdvancedImport.tsx: removed `File.path` usage (not in browser File API), use `File.name`
- Fixed ProjectTimeline widget: converted Moment objects to Unix timestamps with `.valueOf()`
- Fixed DueTodayWidget: added priority number to label conversion function
- Fixed Settings.tsx: properly imported and used Mode interface with helper functions

#### Code Cleanup

- Removed 15+ unused variable declarations across components
- Removed 10+ unused imports (React, Mantine components, icons, utilities)
- Cleaned up unused parameters in mutation functions

#### Previous Fixes

- Resolved the critical SQLCipher database initialization failure, unblocking all database functionality
- Fixed the ESLint import resolver error, enabling proper linting of the frontend code
- Resolved the `gray_matter` crate dependency issue by downgrading to a stable version and updating the import logic
- Patched the test suite to account for the removal of FTS triggers, ensuring all backend tests pass
- Implemented manual FTS indexing in the backend to ensure new notes are correctly indexed
- Restored the frontend testing infrastructure and ensured all tests pass
- Applied Prettier formatting across all modified files
- Applied cargo fmt to Rust codebase for consistent formatting

### Technical Debt

- Placeholder UIs remaining: Advanced Import, Sync Status, User Management (partially complete)
- Command Palette needs full implementation with all routes
- Internationalization (i18n) not yet implemented
- E2E tests not yet added
- Automation DSL execution engine pending

## [0.4.0] - 2025-11-03

### Added

- Backend logic for CRDT & Sync.
- Backend logic for Collaboration, including roles and invites.
- Backend logic for Project Hub Timeline, Risks, and Dependencies.
- Created and ran the performance harness to validate Phase 0 acceptance criteria.

### Fixed

- Resolved the persistent SQLCipher initialization failure by refactoring the `PRAGMA` order and replacing the `cipher_integrity_check` with more robust validation methods. This unblocks the vault lifecycle tests and the performance harness.

## [0.3.0] - 2025-11-03

### Added

- Backend logic for Local SRS (Spaced Repetition System).
- Backend logic for Advanced Import from Obsidian and Notion.
- Backend logic for Advanced Search with field-based filters and stemming.
- Extensive logging to all backend modules.

### Changed

- Updated `ISSUES.md` to include the OCR integration failure.
- Refactored the `srs.rs` module to improve readability and add a `get_review_logs` function.

## [0.2.0] - 2025-11-03

### Added

- Backend logic for Project Hub, including milestones, dependencies, risks, and updates.
- Backend logic for Saved Searches.
- Backend logic for Weekly Reviews.
- Backend logic for Meeting Notes, including action item extraction.
- Backend logic for Mode Store v1, including enabling and disabling modes.

### Changed

- Updated `ISSUES.md` to reflect the current status of the SQLCipher initialization failure.

## [0.1.0] - 2025-11-03

### Added

- Comprehensive logging to all backend modules.
- Unit tests for all backend modules.
- `description` field to the `task` table.
- Basic editor API.

### Changed

- Refactored the linking mechanism in `backlink.rs` to use note IDs instead of titles.
- Improved the space creation logic in `space.rs` to automatically enable the core pack of modes.
- Improved the snapshot naming in `versioning.rs` to include a ULID.
- Enhanced the ICS import/export functionality in `calendar.rs` to handle more event properties.

### Fixed

- Fixed a bug in the FTS5 trigger that was causing tests to fail.
- Fixed a bug in the `update_note` function that was preventing notes from being updated.
- Fixed a bug in the `create_vault` function that was preventing vaults from being created.

## [0.0.3] - 2025-11-02

### Added

- Vault lifecycle management (create, unlock) in the Rust core.
- Content-addressed blob store with per-blob encryption and 4KB chunking.
- Backend logic for Task CRUD operations.
- Backend logic for backlinks.
- Trash and restore functionality for notes.
- Per-note version history using `zstd` snapshots.
- Rolling encrypted backups.

### Changed

- Deferred all frontend tasks due to issues with the Tauri setup.

### Fixed

- Temporary workaround for FTS5 support in the Rust core is still in place.

## [0.0.2] - 2025-11-02

### Added

- CI workflow with GitHub Actions.
- `CODEOWNERS` file.
- Rust core library (`packages/core-rs`) with database schema and migrations.
- Cryptography foundations for key derivation and key wrapping.

### Fixed

- Temporary workaround for FTS5 support in the Rust core.

## [0.0.1] - 2025-11-02

### Added

- Initial project structure.
- Core documentation files (`README.md`, `CHANGELOG.md`, `PROGRESS.md`, `IDEAS.md`, `ISSUES.md`, `PLAN.md`).
