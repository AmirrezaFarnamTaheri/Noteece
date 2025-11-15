# Noteece Social Media Suite - Troubleshooting Guide

**Version:** 1.0
**Last Updated:** January 2025

This guide helps you diagnose and fix common issues with the Noteece Social Media Suite.

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation & Setup Issues](#installation--setup-issues)
3. [Account Connection Problems](#account-connection-problems)
4. [Sync Issues](#sync-issues)
5. [Timeline & Display Issues](#timeline--display-issues)
6. [Search Problems](#search-problems)
7. [Performance Issues](#performance-issues)
8. [WebView Issues](#webview-issues)
9. [Database Issues](#database-issues)
10. [Error Messages](#error-messages)
11. [Platform-Specific Issues](#platform-specific-issues)
12. [Getting More Help](#getting-more-help)

---

## Quick Diagnostics

### Is Noteece Working?

**Quick Health Check:**

```
1. Can you unlock your vault? → Test database encryption
2. Can you see the Social Hub? → Test UI rendering
3. Can you add an account? → Test account creation
4. Does the account show 🟢? → Test sync status
5. Do posts appear in timeline? → Test data flow
```

**If ANY step fails, start troubleshooting there.**

### Common Quick Fixes

**90% of issues are solved by:**

1. **Restart Noteece** (clears WebView state, memory leaks)
2. **Check internet connection** (required for syncing)
3. **Re-authenticate account** (Click account → "Reconnect")
4. **Clear cookies** (Settings → Clear Session Data)
5. **Update Noteece** (New fixes released regularly)

**Try these first before deep troubleshooting.**

---

## Installation & Setup Issues

### Noteece Won't Start

**Problem: Application crashes on launch**

**Diagnosis:**

```bash
# Check logs (location varies by OS)
# macOS
tail -f ~/Library/Logs/Noteece/noteece.log

# Linux
tail -f ~/.local/share/noteece/logs/noteece.log

# Windows
type %APPDATA%\Noteece\logs\noteece.log
```

**Solutions:**

1. **Missing Dependencies**
   - Install system dependencies (see README)
   - Update graphics drivers
2. **Corrupted Installation**
   - Reinstall Noteece
   - Clear cache directory
3. **Permission Issues**
   - Run with proper permissions
   - Check file ownership

---

**Problem: Can't create vault**

**Symptoms:**

- "Failed to create vault" error
- No database file created

**Solutions:**

1. **Insufficient Disk Space**
   - Check free space: need at least 1GB
   - Clear temporary files
2. **Permission Denied**
   - Check write permissions on vault directory
   - Run as administrator (Windows)
3. **Path Issues**
   - Don't use special characters in vault path
   - Keep path under 260 chars (Windows)

**Test:**

```bash
# Can you write to the directory?
touch /path/to/vault/test.txt
# If error → Permission issue
```

---

**Problem: Can't unlock vault**

**Symptoms:**

- "Incorrect password" error (but password is correct)
- "Database is locked" error
- "Corrupted database" error

**Solutions:**

**Wrong Password:**

```
→ Try password manager (might have typo)
→ Try on-screen keyboard (avoids keylogger)
→ No recovery possible if truly forgotten (by design)
```

**Database Locked:**

```
→ Another Noteece instance running? Close it
→ Crash left lock file? Delete .db-wal and .db-shm files
→ NFS/network drive? Move to local storage
```

**Corrupted Database:**

```
→ Restore from backup immediately
→ Don't try to fix manually (encryption!)
→ If no backup, data is lost
```

**Prevention:**

- Regular backups (automated recommended)
- Store backups separately from main vault
- Test restore procedure monthly

---

## Account Connection Problems

### Can't Add Account

**Problem: "Add Account" button does nothing**

**Solutions:**

1. **JavaScript Error**
   - Open DevTools (F12)
   - Check Console for errors
   - Report bug with screenshot
2. **Modal Blocked**
   - Disable browser extensions (if web version)
   - Check popup blocker
3. **Memory Issue**
   - Close other applications
   - Restart Noteece

---

**Problem: WebView won't open**

**Symptoms:**

- Click "Connect" → nothing happens
- WebView flashes and closes
- "Failed to create window" error

**Solutions:**

**1. Platform URL Invalid**

```
→ Check platform is supported
→ Verify platform name spelling
→ Report if platform should be supported
```

**2. WebView Engine Missing**

```
Windows: Install WebView2 Runtime
macOS: System WebKit (should be built-in)
Linux: Install webkit2gtk
```

**3. Firewall Blocking**

```
→ Check firewall settings
→ Allow Noteece network access
→ Check antivirus not blocking
```

**4. Focus Mode Active**

```
→ Check if platform is blocked by focus mode
→ Deactivate focus mode temporarily
→ Settings → Focus Modes → Deactivate All
```

---

### Authentication Fails

**Problem: Can't log in to platform in WebView**

**Solutions:**

**1. 2FA Required**

```
→ Complete 2FA in WebView normally
→ Use authenticator app/SMS
→ May need to approve on mobile device
```

**2. Suspicious Login Warning**

```
Twitter/X: "Unusual activity detected"
→ Confirm it's you via email/SMS
→ Platform sees new "device" (WebView)
```

**3. Password Manager Not Working**

```
→ Type password manually (WebView limitation)
→ Copy/paste from password manager
→ Don't use autofill in WebView
```

**4. CAPTCHA Challenges**

```
→ Complete CAPTCHA normally
→ If repeating, platform may be blocking automation
→ Wait 1 hour and try again
```

---

## Sync Issues

### Posts Not Syncing

**Problem: Account connected but no posts appear**

**Diagnosis Checklist:**

```
[ ] Is account enabled? (not disabled)
[ ] Is sync status 🟢 Active or 🔵 Idle? (not 🔴 Error)
[ ] Is internet connected?
[ ] Is platform actually loading in WebView?
[ ] Are posts visible in the platform WebView?
[ ] Has enough time passed? (check sync frequency)
```

**Solutions:**

**1. Account Disabled**

```
Settings → Accounts → [Account] → Enable
```

**2. Sync Frequency Too Long**

```
Settings → Accounts → [Account] → Sync Frequency → 30 min
```

**3. WebView Not Loaded**

```
→ Open WebView window
→ Manually browse to feed
→ Scroll to load posts
→ Keep window open or minimize
```

**4. Platform Feed Empty**

```
→ Check if you actually have new posts on platform
→ Follow more accounts / join more channels
→ Some platforms require activity to show feed
```

**5. Extractor Not Working**

```
→ Open DevTools in WebView (F12)
→ Check Console for errors like:
   "[Noteece Twitter] Extractor loaded"
→ If missing, extractor failed to inject
→ Report bug with console screenshot
```

---

**Problem: Sync stopped working (was working before)**

**Symptoms:**

- Sync status 🔴 Error
- "Failed to sync" message
- No new posts since [time]

**Solutions:**

**1. Session Expired**

```
→ Platform logged you out
→ Re-authenticate: Click account → "Reconnect"
→ Log in again in WebView
```

**2. Platform Changed**

```
→ Platform updated UI (broke extractor)
→ Check for Noteece updates
→ Report issue with platform name + date
```

**3. Rate Limiting**

```
→ Platform detected automated access
→ Reduce sync frequency (60 min → 120 min)
→ Wait 24 hours before re-enabling
```

**4. Credentials Changed**

```
→ Changed password on platform?
→ Re-authenticate with new credentials
```

---

**Problem: Duplicate posts appearing**

**Symptoms:**

- Same post shows multiple times
- "2x" or more copies in timeline

**Cause:** Extractor deduplication failure

**Solutions:**

1. **Delete Duplicates**
   ```
   → Manually delete extra copies
   → Database maintains unique constraint
   ```
2. **Report Bug**
   ```
   → Note which platform
   → Note post ID (if visible)
   → Help us fix deduplication logic
   ```

---

## Timeline & Display Issues

### Timeline Not Showing Posts

**Problem: Timeline is empty (but posts exist)**

**Diagnosis:**

```
Check filters:
[ ] Platform filter → "All Platforms" selected?
[ ] Time range filter → "All Time" selected?
[ ] Category filter → "All Categories" selected?
[ ] Search box → Empty (no active search)?
```

**Solutions:**

**1. Filters Hiding Posts**

```
→ Reset all filters to defaults
→ Click "Clear Filters" button
→ Check each filter dropdown
```

**2. Timeline Not Loading**

```
→ Scroll down to trigger load
→ Check internet connection
→ Refresh page (Cmd/Ctrl + R)
```

**3. Database Empty**

```
→ Verify accounts are syncing
→ Check sync history for recent syncs
→ Wait for initial sync to complete (can take 5-10 min)
```

---

**Problem: Images/videos not displaying**

**Symptoms:**

- Broken image icons
- Video player shows error
- Thumbnails missing

**Solutions:**

**1. Media URLs Expired**

```
→ Social media platforms use temporary URLs
→ URLs expire after hours/days
→ Re-sync account to refresh URLs
```

**2. Network Issue**

```
→ Check internet connection
→ Try different network (WiFi → mobile data)
→ Check if platform is down
```

**3. Content Deleted**

```
→ Original post deleted on platform
→ Media removed by user/moderator
→ Noteece can't retrieve deleted content
```

**4. CORS / Content Policy**

```
→ Platform blocks external embedding
→ Click "View Original" to see on platform
→ Can't be fixed client-side
```

---

**Problem: Formatting looks broken**

**Symptoms:**

- Text overlapping
- Images too large
- Layout messed up

**Solutions:**

1. **Browser Zoom**
   ```
   → Reset zoom to 100% (Cmd/Ctrl + 0)
   ```
2. **Window Size**
   ```
   → Resize window (minimum 1024px wide recommended)
   ```
3. **CSS Not Loaded**
   ```
   → Refresh page (Cmd/Ctrl + R)
   → Clear cache
   → Reinstall if persistent
   ```

---

## Search Problems

### Search Returns No Results

**Problem: Search finds nothing (but posts exist)**

**Diagnosis:**

```
Search: "test"
→ No results

Then browse timeline manually
→ Posts with "test" visible

= Search index issue
```

**Solutions:**

**1. FTS Index Not Built**

```
→ Initial sync may not have built index
→ Wait for sync to complete
→ Restart Noteece to trigger rebuild
```

**2. Search Query Syntax**

```
✅ Simple search: hello
✅ Exact phrase: "hello world"
✅ Author search: @username

❌ Wildcards: hel* (not supported)
❌ Exclusion: -hello (not supported)
```

**3. Rebuild FTS Index**

```
Settings → Advanced → Rebuild Search Index
→ Takes 1-5 minutes for large databases
→ Progress shown in UI
```

---

**Problem: Search is slow**

**Symptoms:**

- Search takes >5 seconds
- UI freezes during search
- High CPU usage

**Solutions:**

**1. Large Database**

```
→ If >10,000 posts, search slower
→ Consider archiving old posts
→ Use filters to narrow search
```

**2. Complex Query**

```
→ Simplify search terms
→ Use fewer keywords
→ Avoid very common words (the, and, etc.)
```

**3. Rebuild Index**

```
→ FTS index may be fragmented
→ Settings → Rebuild Search Index
```

---

## Performance Issues

### Noteece is Slow

**Problem: UI laggy, slow response**

**Diagnosis:**

```
Check Task Manager / Activity Monitor:
- CPU usage?
- Memory usage?
- Disk I/O?
```

**Solutions:**

**1. Too Many WebViews Open**

```
→ Close unused WebView windows
→ Keep only active accounts open
→ Each WebView = separate browser instance
```

**2. Large Database**

```
→ Enable auto-cleanup: Settings → Data → Auto-cleanup old posts
→ Archive posts >1 year old
→ Delete unused accounts
```

**3. Memory Leak**

```
→ Restart Noteece (clears memory)
→ Report if happens frequently (memory leak bug)
```

**4. Low System Resources**

```
→ Close other applications
→ Upgrade RAM (4GB minimum, 8GB recommended)
→ Free up disk space
```

---

**Problem: High CPU usage**

**Symptoms:**

- Fans running loud
- CPU 50%+ constantly
- Battery draining fast (laptops)

**Causes & Solutions:**

**1. Active Sync**

```
→ Normal during sync (5-10% spike)
→ If constant: Reduce sync frequency
```

**2. WebView Rendering**

```
→ Social media sites use lots of JS
→ Close WebViews when not syncing
→ Disable auto-play videos in platform settings
```

**3. Background Tasks**

```
→ Check Settings → Sync Status
→ Disable accounts you're not actively using
```

---

**Problem: Database file is huge**

**Symptoms:**

- .db file >1GB
- Slow queries
- Disk space filling up

**Disk Usage:**

```
~50MB per 10,000 posts (estimate)
100,000 posts ≈ 500MB
1,000,000 posts ≈ 5GB
```

**Solutions:**

**1. Auto-Cleanup**

```
Settings → Data → Enable auto-cleanup
→ Delete posts >1 year old automatically
→ Runs weekly
```

**2. Manual Cleanup**

```
→ Delete old posts: Timeline → Filter → Select → Delete
→ Delete unused accounts (CASCADE deletes all posts)
→ Vacuum database: Settings → Advanced → Vacuum
```

**3. Archive**

```
→ Export old posts to JSON (future feature)
→ Delete from database
→ Import if needed later
```

---

## WebView Issues

### WebView Crashes

**Problem: WebView window closes unexpectedly**

**Symptoms:**

- WebView open → suddenly gone
- "WebView crashed" error
- Sync stops mid-way

**Solutions:**

**1. Memory Issue**

```
→ Close other applications
→ Restart Noteece
→ Increase system RAM if possible
```

**2. Platform Issue**

```
→ Platform website crashed (not Noteece)
→ Try reopening WebView
→ Clear cookies and retry
```

**3. WebView Engine Bug**

```
→ Update system (includes WebView updates)
→ Report bug with platform name + OS
```

---

**Problem: WebView won't scroll**

**Symptoms:**

- Can't scroll in WebView window
- Infinite scroll not loading more content
- Stuck on first page

**Solutions:**

**1. Keyboard Shortcuts**

```
→ Try Page Down / Space
→ Try Home / End keys
→ Try arrow keys
```

**2. Mouse Issues**

```
→ Try different mouse/trackpad
→ Check mouse drivers
→ Try clicking and dragging scrollbar
```

**3. Platform Issue**

```
→ Platform may have broken infinite scroll
→ Try clicking "Load More" button manually
→ Report to platform, not Noteece
```

---

### WebView Content Not Loading

**Problem: WebView shows blank page or loading spinner**

**Solutions:**

**1. Slow Connection**

```
→ Wait longer (some sites are slow)
→ Check internet speed
→ Try different network
```

**2. Platform Down**

```
→ Check if platform is accessible in normal browser
→ Visit status pages (e.g., downdetector.com)
→ Wait and retry later
```

**3. Ad Blocker / DNS**

```
→ DNS may be blocking platform
→ Try different DNS (8.8.8.8, 1.1.1.1)
→ Disable ad blocker for platform
```

**4. Firewall**

```
→ Firewall may block WebView requests
→ Allow Noteece network access
→ Check corporate firewall rules
```

---

## Database Issues

### "Database is Locked" Error

**Cause:** SQLite database is already open in another process

**Solutions:**

**1. Multiple Noteece Instances**

```
→ Close all Noteece windows/processes
→ Check Task Manager / Activity Monitor
→ Kill any hung Noteece processes
→ Restart Noteece
```

**2. Lock Files**

```
→ Crash may have left lock files
→ Close Noteece completely
→ Delete files in vault directory:
   - *.db-wal (write-ahead log)
   - *.db-shm (shared memory)
→ Restart Noteece
```

**3. NFS / Network Drive**

```
→ SQLite doesn't work well on network drives
→ Move vault to local storage
→ Use sync tool (Syncthing) for backups
```

---

### "Corrupted Database" Error

**⚠️ CRITICAL: Stop immediately!**

**DO:**

- [ ] Stop using Noteece
- [ ] Copy entire vault directory to safe location
- [ ] Restore from known-good backup
- [ ] Test backup in separate location

**DON'T:**

- [ ] Try to "fix" database manually
- [ ] Run SQLite PRAGMA commands (encryption!)
- [ ] Continue writing to corrupted database
- [ ] Panic (backups exist, right?)

**Causes:**

- Disk failure
- Power loss during write
- System crash
- Malware/ransomware
- Rare SQLCipher bug

**Recovery:**

```
1. Restore from backup
   → Copy backup.db to vault directory
   → Rename to main database name
   → Unlock vault

2. If no backup:
   → Try SQLite recovery tools (risky!)
   → May lose recent data
   → Consider professional data recovery
```

**Prevention:**

- Automated backups (daily)
- Multiple backup locations
- Test restores monthly
- UPS for power protection
- Regular disk health checks

---

### Database Migration Fails

**Problem: "Migration failed" error on version update**

**Symptoms:**

- Update installed → can't unlock vault
- "Schema version mismatch" error
- "Migration script failed" error

**Solutions:**

**1. Restore Backup First**

```
BEFORE updating:
→ Backup current vault
→ Then update Noteece
→ If migration fails, restore backup + downgrade
```

**2. Check Logs**

```
[db] Starting migration
[db] Current schema version: 5
[db] Migrating to version 6
[ERROR] Migration failed: ...

→ Report error message to developers
→ Include Noteece version (old + new)
```

**3. Rollback**

```
→ Downgrade Noteece to previous version
→ Restore backup
→ Wait for migration fix
→ Update again when fixed
```

---

## Error Messages

### "Invalid account_id"

**Meaning:** Input validation failed

**Cause:**

- Account ID empty or > 100 chars
- May indicate data corruption

**Solution:**

```
→ If during account creation: Check account name length
→ If during sync: Delete and recreate account
→ Report bug if persistent
```

---

### "Failed to parse posts: ..."

**Meaning:** JSON from extractor is malformed

**Cause:**

- Extractor bug
- Platform changed format
- Network error truncated response

**Solution:**

```
→ Check Noteece updates (may be fixed)
→ Report with platform name + date
→ Workaround: Disable account temporarily
```

---

### "Post account_id mismatch"

**Meaning:** Cross-account injection detected (security)

**Cause:**

- Extractor bug (sending posts from Account A to Account B)
- Should never happen in normal use

**Solution:**

```
→ Report bug immediately (security issue!)
→ Include:
   - Which platform
   - Account IDs involved (first 8 chars only)
   - When it started
```

---

### "Data payload too large"

**Meaning:** Sync batch exceeded 10MB limit

**Cause:**

- Trying to sync too many posts at once
- Large images/videos in payload

**Solution:**

```
→ Reduce batch size (internal setting)
→ Sync more frequently (smaller batches)
→ Report if happens frequently
```

---

### "Invalid platform URL"

**Meaning:** URL parsing failed (security check)

**Cause:**

- Platform URL malformed
- New platform not fully configured

**Solution:**

```
→ Check platform is officially supported
→ Report if should be supported
→ Don't modify platform URLs manually
```

---

## Platform-Specific Issues

### Twitter / X

**Problem: Login loop (keeps asking to log in)**

**Solution:**

- Complete 2FA
- Disable VPN (Twitter blocks some VPNs)
- Clear cookies and retry
- Try "Log in with Google" instead

**Problem: No tweets syncing**

**Solution:**

- Scroll timeline to load tweets
- Check account isn't private/protected
- Twitter may be rate-limiting

---

### Instagram

**Problem: "Suspicious Login Attempt" email**

**Solution:**

- Confirm it's you (it's the WebView)
- Use "Log in with Facebook" if available
- Complete security challenges

**Problem: Stories not syncing**

**Solution:**

- Click on stories to load them
- Stories disappear after 24h (can't sync old ones)

---

### LinkedIn

**Problem: Email verification required**

**Solution:**

- Check email and verify
- LinkedIn has strict security
- May require phone verification too

**Problem: Very few posts syncing**

**Solution:**

- LinkedIn shows limited feed per session
- Scroll to load more
- Lower sync frequency (LinkedIn limits API-like access)

---

### Discord

**Problem: Messages not appearing**

**Solution:**

- Click into channels to load messages
- Discord lazy-loads channels
- Keep WebView open for active syncing

**Problem: High-res images missing**

**Solution:**

- Should auto-detect (fixed in recent update)
- Click images in WebView to load full-res

---

### Reddit

**Problem: NSFW content showing (don't want it)**

**Solution:**

- Configure Reddit settings (not Noteece)
- Log in → Settings → Content Preferences → Hide NSFW

---

### Facebook

**Problem: Login blocked / "Unusual Activity"**

**Solution:**

- Facebook aggressively blocks automation
- Use sparingly
- Complete security checks
- Consider NOT syncing Facebook (manual browsing better)

---

### Telegram

**Problem: Verification code not received**

**Solution:**

- Code sent to your Telegram app (not SMS)
- Open Telegram mobile/desktop → check for code
- Codes sent to all active sessions

---

## Getting More Help

### Before Reporting a Bug

**Gather Information:**

```
1. Noteece version: Help → About
2. Operating system: Windows 11 / macOS 13 / Ubuntu 22.04
3. Platform affected: Twitter, Instagram, etc.
4. Error message: Exact text (screenshot)
5. Steps to reproduce: What you did before error
6. Logs: Check log files for errors
```

**Check First:**

- [ ] Read this troubleshooting guide
- [ ] Read User Guide
- [ ] Read Platform Setup Guide
- [ ] Search GitHub Issues for duplicate
- [ ] Try on latest Noteece version

### Reporting a Bug

**GitHub Issues:** https://github.com/AmirrezaFarnamTaheri/Noteece/issues

**Include:**

1. **Title:** Clear, specific (❌ "broken" → ✅ "Twitter sync fails with 'Invalid JSON' error")
2. **Description:** What happened vs. what you expected
3. **Steps to Reproduce:**
   ```
   1. Add Twitter account
   2. Set sync frequency to 15 min
   3. Wait for sync
   4. Error appears
   ```
4. **Environment:**
   - Noteece version
   - OS version
   - Platform affected
5. **Logs:** Attach log file (redact sensitive info)
6. **Screenshots:** Error messages, console logs

### Community Support

**Coming Soon:**

- Community Forum
- Discord Server
- FAQ Wiki
- Video Tutorials

**For Now:**

- GitHub Issues (public)
- Email (check repository)

---

## Troubleshooting Checklist

**Before giving up, try this checklist:**

- [ ] Restart Noteece
- [ ] Check internet connection
- [ ] Update to latest version
- [ ] Re-authenticate account
- [ ] Clear cookies and session data
- [ ] Check firewall/antivirus
- [ ] Check disk space (>1GB free)
- [ ] Check system resources (RAM, CPU)
- [ ] Review error logs
- [ ] Restore from backup (if data issue)
- [ ] Search GitHub Issues
- [ ] Read relevant documentation
- [ ] Try on different network
- [ ] Try with different account
- [ ] File a bug report

**99% of issues are solved by this checklist.**

---

_If you're still stuck after trying everything in this guide, please file a GitHub Issue with full details. We'll help you!_

---

_Noteece Social Media Suite - Troubleshooting Guide_
_Version 1.0 - January 2025_
_Need more help? → GitHub Issues_
