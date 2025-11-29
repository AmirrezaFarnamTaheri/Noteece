# Noteece User Guide

Welcome to Noteece! This comprehensive guide will help you get the most out of your local-first, encrypted workspace.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Vault Management](#vault-management)
3. [Workspace & Spaces](#workspace--spaces)
4. [Note-Taking](#note-taking)
5. [Task Management](#task-management)
6. [Project Management](#project-management)
7. [Dashboard & Widgets](#dashboard--widgets)
8. [Time Tracking](#time-tracking)
9. [Spaced Repetition System](#spaced-repetition-system)
10. [Search & Organization](#search--organization)
11. [Import & Export](#import--export)
12. [Sync & Collaboration](#sync--collaboration)
13. [Settings](#settings)
14. [Tips & Tricks](#tips--tricks)
15. [FAQ](#faq)
16. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

#### Pre-built Binaries (Recommended)

- **Windows**: Download and run the `.msi` installer
- **macOS**: Download the `.dmg` file, drag to Applications
- **Linux**: Download `.AppImage` or `.deb` package

#### Building from Source

See the [Developer Guide](DEVELOPER_GUIDE.md) for detailed build instructions.

### First Launch

When you first launch Noteece, you'll be greeted with the Vault Management screen.

---

## Vault Management

### Creating Your First Vault

A **vault** is your encrypted workspace containing all your notes, tasks, and projects.

1. Click **"Create New Vault"**
2. Choose a location for your vault file (e.g., `Documents/My Noteece Vault`)
3. Enter a strong master password
   - Use at least 12 characters
   - Mix uppercase, lowercase, numbers, and symbols
   - This password encrypts ALL your data
4. **Save your recovery codes** in a safe place
   - Print them or store in a password manager
   - You'll need these if you forget your password
5. Click **"Create Vault"**

**Important**: Your master password cannot be recovered if lost. Keep your recovery codes safe!

### Unlocking Your Vault

1. Launch Noteece
2. Select your vault file
3. Enter your master password
4. Click **"Unlock"**

### Vault Security

- All data is encrypted at rest using **XChaCha20-Poly1305** AEAD encryption
- Your master password is hashed using **Argon2id** (industry standard)
- Each piece of data has unique encryption keys derived using **HKDF**
- **Zero knowledge**: No one (including developers) can access your data without your password

---

## Workspace & Spaces

### Understanding Spaces

A **space** is like a project or area within your vault. You can create multiple spaces for different contexts (e.g., Work, Personal, Research).

### Creating a Space

1. Click the **space selector** in the top navigation
2. Click **"+ New Space"**
3. Enter a name (e.g., "Work Projects")
4. Optionally add a description
5. Click **"Create"**

### Switching Between Spaces

Click the **space selector** and choose from your list of spaces.

### Active Space

The currently selected space determines which notes, tasks, and projects you see. Most views are space-specific.

---

## Note-Taking

### Creating a Note

**Method 1: From Dashboard**

1. Click **"New Note"** button in the top navigation
2. Start writing

**Method 2: Command Palette**

1. Press `Cmd/Ctrl + K`
2. Type "New Note"
3. Press Enter

**Method 3: Daily Note**

1. Press `Cmd/Ctrl + D` or click "Daily Note"
2. Today's daily note opens (or creates if it doesn't exist)

### The Lexical Editor

Noteece uses the powerful **Lexical editor** with full Markdown support.

#### Markdown Shortcuts

- **Headers**: `# H1`, `## H2`, `### H3`
- **Bold**: `**bold text**` or `Ctrl/Cmd + B`
- **Italic**: `*italic text*` or `Ctrl/Cmd + I`
- **Code**: `` `code` `` (inline) or ` ``` ` (block)
- **Lists**:
  - Bullet: `- item` or `* item`
  - Numbered: `1. item`
  - Checklist: `- [ ] task`
- **Links**: `[text](url)`
- **Wikilinks**: `[[Note Title]]` (creates backlinks)

#### Rich Text Features

- **Block quotes**: `> quote text`
- **Horizontal rule**: `---`
- **Tables**: Use Markdown table syntax
- **Syntax highlighting**: Specify language in code blocks (e.g., ` ```javascript `)

### Backlinking & Wikilinks

Create connections between notes using `[[Note Title]]` syntax:

1. Type `[[` in the editor
2. Start typing a note name
3. Select from autocomplete or type new note name
4. Close with `]]`

**Benefits**:

- Build a knowledge graph
- See backlinks in note sidebar
- Navigate between related notes

### Note Templates

Create structured notes from templates:

1. Go to **Settings → Form Templates**
2. Click **"Create Template"**
3. Design your form with fields (text, date, dropdown, etc.)
4. Save template
5. Create note from template: **New Note → From Template**

**Use Cases**:

- Meeting notes
- Book reviews
- Project briefs
- Research papers
- Weekly reviews

### Note Metadata

Each note has metadata:

- **Title**: Displayed at the top
- **Tags**: Organize and categorize (`#tag` in content)
- **Created/Updated**: Automatic timestamps
- **Backlinks**: Other notes linking to this one

### Version History

Noteece automatically creates snapshots of your notes:

1. Open a note
2. Click **"Version History"** in the toolbar
3. Browse previous versions
4. Click **"Restore"** to revert to a specific version

Snapshots are created:

- On significant edits
- Before major changes
- Daily (if note was modified)

---

## Task Management

### Creating Tasks

**Method 1: Task Board**

1. Navigate to **Task Board**
2. Click **"+ New Task"** in any column
3. Enter task details

**Method 2: In Notes**

1. Use Markdown checkbox syntax: `- [ ] Task name`
2. Tasks automatically appear in Task Board

**Method 3: Quick Add**

1. Press `Cmd/Ctrl + K`
2. Type "New Task"

### Task Properties

- **Title**: What needs to be done
- **Description**: Detailed information (Markdown supported)
- **Status**: `inbox`, `next`, `in_progress`, `waiting`, `done`, `cancelled`
- **Priority**: `low`, `medium`, `high`, `urgent`
- **Due Date**: When task should be completed
- **Tags**: Categorize tasks
- **Project**: Link to a project (optional)
- **Recurrence**: Repeating tasks (daily, weekly, monthly, etc.)

### Task Board (Kanban)

The Task Board provides a visual workflow:

**Columns**:

1. **Inbox**: New, uncategorized tasks
2. **Next**: Ready to work on
3. **In Progress**: Currently working on
4. **Waiting**: Blocked or waiting for someone
5. **Done**: Completed tasks
6. **Cancelled**: Tasks no longer relevant

**Drag & Drop**:

- Drag tasks between columns to update status
- Reorder tasks within columns
- Bulk actions available

### Due Today Widget

The Dashboard's **Due Today Widget** shows tasks due today:

- Quick complete checkbox
- Priority badge
- Click to view/edit

### Recurring Tasks

Create tasks that repeat automatically:

1. Create a task
2. Click **"Recurrence"**
3. Select pattern:
   - Daily
   - Weekly (choose days)
   - Monthly (by date or day of week)
   - Custom (using iCal RRULE syntax)
4. Set end date (optional)

**Example**: "Weekly team meeting" every Monday at 10am

---

## Project Management

### Understanding Projects

**Projects** are larger initiatives with:

- Goals and objectives
- Milestones
- Tasks
- Timeline
- Risks and dependencies

### Creating a Project

1. Go to **Project Hub**
2. Click **"New Project"**
3. Fill in details:
   - **Name**: Project title
   - **Description**: Markdown-formatted overview
   - **Goal**: What success looks like
   - **Start/End Dates**: Timeline
   - **Status**: `proposed`, `active`, `blocked`, `done`, `archived`
4. Click **"Create"**

### Project Hub

The Project Hub has 4 main views:

#### 1. Overview Tab

- Project statistics
- Active projects list
- Progress summary
- Quick actions

#### 2. Kanban Board

- Drag-and-drop task management
- Filter by project
- Link tasks to projects

#### 3. Timeline (Gantt Chart)

- Visual project timeline
- Milestones
- Dependencies
- Drag to adjust dates

#### 4. Risks (RAID Log)

Track project risks and issues:

- **Risks**: Potential problems
- **Assumptions**: Beliefs that may be invalid
- **Issues**: Current problems
- **Dependencies**: External factors

### Project Milestones

Add milestones to track progress:

1. Open a project
2. Go to **Timeline** tab
3. Click **"Add Milestone"**
4. Enter:
   - Title
   - Target date
   - Description
5. Save

Milestones appear on the timeline view.

### Project Updates

Document project progress:

1. Open project
2. Click **"Add Update"**
3. Write status update (Markdown supported)
4. Updates appear in reverse chronological order

---

## Dashboard & Widgets

The Dashboard is your command center with 18+ customizable widgets.

### Available Widgets

#### Time Tracking Widget

- Display running timer with elapsed time
- Recent time entries (up to 8)
- Quick stop/delete actions
- Total time summary

#### Activity Heatmap

- Visual heatmap of note creation activity
- Streak tracking (current and longest)
- Hover to see daily counts
- Inspired by GitHub contribution graph

#### Insights Widget

- AI-powered insights with 15+ types
- Trend analysis
- Productivity suggestions
- Writing patterns
- Task velocity tracking

#### Goals Tracker

- Set and track long-term goals
- Categories (health, career, learning, etc.)
- Milestones
- Progress percentage
- Deadline tracking

#### Habits Tracker

- Daily habit tracking
- Progress visualization
- Streak counting
- Completion rate

#### Mood Tracker

- Monitor mood and energy levels
- Chart view over time
- Correlation with productivity
- Notes for context

#### Focus Timer

- Pomodoro timer (25 min work, 5 min break)
- Customizable durations
- Sound notifications
- Session tracking

#### Due Today

- Tasks due today
- Quick complete checkbox
- Priority badges

#### Weekly Progress

- Productivity metrics for the week
- Tasks completed
- Notes created
- Time tracked

#### Tasks by Priority

- Visual distribution across priorities
- Chart view
- Click to filter

#### Recent Projects

- Active projects
- Quick navigation
- Progress indicators

#### Tags Cloud

- Visual representation of tags
- Size indicates usage frequency
- Click to filter

#### Notes Statistics

- Comprehensive analytics
- Word count
- Writing streaks
- Productivity metrics

#### Calendar Widget

- Mini calendar
- Task/note indicators
- Click to view events

#### Bookmarks Widget

- Starred/favorite notes, tasks, projects
- Quick access

#### Quick Stats

- At-a-glance overview
- Total notes, tasks, projects, tags

#### Achievement Badges

- Gamification
- 8+ unlockable achievements
- Progress tracking

#### Project Timeline

- Mini timeline of active projects
- Milestone indicators

### Customizing the Dashboard

1. Click **"Customize Dashboard"**
2. **Add widgets**: Drag from widget library
3. **Remove widgets**: Click X button
4. **Reorder**: Drag widgets to new positions
5. **Resize**: Drag edges (where supported)
6. Click **"Save Layout"**

---

## Time Tracking

Track time spent on tasks, projects, and notes.

### Starting a Timer

**Method 1: From Task/Project**

1. Open a task or project
2. Click **"Start Timer"** button
3. Timer starts (any other running timer stops automatically)

**Method 2: Time Tracking Widget**

1. Dashboard → Time Tracking Widget
2. Click **"Start Timer"**
3. Select task/project/note

**Method 3: Manual Entry**

1. Go to Time Tracking view
2. Click **"Add Manual Entry"**
3. Enter:
   - Task/Project/Note
   - Start time
   - Duration
   - Description (optional)

### Stopping a Timer

- Click **"Stop"** on the running timer
- Timer calculates duration automatically
- Entry saved to history

### Viewing Time Reports

1. Go to **Time Tracking** view
2. Filter by:
   - Date range
   - Task
   - Project
   - Tag
3. View statistics:
   - Total time
   - Average session length
   - Entry count

### Time Entry Management

- **Edit**: Click on entry to modify
- **Delete**: Remove incorrect entries
- **Export**: Export time data as CSV

**Use Cases**:

- Track billable hours
- Measure task duration
- Analyze productivity patterns
- Time boxing

---

## Spaced Repetition System

Learn and remember information using science-based spaced repetition.

### Creating Knowledge Cards

**Method 1: From Note**

1. Open a note
2. Select text you want to remember
3. Click **"Create Card"**
4. Front: Question/Prompt
5. Back: Answer/Content

**Method 2: Directly**

1. Go to **Spaced Repetition** view
2. Click **"New Card"**
3. Enter front and back
4. Optionally link to source note

### Reviewing Cards

1. Go to **Spaced Repetition** view
2. Click **"Start Review Session"**
3. For each card:
   - See the front
   - Try to recall answer
   - Click **"Show Answer"**
   - Rate your recall quality:
     - **Again**: Didn't remember (reschedule soon)
     - **Hard**: Difficult recall
     - **Good**: Correct recall
     - **Easy**: Very easy

### Review Algorithm

Noteece uses a **SM-2 based algorithm** with enhancements:

- **Stability**: How well the card is learned
- **Difficulty**: How hard the card is for you
- **Intervals**: Time until next review increases with successful recalls
- **Optimal scheduling**: Review right before you'd forget

### Session Statistics

After a review session, see:

- Cards reviewed
- Accuracy rate
- Average time per card
- Streak progress

### Card Management

- **Edit**: Update card content
- **Suspend**: Temporarily stop reviewing
- **Delete**: Remove card
- **Reset**: Start learning from scratch
- **Tags**: Organize cards by topic

**Use Cases**:

- Language learning
- Exam preparation
- Professional knowledge
- General knowledge retention

---

## Search & Organization

### Full-Text Search

Press `Cmd/Ctrl + F` or use the search bar:

1. Enter search query
2. Results show across notes, tasks, projects
3. Click result to open

**Features**:

- **Stemming**: Finds variations (e.g., "run" finds "running")
- **Highlighting**: Search terms highlighted in results
- **Ranking**: Most relevant results first

### Advanced Search

Use field-based filters for precision:

**Syntax**:

- `tag:work` - Filter by tag
- `due:today` - Tasks due today
- `due:overdue` - Overdue tasks
- `created:2024-01` - Created in January 2024
- `modified:lastweek` - Modified in last week
- `status:in_progress` - Filter by status
- `priority:high` - High priority tasks

**Combine filters**:

```
tag:work status:in_progress priority:high
```

### Saved Searches

Save frequently used searches:

1. Perform a search
2. Click **"Save Search"**
3. Name it (e.g., "High Priority Work Tasks")
4. Access from **Saved Searches** page

**Examples**:

- "Overdue work tasks": `tag:work due:overdue`
- "This week's meetings": `tag:meeting created:thisweek`
- "Active projects": `status:active type:project`

### Tag System

Organize content with tags:

**Creating Tags**:

- In content: Type `#tagname`
- In metadata: Add to tag field

**Tag Management**:

1. Go to **Settings → Tags**
2. View all tags
3. Rename, merge, or delete tags
4. Assign colors

**Tag Cloud Widget**:

- Visual representation on Dashboard
- Size = frequency
- Click to filter

### Organization Strategies

**GTD (Getting Things Done)**:

- Tags: `#next`, `#waiting`, `#someday`
- Status: Use task board workflow
- Weekly review mode

**PARA Method**:

- Spaces: Projects, Areas, Resources, Archives
- Tags for categories
- Link notes to projects

**Zettelkasten**:

- Heavy use of `[[wikilinks]]`
- Atomic notes (one idea per note)
- Index notes linking to clusters
- Tags for categories

---

## Import & Export

### Importing Data

#### Obsidian Import

1. Go to **Settings → Import**
2. Select **"Obsidian Vault"**
3. Choose your Obsidian vault folder
4. Configure options:
   - Import attachments
   - Parse frontmatter
   - Preserve folder structure
5. Click **"Import"**

**What's imported**:

- All Markdown notes
- YAML frontmatter → metadata
- Tags
- Wikilinks
- Attachments

#### Notion Import

1. Export from Notion (Markdown & CSV format)
2. Go to **Settings → Import** in Noteece
3. Select **"Notion Export"**
4. Choose exported ZIP file
5. Map Notion properties to Noteece fields
6. Click **"Import"**

**Supported**:

- Notes/Pages
- Databases → Tasks
- Properties → Metadata
- Nested pages

#### Calendar Import (ICS)

1. Go to **Settings → Import**
2. Select **"Calendar (ICS)"**
3. Choose `.ics` file
4. Events → Tasks with due dates

### Exporting Data

#### Export Single Note

1. Open note
2. Click **"..." menu** → **Export**
3. Choose format:
   - **Markdown**: Plain `.md` file
   - **HTML**: Styled web page
   - **PDF**: Formatted document
4. Save location

#### Export Space

1. Go to Space settings
2. Click **"Export Space"**
3. Creates `.zip` file containing:
   - All notes as Markdown
   - All attachments
   - Folder structure preserved

#### Export Vault

Create a complete encrypted backup:

1. **Settings → Backup**
2. Click **"Export Vault"**
3. Saves as `.noteece` file
4. Encrypted with your master password

**Use for**:

- Transferring to another device
- Archival backup
- Disaster recovery

#### Export Time Data

1. Go to **Time Tracking** view
2. Filter desired date range
3. Click **"Export"**
4. Choose CSV format
5. Import into spreadsheet

---

## Sync & Collaboration

**Note**: Sync features are currently in development. Backend complete, UI implemented.

### Enabling Sync

1. Go to **Settings → Sync**
2. Enter sync server URL (self-hosted or provided)
3. Click **"Enable Sync"**
4. Authenticate

### Sync Status Dashboard

Monitor real-time sync:

**Device Tracking**:

- See all synced devices
- Online/offline status
- Last sync time

**Sync History**:

- Timeline of sync events
- Push/pull operations
- Conflicts detected
- Error logs

### Conflict Resolution

When conflicts occur (same note edited on multiple devices):

1. **Sync Status → Conflicts** tab
2. View conflicting versions side-by-side
3. Choose resolution:
   - **Keep Local**: Use your version
   - **Keep Remote**: Use server version
   - **Merge**: Manually combine
4. Apply resolution

### User Management & RBAC

**Roles**:

- **Owner**: Full control (created vault)
- **Admin**: Manage users, cannot delete owner
- **Editor**: Create/edit content
- **Viewer**: Read-only access

**Managing Users**:

1. **Settings → Users**
2. Click **"Invite User"**
3. Enter email
4. Select role
5. User receives invitation

**Permissions**:

- Read
- Write
- Delete
- Admin (user management)
- Manage billing

**Activity Tracking**:

- View user activity
- Last active times
- User status (active/invited/suspended)

### Security & Privacy

- **End-to-end encryption**: Server cannot read your data
- **Zero-knowledge**: Only you have decryption keys
- **Device keys**: Each device has unique keys
- **Conflict encryption**: Even conflicts are encrypted

---

## Settings

### General Settings

- **Theme**: Light, dark, or auto
- **Language**: English (more coming)
- **Startup**: Open last space or specific space
- **Default note location**: Choose folder

### Editor Settings

- **Font**: Choose editor font
- **Font size**: Adjust readability
- **Line height**: Spacing preference
- **Spell check**: Enable/disable
- **Auto-save**: Frequency

### Sync Settings

- **Auto-sync**: Enable/disable
- **Sync frequency**: How often to sync
- **Server URL**: Sync server address
- **Conflict resolution**: Auto or manual

### Privacy Settings

- **Analytics**: Always disabled (hardcoded)
- **Telemetry**: Always disabled
- **Local analytics only**: Dashboard insights

### Backup Settings

- **Auto-backup**: Schedule automatic backups
- **Backup location**: Where to save backups
- **Retention**: How many backups to keep

### Advanced Settings

- **Database location**: Vault file path
- **Performance**: Cache size
- **Experimental features**: Beta features toggle

---

## Tips & Tricks

### Keyboard Shortcuts

**Global**:

- `Cmd/Ctrl + K`: Command palette
- `Cmd/Ctrl + N`: New note
- `Cmd/Ctrl + D`: Daily note
- `Cmd/Ctrl + F`: Search
- `Cmd/Ctrl + ,`: Settings

**Editor**:

- `Cmd/Ctrl + B`: Bold
- `Cmd/Ctrl + I`: Italic
- `Cmd/Ctrl + S`: Save (auto-saves anyway)
- `Cmd/Ctrl + Z`: Undo
- `Cmd/Ctrl + Shift + Z`: Redo

**Navigation**:

- `Cmd/Ctrl + 1-9`: Switch between views
- `Cmd/Ctrl + [`: Back
- `Cmd/Ctrl + ]`: Forward

### Productivity Workflows

**Daily Capture**:

1. Start with Daily Note (`Cmd/Ctrl + D`)
2. Brain dump all tasks and ideas
3. Process into tasks/projects during day
4. Review before bed

**Weekly Review**:

1. Use **Weekly Review** mode
2. Review completed tasks
3. Archive finished projects
4. Plan next week
5. Update goals

**Pomodoro Technique**:

1. Use **Focus Timer** widget
2. Set 25-minute timer
3. Work on one task
4. Take 5-minute break
5. Repeat 4 times, take longer break

**Zettelkasten Method**:

1. Create atomic notes (one idea each)
2. Use `[[wikilinks]]` heavily
3. Create index/hub notes
4. Let structure emerge organically

### Performance Tips

- **Archive old notes**: Move completed items to archive space
- **Limit dashboard widgets**: Show only what you use
- **Regular backups**: Export vault weekly
- **Clear trash**: Empty trash periodically

### Advanced Features

**Meeting Notes Mode**:

1. Create note from "Meeting" template
2. Auto-extracts action items
3. Links to attendees (people)
4. Agenda and notes sections

**Form Templates**:

- Create custom structured notes
- Dynamic fields (text, date, dropdown, number)
- Pre-filled values
- Conditional fields (planned)

---

## FAQ

### General Questions

**Q: Is my data really secure?**
A: Yes. All data is encrypted using military-grade encryption (XChaCha20-Poly1305). Your master password never leaves your device, and even the developers cannot access your data.

**Q: Can I use Noteece offline?**
A: Absolutely. Noteece is designed to work completely offline. Sync is entirely optional.

**Q: What happens if I forget my password?**
A: You can use your recovery codes to regain access. Without your password or recovery codes, your data cannot be decrypted. This is by design for security.

**Q: Can I sync across devices?**
A: Yes, using the built-in sync feature (currently in beta). You can also manually copy your vault file between devices.

**Q: How much data can I store?**
A: There's no artificial limit. SQLite (the underlying database) can handle databases up to 281 terabytes.

### Import/Export Questions

**Q: Can I import from Evernote?**
A: Not directly yet. Export from Evernote as HTML, then import to Notion, then to Noteece. Direct Evernote import planned.

**Q: Will my Obsidian plugins work?**
A: Plugins won't transfer, but notes, links, tags, and frontmatter will import correctly.

**Q: Can I export to other formats?**
A: Yes. Export individual notes as Markdown, HTML, or PDF. Export entire spaces as ZIP archives.

### Sync & Security Questions

**Q: Where is the sync server?**
A: You can self-host or use a provided server. All data is end-to-end encrypted regardless of server.

**Q: Can the server see my data?**
A: No. All data is encrypted before reaching the server. The server only stores encrypted blobs.

**Q: What if two people edit the same note?**
A: Noteece detects conflicts and provides a UI to resolve them manually or automatically.

### Technical Questions

**Q: What platforms are supported?**
A: Windows 10+, macOS 10.15+, Linux (most distros). Mobile apps coming soon.

**Q: Can I run Noteece on a Raspberry Pi?**
A: Theoretically yes, but ARM builds aren't officially supported yet.

**Q: Does Noteece support plugins?**
A: Not yet, but a plugin system is on the roadmap.

---

## Troubleshooting

### Vault Issues

**Problem: Can't unlock vault**

- Verify correct password (case-sensitive)
- Check vault file isn't corrupted
- Try recovery codes if password forgotten

**Problem: Vault file moved**

- Use "Open Vault" and navigate to new location
- Noteece will remember the new path

**Problem: Performance slow with large vault**

- Compact database (Settings → Advanced)
- Archive old notes
- Reduce active dashboard widgets

### Sync Issues

**Problem: Sync not working**

- Check internet connection
- Verify sync server URL
- Check sync status dashboard for errors
- Try manual sync

**Problem: Conflicts constantly appearing**

- Ensure all devices have correct time
- Sync more frequently
- Check for rogue edits on another device

**Problem: Device shows offline when online**

- Restart app
- Check firewall settings
- Verify server status

### Import Issues

**Problem: Obsidian import missing notes**

- Check file permissions
- Ensure Markdown files have `.md` extension
- Look for import errors in log

**Problem: Notion import failed**

- Export Notion workspace correctly (Markdown & CSV)
- Ensure ZIP file not corrupted
- Check import error messages

### Performance Issues

**Problem: App freezing or slow**

- Close unused dashboard widgets
- Clear search index and rebuild (Settings → Advanced)
- Check available disk space
- Update to latest version

**Problem: High memory usage**

- Restart application
- Reduce number of open notes
- Disable auto-preview of large images

### Data Issues

**Problem: Note content lost**

- Check version history
- Restore from automatic snapshot
- Check trash (may be accidentally deleted)
- Restore from backup

**Problem: Tags not appearing**

- Rebuild tag index (Settings → Advanced)
- Check tag syntax (`#tagname` with no spaces)
- Refresh view

### Getting Help

If you encounter issues not covered here:

1. **Check documentation**: [USER_GUIDE.md](USER_GUIDE.md), [FAQ](#faq)
2. **Search issues**: [GitHub Issues](https://github.com/AmirrezaFarnamTaheri/Noteece/issues)
3. **Ask community**: [GitHub Discussions](https://github.com/AmirrezaFarnamTaheri/Noteece/discussions)
4. **Report bug**: Create detailed issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots
   - System information
   - Error logs (Settings → Advanced → View Logs)

---

**Happy note-taking! 📝**

For developer documentation, see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
