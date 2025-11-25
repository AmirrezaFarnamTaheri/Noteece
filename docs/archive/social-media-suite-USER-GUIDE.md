# Noteece Social Media Suite - User Guide

**Version:** 1.0
**Last Updated:** January 2025
**Status:** Desktop Edition

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Account Management](#account-management)
4. [Timeline & Feed](#timeline--feed)
5. [Categories & Organization](#categories--organization)
6. [Search & Discovery](#search--discovery)
7. [Analytics](#analytics)
8. [Focus Modes](#focus-modes)
9. [Automation Rules](#automation-rules)
10. [Privacy & Security](#privacy--security)
11. [Tips & Best Practices](#tips--best-practices)

---

## Introduction

### What is the Social Media Suite?

The Noteece Social Media Suite is a **local-first** social media aggregation tool that helps you manage multiple accounts across 18+ platforms in one place. Unlike traditional social media managers, all your data is stored locally on your device with military-grade encryption, giving you complete privacy and control.

### Key Features

- ✅ **18+ Platform Support**: Twitter, Instagram, YouTube, TikTok, LinkedIn, Discord, Reddit, and more
- ✅ **Multi-Account Management**: Run multiple accounts per platform (e.g., personal + work Twitter)
- ✅ **Zero Infrastructure Cost**: No cloud servers, no subscription fees, no API costs
- ✅ **Military-Grade Encryption**: SQLCipher + XChaCha20-Poly1305 AEAD
- ✅ **Privacy-First**: Your data never leaves your device
- ✅ **Unified Timeline**: See all your social feeds in one place
- ✅ **Smart Categorization**: AI-powered content organization
- ✅ **Focus Modes**: Stay productive with platform blocking
- ✅ **Full-Text Search**: Find any post instantly with FTS5

### System Requirements

- **Desktop**: Windows 10+, macOS 11+, or Linux (Ubuntu 20.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free space (plus ~50MB per 10,000 posts)
- **Internet**: Required for syncing social media platforms

---

## Getting Started

### First Launch

1. **Create Your Noteece Vault**
   - Launch Noteece Desktop
   - Create a new vault or unlock an existing one
   - Set a strong master password (this encrypts all your social data)

2. **Navigate to Social Hub**
   - Click the **Social** icon in the sidebar
   - You'll see an empty timeline - time to add accounts!

3. **Add Your First Account**
   - Click **"Add Account"** button
   - Select a platform (e.g., Twitter)
   - Enter your account username/handle
   - Click **"Connect"**

### Understanding the Interface

```
┌─────────────────────────────────────────────────────┐
│  [Noteece Logo]  Notes  Tasks  Social  Calendar     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Social Hub                                          │
│  ┌──────────────────┐  ┌──────────────────────────┐│
│  │ Accounts (3)      │  │ Timeline                 ││
│  │ • @work_twitter   │  │ ┌────────────────────┐  ││
│  │ • @personal_ig    │  │ │ Post from Twitter  │  ││
│  │ • @linkedin       │  │ │ @username • 2h ago │  ││
│  └──────────────────┘  │ │ Content here...     │  ││
│                         │ └────────────────────┘  ││
│  ┌──────────────────┐  │ ┌────────────────────┐  ││
│  │ Categories        │  │ │ Post from LinkedIn │  ││
│  │ • Work           │  │ │ @company • 4h ago  │  ││
│  │ • Personal        │  │ │ Content here...     │  ││
│  │ • Learning        │  │ └────────────────────┘  ││
│  └──────────────────┘  └──────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## Account Management

### Adding Accounts

**Step-by-Step:**

1. Click **"Add Account"** in the Social Hub
2. Select platform from dropdown:
   - Twitter/X
   - Instagram
   - YouTube
   - TikTok
   - LinkedIn
   - Discord
   - Reddit
   - Spotify
   - Pinterest
   - Facebook
   - And 8 more platforms...
3. Enter your **username** or **handle** (without @ symbol)
4. Optionally set a **display name** (for your own reference)
5. Set **sync frequency** (how often to check for new posts):
   - Every 15 minutes (aggressive)
   - Every 30 minutes (balanced)
   - Every 60 minutes (default)
   - Every 2 hours (minimal)
6. Click **"Connect"**

**What Happens Next:**

- A secure WebView window opens for that platform
- Log in to your account normally
- The extractor starts monitoring your feed
- New posts are automatically saved to your local database
- Close the WebView when done (or minimize to keep syncing)

### Managing Multiple Accounts

You can add multiple accounts for the same platform:

**Example: Personal + Work Twitter**

```
1. Add first account: @personal_twitter
2. Add second account: @work_twitter
3. Each gets its own WebView session
4. Posts are tracked separately
5. Both appear in unified timeline
```

**Account Settings:**

- **Enable/Disable**: Temporarily stop syncing an account
- **Sync Frequency**: Adjust how often to check for updates
- **Edit Display Name**: Change how the account appears in your interface
- **Delete Account**: Remove account and all associated posts

### Sync Status

Each account shows a sync status indicator:

- 🟢 **Active**: Currently syncing
- 🔵 **Idle**: Waiting for next sync
- 🟡 **Warning**: Sync issues (check credentials)
- 🔴 **Error**: Failed to sync (needs re-authentication)

---

## Timeline & Feed

### Unified Timeline

The **Unified Timeline** shows all posts from all your connected accounts in one continuous feed.

**Features:**

- **Infinite Scroll**: Automatically loads more posts as you scroll
- **Platform Badges**: Each post shows its source platform
- **Engagement Metrics**: Likes, shares, comments, views
- **Media Preview**: Images, videos, and thumbnails inline
- **Time Stamps**: Relative (2h ago) or absolute (Jan 7, 2025 14:30)

### Filtering

**Filter by Platform:**

```
[All Platforms ▼]  [Twitter] [Instagram] [LinkedIn] [+5 more]
```

Click platform badges to toggle visibility. Selected platforms remain visible while others are hidden.

**Filter by Time Range:**

- **Today**: Posts from last 24 hours
- **This Week**: Last 7 days
- **This Month**: Last 30 days
- **This Year**: Last 365 days
- **All Time**: Everything (default)

**Filter by Category:**

```
[All Categories ▼]  [Work] [Personal] [Learning] [News]
```

### Sorting Options

- **Newest First** (default): Chronological order
- **Oldest First**: Reverse chronological
- **Most Liked**: Highest engagement (likes)
- **Most Commented**: Highest discussion activity

---

## Categories & Organization

### What are Categories?

Categories help you organize posts across all platforms. Think of them as **cross-platform labels**.

**Example Categories:**

- **Work**: LinkedIn posts, work-related tweets, Slack messages
- **Personal**: Family Instagram photos, personal Facebook posts
- **Learning**: Educational YouTube videos, Medium articles
- **News**: Breaking news tweets, Reddit news posts
- **Entertainment**: TikToks, memes, funny videos

### Creating Categories

1. Click **"New Category"** in the sidebar
2. Enter category name (e.g., "Work")
3. Choose a color (for visual identification)
4. Select an icon (optional)
5. Click **"Create"**

**Best Practices:**

- Keep categories broad (5-10 total)
- Use consistent naming
- Choose distinct colors
- Don't over-categorize

### Manual Categorization

**On any post:**

1. Click the **category icon** (🏷️)
2. Select one or more categories
3. Post is instantly tagged

**Bulk Categorization:**

1. Select multiple posts (checkbox)
2. Click **"Assign Category"**
3. Choose category
4. Apply to all selected

### Auto-Categorization

Let the AI automatically categorize posts based on:

- **Content keywords**: "meeting" → Work
- **Platform**: LinkedIn → Work, Instagram → Personal
- **Hashtags**: #tech → Learning
- **Author**: Specific accounts → Specific categories

**Setting up Auto Rules:**

1. Go to **Settings** → **Categories**
2. Click **"Add Auto Rule"**
3. Choose rule type:
   - Content contains: "keyword"
   - Author contains: "@username"
   - Platform equals: "twitter"
   - Hashtag contains: "#topic"
4. Select target category
5. Set priority (higher = executes first)
6. Save

**Example Auto Rules:**

```
Rule 1 (Priority 10): Platform = LinkedIn → Category = Work
Rule 2 (Priority 5):  Content contains "meeting" → Category = Work
Rule 3 (Priority 1):  Hashtag contains "#funny" → Category = Entertainment
```

---

## Search & Discovery

### Full-Text Search

The search box supports **FTS5 full-text search** across all posts:

**Search Syntax:**

```
Simple search:     hello world
Exact phrase:      "hello world"
Author search:     @username
Content + author:  tech @elonmusk
```

**Search Tips:**

- Search is **case-insensitive**
- Results are **ranked by relevance**
- Searches **content and author names**
- Maximum **1000 results** per query
- **300ms debounced** for performance

**Advanced Queries:**

```
Multiple terms:  machine learning AI
Exclusion:      (not supported yet)
Wildcards:      (not supported yet)
```

### Browsing by Platform

Click any platform badge to filter the timeline:

```
[Twitter] → Shows only Twitter posts
[Instagram] + [TikTok] → Shows Instagram and TikTok posts
```

### Browsing by Category

Click any category in the sidebar:

```
[Work] → Shows all posts tagged as "Work"
[Learning] → Shows all educational content
```

---

## Analytics

### Overview Dashboard

The Analytics Dashboard shows insights about your social media usage:

**Metrics Displayed:**

- Total posts synced
- Platforms active
- Categories in use
- Time range selector

### Platform Breakdown

See which platforms you use most:

```
Twitter:    1,234 posts (45%)  [████████░░]
Instagram:    876 posts (32%)  [██████░░░░]
LinkedIn:     432 posts (16%)  [███░░░░░░░]
Reddit:       187 posts (7%)   [█░░░░░░░░░]
```

### Time Series Activity

Track your activity over time:

```
Daily Post Count (Last 14 Days)
150│     ╭─╮
   │    ╭╯ │    ╭╮
100│  ╭╯│  │  ╭╯╰╮
   │ ╭╯ │  ╰──╯  │
 50│╭╯  │        ╰╮
   ├────────────────
    1  3  5  7  9 11 13
```

### Category Statistics

See engagement by category:

```
Category    Posts  Avg Engagement
Work          342   12.5%
Personal      567   8.3%
Learning      234   15.7%
News          123   6.2%
```

**Engagement Rate Formula:**

```
(likes + comments + shares) / views × 100
```

### Top Performing Posts

View your highest engagement posts:

```
1. "Check out this new feature!" - 1.2K likes, 234 comments
2. "Excited to announce..." - 890 likes, 156 comments
3. "What do you think about..." - 765 likes, 321 comments
```

### Time Range Selection

Choose analysis period:

- Last 7 days
- Last 30 days (default)
- Last 90 days
- Last 365 days

### Auto-Refresh

Analytics refresh every 60 seconds automatically.

---

## Focus Modes

### What are Focus Modes?

Focus Modes help you **stay productive** by blocking distracting platforms during work hours.

**Use Cases:**

- Block social media during deep work
- Allow only educational content during study time
- Complete digital detox on weekends
- Custom modes for your workflow

### Preset Focus Modes

**1. Deep Work 🧠**

- **Purpose**: Maximum productivity
- **Blocks**: Twitter, Instagram, TikTok, Facebook, Reddit
- **Allows**: LinkedIn, Slack (work platforms)
- **Best For**: Focused work sessions

**2. Social Time 👥**

- **Purpose**: Controlled social media use
- **Blocks**: None
- **Allows**: Twitter, Instagram, Facebook
- **Best For**: Scheduled social media breaks

**3. Learning 📚**

- **Purpose**: Educational content only
- **Blocks**: Instagram, TikTok, Dating apps
- **Allows**: YouTube, Reddit (educational)
- **Best For**: Study sessions

**4. Detox 🌿**

- **Purpose**: Complete digital break
- **Blocks**: All social media platforms
- **Allows**: Nothing
- **Best For**: Weekends, vacations, mental health

### Activating Focus Modes

**Manual Activation:**

1. Go to **Settings** → **Focus Modes**
2. Click **"Activate"** on desired mode
3. Mode becomes active (only one at a time)
4. Click **"Deactivate"** to turn off

**What Happens When Active:**

- Blocked platforms **won't sync**
- Timeline **hides** posts from blocked platforms
- WebView windows for blocked platforms **can't open**
- You'll see a notification: "🧠 Deep Work mode active"

### Creating Custom Focus Modes

1. Click **"Create Custom Mode"**
2. Enter name (e.g., "Weekend Detox")
3. Choose description (optional)
4. Select icon (optional)
5. **Configure Blocked Platforms:**
   - Check platforms to block
6. **Configure Allowed Platforms:**
   - Check platforms to allow (everything else blocked)
7. Save

**Example Custom Mode: "Morning Routine"**

- Blocks: Twitter, Facebook, Reddit (distracting)
- Allows: LinkedIn (check work updates), Spotify (music)
- Active: 6 AM - 9 AM weekdays

---

## Automation Rules

### What are Automation Rules?

Automation Rules let you **trigger actions** based on specific events.

**Components:**

1. **Trigger**: When something happens
2. **Action**: Do something automatically

### Trigger Types

**1. Time of Day**

```
Trigger: Every day at 9:00 AM
Action: Activate "Deep Work" focus mode
```

**2. Day of Week**

```
Trigger: Every Monday
Action: Send notification "Start weekly review"
```

**3. Platform Open**

```
Trigger: When Twitter is opened
Action: Send notification "Remember your focus goal!"
```

**4. Category Post**

```
Trigger: New post in "Work" category
Action: Auto-categorize as "Important"
```

### Action Types

**1. Activate Focus Mode**

- Turn on a specific focus mode
- Example: "Activate Deep Work at 9 AM"

**2. Disable Sync**

- Stop syncing a specific platform
- Example: "Disable Twitter sync on weekends"

**3. Send Notification**

- Show a reminder message
- Example: "Remember to take a break!"

**4. Auto-Categorize**

- Assign category to new posts
- Example: "Categorize all LinkedIn posts as Work"

### Creating Automation Rules

1. Go to **Settings** → **Automation**
2. Click **"New Rule"**
3. Enter rule name (e.g., "Morning Focus")
4. Select **Trigger Type**:
   - Time of Day: Enter time (e.g., "09:00")
   - Day of Week: Select day (e.g., "monday")
   - Platform Open: Select platform
   - Category Post: Select category
5. Select **Action Type**:
   - Choose action
   - Configure action value (focus mode ID, platform, etc.)
6. Enable rule (toggle)
7. Save

### Example Automation Rules

**Rule 1: Morning Productivity**

```
Name: Morning Focus
Trigger: Time of Day = 09:00
Action: Activate Focus Mode = "Deep Work"
Enabled: Yes
```

**Rule 2: Weekend Detox**

```
Name: Weekend Digital Detox
Trigger: Day of Week = Saturday
Action: Activate Focus Mode = "Detox"
Enabled: Yes
```

**Rule 3: Twitter Warning**

```
Name: Twitter Distraction Warning
Trigger: Platform Open = Twitter
Action: Send Notification = "Remember: 15 min max!"
Enabled: Yes
```

**Rule 4: Auto-Tag Work Posts**

```
Name: Auto-Tag LinkedIn
Trigger: Category Post = (all)
Platform: LinkedIn
Action: Auto-Categorize = "Work"
Enabled: Yes
```

### Managing Rules

- **Enable/Disable**: Toggle individual rules
- **Priority**: Higher priority rules execute first
- **Edit**: Modify trigger or action
- **Delete**: Remove rule permanently

---

## Privacy & Security

### How Your Data is Protected

**1. Military-Grade Encryption**

- **Database**: SQLCipher with 256-bit AES encryption
- **Credentials**: XChaCha20-Poly1305 AEAD encryption
- **Key Derivation**: Argon2 password hashing

**2. Local-First Architecture**

- All data stored on YOUR device
- No cloud servers
- No data transmitted to Noteece servers
- You control the encryption key

**3. Secure Memory**

- Encryption keys zeroed on app exit
- Memory protected by OS process isolation
- No keys written to disk unencrypted

### What Data is Collected?

**Stored Locally:**

- Social media posts (content, author, timestamp)
- Account credentials (encrypted)
- Categories and tags
- Sync history
- Session cookies (encrypted)

**Never Collected:**

- Your master password (only you know it)
- Data from platforms you don't connect
- Browsing history outside connected platforms
- Personal conversations (only what you sync)

### Privacy for Dating Apps

Special privacy considerations for Tinder, Bumble, Hinge:

**Privacy Protections:**

- ⚠️ Explicit privacy notice on first use
- Only stores **first names** (no last names)
- Messages tagged as **sensitive**
- Less frequent syncing (60 min default)
- Clear user consent required

**Recommendations:**

- Use carefully and consider privacy implications
- Don't sync if sharing device with others
- Regular database backups kept secure
- Consider excluding dating apps entirely

### Best Security Practices

**1. Strong Master Password**

- Minimum 12 characters
- Mix uppercase, lowercase, numbers, symbols
- Don't reuse passwords
- Use a password manager

**2. Device Security**

- Enable disk encryption (BitLocker, FileVault, LUKS)
- Lock screen when away
- Keep OS and Noteece updated
- Antivirus software active

**3. Backup Strategy**

- Regular encrypted backups
- Store backups securely (encrypted external drive)
- Test restore procedure
- Don't store backups in cloud unencrypted

**4. Account Security**

- Use 2FA on all social accounts
- Review connected apps regularly
- Log out after syncing (optional)
- Monitor for suspicious activity

### Data Retention

**Automatic Cleanup:**

- Posts older than 1 year can be auto-archived
- Deleted accounts remove all associated posts
- Session cookies expire after 30 days of inactivity

**Manual Control:**

- Delete individual posts
- Delete entire accounts
- Clear sync history
- Purge old data

### GDPR & Data Rights

Since all data is stored locally on your device:

- **You own 100% of your data**
- **Right to Access**: You have full access via database
- **Right to Deletion**: Delete any data anytime
- **Right to Portability**: Export as JSON/CSV
- **No Third-Party Sharing**: Your data never leaves your device

---

## Tips & Best Practices

### Getting the Most Out of the Social Suite

**1. Start Small**

- Connect 2-3 platforms first
- Learn the interface
- Add more platforms gradually
- Don't overwhelm yourself

**2. Use Categories Wisely**

- Create 5-10 broad categories
- Use consistent naming
- Auto-categorize when possible
- Review and refine monthly

**3. Focus Mode Strategy**

- Activate Deep Work during peak productivity hours
- Schedule Social Time breaks (15-30 min)
- Use Detox mode on weekends
- Create custom modes for your workflow

**4. Automation for Efficiency**

- Auto-activate focus modes at set times
- Auto-categorize by platform
- Set sync frequency per account needs
- Use notifications sparingly

**5. Search Like a Pro**

- Use quotes for exact phrases
- Search by @author for specific people
- Combine keywords for precise results
- Save common searches as bookmarks

**6. Analytics for Insights**

- Check weekly to understand usage patterns
- Identify time-consuming platforms
- Balance engagement vs. consumption
- Set goals and track progress

### Performance Optimization

**For Large Databases (10,000+ posts):**

- Enable auto-cleanup for old posts
- Reduce sync frequency for less active accounts
- Use focused searches instead of browsing
- Close unused WebView windows

**For Multiple Accounts:**

- Group by purpose (personal vs. work)
- Use categories to stay organized
- Sync work accounts more frequently
- Personal accounts less frequently

### Troubleshooting Common Issues

**WebView Won't Load:**

- Check internet connection
- Clear cookies and session data
- Re-authenticate account
- Check platform isn't blocked by focus mode

**Sync Not Working:**

- Verify account is enabled
- Check sync frequency setting
- Look for error status indicator
- Re-authenticate if needed

**Posts Not Appearing:**

- Check platform filter (might be hidden)
- Verify time range filter
- Check category filter
- Wait for sync to complete

**Search Not Working:**

- Check query syntax (no special characters)
- Verify posts exist with that content
- Try broader search terms
- Rebuild FTS index (Settings)

**Slow Performance:**

- Close unused WebView windows
- Reduce number of active accounts
- Enable old post cleanup
- Archive or delete old data

### Keyboard Shortcuts

```
Ctrl/Cmd + F     Search
Ctrl/Cmd + N     New category
Ctrl/Cmd + R     Refresh timeline
Ctrl/Cmd + ,     Settings
Ctrl/Cmd + 1-9   Switch between accounts
Escape           Close modal/WebView
```

### Getting Help

**Documentation:**

- User Guide (this document)
- Platform Setup Guides
- Troubleshooting Guide
- Security Documentation

**Support:**

- GitHub Issues: https://github.com/AmirrezaFarnamTaheri/Noteece/issues
- Community Forum: (coming soon)
- Email: (check project README)

---

## Conclusion

The Noteece Social Media Suite empowers you to take control of your social media experience with **privacy, organization, and productivity** at its core.

**Remember:**

- Your data belongs to YOU
- Everything is encrypted and local
- You're in control of what platforms you connect
- Use focus modes to stay productive
- Categorize to stay organized
- Automate to save time

**Enjoy your social media, on your terms! 🎉**

---

_Noteece Social Media Suite - Desktop Edition_
_Built with Rust, Tauri, React, and ❤️_
_© 2025 - Privacy-First, Local-First, You-First_
