# Noteece Mobile App Deployment Guide

This guide covers building and deploying the Noteece mobile app to App Store (iOS) and Google Play Store (Android).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Building for Production](#building-for-production)
4. [App Store Deployment (iOS)](#app-store-deployment-ios)
5. [Google Play Deployment (Android)](#google-play-deployment-android)
6. [Over-the-Air Updates](#over-the-air-updates)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts

- ✅ **Expo Account**: https://expo.dev (free)
- ✅ **Apple Developer Account**: $99/year (for iOS)
- ✅ **Google Play Console Account**: $25 one-time (for Android)
- ✅ **Sentry Account** (optional): For error tracking

### Required Tools

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Verify installation
eas --version
```

### Repository Setup

```bash
# Clone repository
git clone https://github.com/your-org/noteece
cd noteece/apps/mobile

# Install dependencies
npm install --legacy-peer-deps
```

## Environment Setup

### 1. Configure Environment Variables

Create `.env` file:

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env
```

Add your Sentry DSN:

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
SENTRY_ORG=your-organization
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

### 2. Configure app.json

Update `app.json` with your information:

```json
{
  "expo": {
    "name": "Noteece",
    "slug": "noteece-mobile",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.noteece",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourcompany.noteece",
      "versionCode": 1
    },
    "extra": {
      "sentryDsn": "${SENTRY_DSN}",
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### 3. Initialize EAS Project

```bash
# Initialize EAS
eas init

# This creates eas.json and links to your Expo account
```

## Building for Production

### Build Profiles

We have three build profiles in `eas.json`:

1. **Development**: For testing on simulator/emulator
2. **Preview**: Internal testing on physical devices
3. **Production**: Final build for app stores

### Development Build

```bash
# Build for both platforms
npm run build:development

# Or specific platform
eas build --profile development --platform ios
eas build --profile development --platform android
```

**Use case**: Testing features that require native modules (biometrics, NFC, etc.)

### Preview Build

```bash
# Build preview for testing
npm run build:preview

# Install on device:
# iOS: Use EAS CLI to install or TestFlight
# Android: Download APK from EAS dashboard
```

**Use case**: Internal testing, beta testing

### Production Build

```bash
# Build for production
npm run build:production

# Or specific platform
npm run build:ios
npm run build:android
```

**Use case**: Final build for app stores

## App Store Deployment (iOS)

### Prerequisites

1. **Apple Developer Account**
2. **App Store Connect App** created
3. **Bundle Identifier** registered
4. **Certificates and Provisioning Profiles** (EAS handles this)

### Step 1: Configure iOS Settings

Update `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

### Step 2: Build for iOS

```bash
# Build production iOS app
npm run build:ios

# Wait for build to complete (15-30 minutes)
# EAS will handle code signing automatically
```

### Step 3: Submit to App Store

```bash
# Submit to App Store Connect
npm run submit:ios

# Or manually:
eas submit --platform ios
```

### Step 4: App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Fill in metadata:
   - App name
   - Description
   - Keywords
   - Screenshots (required sizes)
   - App category
   - Privacy policy URL
4. Select the build you just submitted
5. Submit for review

### App Store Assets Required

- **App Icon**: 1024x1024px PNG
- **Screenshots**:
  - iPhone 6.5" (1284x2778)
  - iPhone 5.5" (1242x2208)
  - iPad Pro 12.9" (2048x2732)
- **Privacy Policy**: URL to your privacy policy
- **App Description**: Max 4000 characters
- **Keywords**: Max 100 characters

## Google Play Deployment (Android)

### Prerequisites

1. **Google Play Console Account**
2. **App created** in Play Console
3. **Service Account** for automated submission

### Step 1: Create Service Account

1. Go to Google Cloud Console
2. Create service account
3. Download JSON key
4. Save as `google-play-service-account.json`
5. Grant access in Play Console

### Step 2: Build for Android

```bash
# Build production Android app
npm run build:android

# This creates an AAB (Android App Bundle)
```

### Step 3: Submit to Google Play

```bash
# Submit to Google Play Console
npm run submit:android

# Or manually:
eas submit --platform android
```

### Step 4: Google Play Console

1. Go to https://play.google.com/console
2. Select your app
3. Create a release:
   - Internal testing
   - Closed testing
   - Open testing
   - Production
4. Fill in metadata:
   - App name
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots
   - Feature graphic
   - App category
   - Content rating
   - Privacy policy URL
5. Upload your AAB (or EAS will do this)
6. Submit for review

### Google Play Assets Required

- **App Icon**: 512x512px PNG
- **Feature Graphic**: 1024x500px PNG
- **Screenshots**:
  - Phone (minimum 2, max 8)
  - 7" Tablet (minimum 1, optional)
  - 10" Tablet (minimum 1, optional)
- **Privacy Policy**: URL to your privacy policy
- **App Description**: Max 4000 characters
- **Short Description**: Max 80 characters

## Over-the-Air Updates

EAS supports OTA updates for JavaScript and asset changes (no native code changes).

### Configure Updates

In `app.json`:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id",
      "enabled": true,
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "ON_LOAD"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

### Publishing Updates

```bash
# Publish update
eas update --branch production --message "Fix bug XYZ"

# Publish to specific channel
eas update --channel production

# View updates
eas update:list
```

### Update Channels

- `development`: For dev builds
- `preview`: For preview/beta builds
- `production`: For production app store builds

## Versioning Strategy

### Semantic Versioning

We use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes (e.g., 1.0.0 → 1.0.1)

### Updating Version

Update in `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "2"
    },
    "android": {
      "versionCode": 2
    }
  }
}
```

**Important**:
- iOS `buildNumber`: Increment for every build
- Android `versionCode`: Must always increase
- `version`: User-facing version string

## CI/CD Automation

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Mobile App

on:
  push:
    branches:
      - main
    paths:
      - 'apps/mobile/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: |
          cd apps/mobile
          npm install --legacy-peer-deps

      - name: Run tests
        run: |
          cd apps/mobile
          npm test

      - name: Build preview
        run: |
          cd apps/mobile
          eas build --profile preview --platform all --non-interactive

      - name: Publish update
        run: |
          cd apps/mobile
          eas update --branch production --message "Deploy from CI"
```

### Required Secrets

Add to GitHub repository secrets:

- `EXPO_TOKEN`: Expo access token
- `SENTRY_AUTH_TOKEN`: Sentry upload token

## Release Checklist

Before releasing a new version:

### Code Quality
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Linting passing
- [ ] Code reviewed

### Testing
- [ ] Tested on iOS device
- [ ] Tested on Android device
- [ ] All features work
- [ ] No crashes
- [ ] Performance acceptable

### Configuration
- [ ] Version bumped in app.json
- [ ] Build numbers incremented
- [ ] Changelog updated
- [ ] Sentry configured
- [ ] Environment variables set

### Assets
- [ ] App icons updated
- [ ] Screenshots prepared
- [ ] Feature graphics ready
- [ ] Privacy policy updated

### Build & Deploy
- [ ] Production build successful
- [ ] Submitted to App Store
- [ ] Submitted to Google Play
- [ ] Release notes written

## Monitoring Post-Deploy

### Sentry Dashboard

Monitor errors in production:

```
https://sentry.io/organizations/your-org/projects/noteece-mobile
```

Check for:
- New errors
- Crash rate
- User feedback
- Performance issues

### App Store Analytics

- **App Store Connect**: iOS metrics
- **Google Play Console**: Android metrics

Monitor:
- Downloads
- Active users
- Ratings/reviews
- Crashes
- User retention

## Rollback Procedure

If you need to roll back a release:

### OTA Rollback

```bash
# Publish previous version
eas update rollback
```

### App Store Rollback

1. **iOS**: Submit previous version for review
2. **Android**: Promote previous version in Play Console

## Troubleshooting

### Build Failures

**Problem**: Build fails with dependency errors

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

**Problem**: iOS build fails with code signing

**Solution**:
```bash
eas credentials
# Regenerate certificates
```

---

**Problem**: Android build fails with Gradle errors

**Solution**: Check `android/build.gradle` versions match EAS requirements

### Submission Failures

**Problem**: App rejected for missing permissions

**Solution**: Ensure all NSUsageDescription keys in `app.json` are descriptive

---

**Problem**: App rejected for metadata issues

**Solution**: Review App Store Review Guidelines

## Support & Resources

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **EAS Submit Docs**: https://docs.expo.dev/submit/introduction/
- **Expo Forums**: https://forums.expo.dev
- **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Play Console Help**: https://support.google.com/googleplay/android-developer

---

## Quick Reference

### Common Commands

```bash
# Development
npm start                    # Start dev server
npm run android             # Run on Android
npm run ios                 # Run on iOS

# Testing
npm test                    # Run tests
npm run lint                # Lint code
npm run type-check          # Check TypeScript

# Building
npm run build:preview       # Preview build
npm run build:production    # Production build
npm run build:ios           # iOS only
npm run build:android       # Android only

# Deployment
npm run submit:ios          # Submit to App Store
npm run submit:android      # Submit to Play Store
eas update --branch production  # OTA update
```

---

**Ready to deploy! 🚀**
