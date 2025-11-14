# Noteece - Simple Installation Guide

## What is Noteece?

Noteece is a secure, private life management app that helps you organize tasks, notes, calendar events, and health metrics. Everything is encrypted and stays on your device - we never see your data.

---

## Quick Start (5 Minutes)

### Step 1: Get the Code

```bash
# Download Noteece
git clone https://github.com/AmirrezaFarnamTaheri/Noteece.git
cd Noteece
```

### Step 2: Install What You Need

**Option A: For Mobile App (Recommended)**

```bash
# Go to mobile app folder
cd apps/mobile

# Install everything needed
npm install --legacy-peer-deps

# Start the app
npm start
```

**Option B: For Desktop App**

```bash
# Go to desktop app folder
cd apps/desktop

# Install Rust (one-time setup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install everything needed
npm install

# Start the app
npm run tauri dev
```

### Step 3: Open the App

- **Mobile**: Scan the QR code with Expo Go app on your phone
- **Desktop**: The app window will open automatically

### Step 4: Create Your Vault

1. Click "Create New Vault"
2. Choose a strong password (at least 8 characters)
3. Remember this password - we can't recover it!
4. Start organizing your life!

---

## What's Inside?

### Features

✅ **Tasks** - Organize your to-dos
✅ **Notes** - Capture ideas and thoughts
✅ **Calendar** - Sync with your existing calendars
✅ **Insights** - Get smart suggestions
✅ **Time Tracking** - Track how you spend your time
✅ **Health Metrics** - Log workouts, sleep, mood
✅ **Voice Capture** - Record quick voice notes
✅ **Sync** - Keep devices in sync over local network

### Security Features

🔒 **Military-Grade Encryption** - ChaCha20-Poly1305
🔑 **Secure Passwords** - Argon2id protection
🛡️ **No Cloud** - Everything stays on your device
🔐 **Zero Knowledge** - We never see your data

---

## Using Noteece

### Create a Task

1. Go to "Tasks" tab
2. Tap the "+" button
3. Type your task
4. Press enter

### Write a Note

1. Go to "Capture" tab
2. Select "Note"
3. Write your thoughts
4. Tap "Save"

### Track Your Time

1. Start a timer when you begin work
2. Stop it when done
3. View your time reports in Insights

### Sync Devices

1. Make sure both devices are on same Wi-Fi
2. Go to "More" → "Manual Sync"
3. Devices will find each other automatically

---

## Troubleshooting

### "Command not found" Error

**Problem**: You don't have Node.js or npm installed

**Solution**:

```bash
# Install Node.js (this also installs npm)
# On Mac:
brew install node

# On Ubuntu/Linux:
sudo apt install nodejs npm

# On Windows:
# Download from https://nodejs.org
```

### "expo-cli not found" Error

**Problem**: Expo CLI not installed

**Solution**:

```bash
npm install -g expo-cli
```

### App Won't Start

**Problem**: Dependencies missing

**Solution**:

```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Forgot Password

**Problem**: Can't unlock vault

**Solution**: Unfortunately, we can't recover passwords (that's what makes it secure!). You'll need to:

1. Reset the app
2. Lose your data
3. Create a new vault

💡 **Tip**: Write down your password in a safe place!

---

## System Requirements

### Mobile App

- **iOS**: 13.0 or higher
- **Android**: 10.0 or higher
- **Storage**: 100 MB free space
- **RAM**: 2 GB minimum

### Desktop App

- **Windows**: Windows 10 or higher
- **Mac**: macOS 10.15 or higher
- **Linux**: Ubuntu 20.04 or higher
- **Storage**: 200 MB free space
- **RAM**: 4 GB minimum

---

## Privacy & Security

### What Data Do We Collect?

**Nothing.** Seriously. Zero. Nada.

- ❌ No cloud storage
- ❌ No analytics
- ❌ No telemetry
- ❌ No tracking
- ✅ 100% local

### How Is My Data Protected?

1. **Password Protected**
   - Your password never leaves your device
   - Uses Argon2id (the strongest method available)

2. **Encrypted Storage**
   - Everything is encrypted with ChaCha20-Poly1305
   - Military-grade security (same as government agencies use)

3. **Secure Sync**
   - Only works on your local network
   - End-to-end encrypted
   - No internet required

### Can You See My Data?

**No.** Even if we wanted to (we don't), we can't because:

- Data never leaves your device
- Only you have the encryption key
- We don't have servers to store anything

---

## Getting Help

### Documentation

- **User Guide**: See `USER_GUIDE.md`
- **Developer Guide**: See `DEVELOPER_GUIDE.md`
- **Security Details**: See `SECURITY.md`

### Support

- **GitHub Issues**: [Report a bug](https://github.com/AmirrezaFarnamTaheri/Noteece/issues)
- **Discussions**: [Ask questions](https://github.com/AmirrezaFarnamTaheri/Noteece/discussions)

### Community

- Star the project on GitHub
- Share with friends
- Contribute improvements

---

## Tips for Best Experience

### 1. Use a Strong Password

✅ Good: `MyDog!Rex2023+Secure`
❌ Bad: `password123`

### 2. Backup Regularly

```bash
# Export your data
Settings → Export Data → Save to USB drive
```

### 3. Enable Sync

Keep multiple devices in sync so you never lose data.

### 4. Try Voice Capture

Quickest way to capture thoughts on the go.

### 5. Review Insights Daily

See patterns and get smarter about your time.

---

## Advanced Setup (Optional)

### Custom Installation Location

```bash
# Clone to specific folder
git clone https://github.com/AmirrezaFarnamTaheri/Noteece.git ~/Documents/Noteece
cd ~/Documents/Noteece
```

### Development Mode

```bash
# Run in development mode
npm run dev

# Watch for changes
npm run watch
```

### Build for Production

```bash
# Mobile (Android APK)
cd apps/mobile
eas build --platform android

# Desktop (installer)
cd apps/desktop
npm run tauri build
```

---

## Uninstalling

### Mobile App

1. Long-press app icon
2. Select "Uninstall"

### Desktop App

**Windows**:

- Settings → Apps → Noteece → Uninstall

**Mac**:

- Drag app to Trash
- Empty Trash

**Linux**:

```bash
sudo apt remove noteece
```

### Remove All Data

```bash
# Mobile
rm -rf ~/.noteece

# Desktop
rm -rf ~/Library/Application\ Support/noteece  # Mac
rm -rf ~/.config/noteece  # Linux
del /F /S /Q %APPDATA%\noteece  # Windows
```

---

## What's Next?

### After Installation

1. Create your vault
2. Add a few tasks
3. Write a note
4. Explore features
5. Customize settings

### Learn More

- Check out the full user guide
- Watch tutorial videos (coming soon)
- Join our community

### Contribute

Love Noteece? Help make it better:

- Report bugs
- Suggest features
- Improve documentation
- Write code

---

## FAQ

**Q: Is it really free?**
A: Yes! Open source and free forever.

**Q: Can I use it offline?**
A: Absolutely! Works 100% offline.

**Q: Is my data safe?**
A: Very safe. Military-grade encryption, zero cloud storage.

**Q: Can I sync with cloud services?**
A: No, by design. That's what keeps it private.

**Q: Can I import from other apps?**
A: Yes, see the Export/Import guide.

**Q: Does it work on iPad?**
A: Yes! Same mobile app works on iPhone and iPad.

**Q: Can I customize the theme?**
A: Not yet, but it's on the roadmap!

---

## Need More Help?

Still stuck? Here's what to do:

1. **Check Documentation**
   - Read the detailed guides in the `docs` folder

2. **Search Issues**
   - Someone might have had the same problem

3. **Ask Community**
   - Post in GitHub Discussions

4. **Report Bug**
   - Create a detailed issue on GitHub

---

**Welcome to Noteece!** 🎉

We hope you enjoy having a private, secure life management system that respects your data and privacy.

---

**Version**: 1.0.0
**Last Updated**: 2025-11-06
**License**: Apache 2.0
