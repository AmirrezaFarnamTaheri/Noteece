# Noteece Mobile App Testing Guide

This comprehensive testing guide ensures all features work correctly before production deployment.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Onboarding Flow Tests](#onboarding-flow-tests)
3. [Unlock Flow Tests](#unlock-flow-tests)
4. [Core Feature Tests](#core-feature-tests)
5. [Error Handling Tests](#error-handling-tests)
6. [Performance Tests](#performance-tests)
7. [Security Tests](#security-tests)
8. [Platform-Specific Tests](#platform-specific-tests)
9. [Automated Testing](#automated-testing)

---

## Environment Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- iOS Simulator (macOS) or Android Emulator
- Physical iOS/Android device (highly recommended)

### Installation

```bash
cd apps/mobile
npm install
```

### Running the App

**Development Build:**

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Physical Device (scan QR code)
npx expo start
```

**Production-like Build:**

```bash
# iOS
eas build --platform ios --profile preview
eas build:run --platform ios --latest

# Android
eas build --platform android --profile preview
adb install path/to/app.apk
```

---

## Onboarding Flow Tests

### Test Case 1: First-Time User Experience

**Objective**: Verify complete onboarding flow for new users

**Steps**:

1. ✅ **Fresh Install**: Delete app if installed, then reinstall
2. ✅ **Launch App**: Open from home screen
3. ✅ **Verify Loading**: Check splash screen displays correctly
4. ✅ **Onboarding Start**: Confirm onboarding screen appears (not unlock/today)

**Expected**: App detects no vault exists and shows onboarding

---

### Test Case 2: Onboarding Step Navigation

**Objective**: Test navigation through all onboarding steps

**Steps**:

**Step 1 - Personal Intelligence Vault**:

1. ✅ Verify shield icon displays
2. ✅ Read title: "Your Personal Intelligence Vault"
3. ✅ Verify 3 feature bullets with checkmarks:
   - End-to-end encryption
   - Local-first, offline-capable
   - Zero-knowledge architecture
4. ✅ Progress dots: 1st dot is active (blue), others are gray
5. ✅ Tap "Next" button

**Step 2 - Foresight 3.0 Intelligence**:

1. ✅ Verify lightning icon displays
2. ✅ Read title: "Foresight 3.0 Intelligence"
3. ✅ Verify 3 feature bullets:
   - Daily briefs and predictions
   - Burnout risk analysis
   - Smart recommendations
4. ✅ Progress dots: 2nd dot is active
5. ✅ Test "Back" button (returns to step 1)
6. ✅ Tap "Next" to proceed

**Step 3 - Seamless Local Sync**:

1. ✅ Verify network icon displays
2. ✅ Read title: "Seamless Local Sync"
3. ✅ Verify 3 feature bullets:
   - Peer-to-peer encryption
   - Automatic conflict resolution
   - Background sync
4. ✅ Progress dots: 3rd dot is active
5. ✅ Tap "Next"

**Step 4 - Physical-Digital Bridge**:

1. ✅ Verify rocket icon displays
2. ✅ Read title: "Physical-Digital Bridge"
3. ✅ Verify 3 feature bullets:
   - NFC trigger actions
   - Location-based reminders
   - Quick capture shortcuts
4. ✅ Progress dots: 4th dot is active
5. ✅ Verify "Next" button now says "Get Started"
6. ✅ Tap "Get Started"

**Step 5 - Password Creation**:

1. ✅ Verify key icon displays
2. ✅ Read title: "Create Your Vault"
3. ✅ Verify description about strong password
4. ✅ Verify two password input fields
5. ✅ Progress dots: 5th dot is active

**Expected**: Smooth navigation, correct content, progress indicators work

---

### Test Case 3: Password Validation

**Objective**: Test password creation validation rules

**Tests**:

1. **Empty Password**:
   - Leave both fields empty
   - Tap "Create Vault"
   - ✅ Alert: "Password Too Short"

2. **Short Password** (< 8 characters):
   - Enter: "abc123"
   - Confirm: "abc123"
   - Tap "Create Vault"
   - ✅ Alert: "Password must be at least 8 characters long"

3. **Mismatched Passwords**:
   - Password: "password123"
   - Confirm: "password456"
   - Tap "Create Vault"
   - ✅ Alert: "Passwords Don't Match"

4. **Valid Password**:
   - Password: "MySecurePass123"
   - Confirm: "MySecurePass123"
   - Tap "Create Vault"
   - ✅ Button shows "Creating..."
   - ✅ Navigation to Today screen
   - ✅ Vault is created and unlocked

**Expected**: Proper validation with clear error messages

---

### Test Case 4: Password Visibility Toggle

**Objective**: Test show/hide password functionality

**Steps**:

1. ✅ Enter password: "TestPassword123"
2. ✅ Verify password is hidden (dots/asterisks)
3. ✅ Tap eye icon
4. ✅ Verify password is now visible: "TestPassword123"
5. ✅ Tap eye icon again
6. ✅ Verify password is hidden again

**Expected**: Toggle works for both password fields

---

### Test Case 5: Security Warning Notice

**Objective**: Verify user sees password recovery warning

**Steps**:

1. ✅ On password creation screen
2. ✅ Locate security notice with warning icon
3. ✅ Read: "This password cannot be recovered. Store it safely."
4. ✅ Verify warning is visually distinct (yellow/orange background)

**Expected**: Clear warning about irrecoverable passwords

---

## Unlock Flow Tests

### Test Case 6: App Lock on Background

**Objective**: Verify app locks when backgrounded

**Steps**:

1. ✅ Complete onboarding and create vault
2. ✅ Navigate to Today screen
3. ✅ Put app in background (home button/swipe up)
4. ✅ Wait 1 minute
5. ✅ Reopen app
6. ✅ Verify unlock screen appears

**Expected**: App locks after backgrounding for security

---

### Test Case 7: Unlock with Correct Password

**Objective**: Test successful unlock

**Steps**:

1. ✅ On unlock screen
2. ✅ Enter correct password: "MySecurePass123"
3. ✅ Tap "Unlock Vault" button
4. ✅ Verify button shows "Unlocking..."
5. ✅ Verify navigation to Today screen
6. ✅ Verify data loads correctly

**Expected**: Smooth unlock experience, ~500ms delay

---

### Test Case 8: Unlock with Incorrect Password

**Objective**: Test failed unlock attempt

**Steps**:

1. ✅ On unlock screen
2. ✅ Enter wrong password: "WrongPassword"
3. ✅ Tap "Unlock Vault"
4. ✅ Verify shake animation on input field
5. ✅ Verify alert: "Incorrect Password"
6. ✅ Verify password field is cleared
7. ✅ Try correct password
8. ✅ Verify unlock succeeds

**Expected**: Clear feedback on failure, shake animation, no retry limit

---

### Test Case 9: Unlock Screen UI Elements

**Objective**: Verify all unlock screen elements

**Visual Checks**:

1. ✅ Gradient background (dark blue/purple)
2. ✅ Animated lock icon in gradient circle
3. ✅ "Noteece" title in large font
4. ✅ "Enter your password to unlock" subtitle
5. ✅ Password input field with key icon
6. ✅ Show/hide password toggle (eye icon)
7. ✅ "Unlock Vault" button with gradient
8. ✅ "or" divider
9. ✅ "Use Biometrics" button with fingerprint icon
10. ✅ "Forgot password?" link
11. ✅ Security badge: "End-to-end encrypted • Zero-knowledge"

**Expected**: Professional, polished UI

---

### Test Case 10: Biometric Unlock (Placeholder)

**Objective**: Test biometric button behavior

**Steps**:

1. ✅ Tap "Use Biometrics" button
2. ✅ Verify alert: "Biometric Unlock" / "...will be available in a future update"
3. ✅ Dismiss alert

**Expected**: User informed feature is coming soon

---

### Test Case 11: Forgot Password Flow

**Objective**: Test forgot password warning

**Steps**:

1. ✅ Tap "Forgot password?" link
2. ✅ Read alert message about password recovery
3. ✅ Verify warns about data loss
4. ✅ Verify mentions backup importance
5. ✅ Dismiss alert

**Expected**: Clear explanation that password is unrecoverable

---

## Core Feature Tests

### Test Case 12: Today Screen

**Objective**: Test main timeline view

**Steps**:

1. ✅ Navigate to Today tab
2. ✅ Verify daily brief card displays (if any)
3. ✅ Verify timeline items show:
   - Calendar events
   - Tasks due today
   - Time blocks
4. ✅ Test pull-to-refresh
5. ✅ Verify empty state if no items

**Expected**: Clean timeline, proper sorting by time

---

### Test Case 13: Tasks Screen

**Objective**: Test task management

**Steps**:

1. ✅ Navigate to Tasks tab
2. ✅ Test filters: All, Today, Upcoming, Completed
3. ✅ Tap "+" button
4. ✅ Enter task title: "Test Task"
5. ✅ Tap checkmark to save
6. ✅ Verify task appears in list
7. ✅ Tap task to complete
8. ✅ Verify checkbox fills
9. ✅ Switch to "Completed" filter
10. ✅ Verify task shows in completed list

**Expected**: Full task CRUD operations work

---

### Test Case 14: Capture Screen

**Objective**: Test quick capture functionality

**Steps**:

1. ✅ Navigate to Capture tab (center button)
2. ✅ Verify type selector shows: Note, Task, Voice, Photo
3. ✅ Select "Note"
4. ✅ Enter title: "Test Note"
5. ✅ Enter content: "This is a test note"
6. ✅ Tap "Save"
7. ✅ Verify navigation back to previous screen
8. ✅ Verify success alert
9. ✅ Repeat for "Task" type

**Expected**: Quick capture saves correctly

---

### Test Case 15: Insights Screen

**Objective**: Test insights display

**Steps**:

1. ✅ Navigate to Insights tab
2. ✅ Verify filter buttons: All, High, Medium, Low
3. ✅ If insights exist:
   - Verify severity-based color coding
   - Verify suggested actions display
   - Test dismiss button
4. ✅ If no insights:
   - Verify empty state with bulb icon
   - Verify helpful message

**Expected**: Insights display correctly when available

---

### Test Case 16: More/Settings Screen

**Objective**: Test settings and actions

**Steps**:

1. ✅ Navigate to More tab
2. ✅ Verify user card displays
3. ✅ Test sections expand:
   - Sync & Backup
   - Features
   - Data & Privacy
   - About
4. ✅ Test "Manual Sync" button
5. ✅ Toggle "Background Sync"
6. ✅ Toggle "NFC Triggers"
7. ✅ Test "Lock Vault" button
8. ✅ Confirm lock dialog
9. ✅ Verify app locks

**Expected**: All settings accessible and functional

---

## Error Handling Tests

### Test Case 17: Error Boundary

**Objective**: Test error boundary catches crashes

**Steps** (requires dev mode):

1. ✅ Modify code to throw intentional error
2. ✅ Trigger error in component
3. ✅ Verify error boundary catches error
4. ✅ Verify error screen displays:
   - Warning icon
   - "Something went wrong" message
   - "Try Again" button
5. ✅ Tap "Try Again"
6. ✅ Verify app recovers
7. ✅ In dev mode: Verify error details show

**Expected**: Graceful error handling, no white screen

---

### Test Case 18: Network Errors (Sync)

**Objective**: Test sync failure handling

**Steps**:

1. ✅ Enable airplane mode
2. ✅ Navigate to More > Sync & Backup
3. ✅ Tap "Manual Sync"
4. ✅ Verify error message: "No devices found" or network error
5. ✅ Disable airplane mode
6. ✅ Retry sync
7. ✅ Verify works when network available

**Expected**: Clear error messages, retry succeeds

---

### Test Case 19: Database Errors

**Objective**: Test database error handling

**Steps** (requires dev tools):

1. ✅ Corrupt database file (in dev)
2. ✅ Launch app
3. ✅ Verify app detects corruption
4. ✅ Verify error message or recovery prompt

**Expected**: App doesn't crash on database errors

---

## Performance Tests

### Test Case 20: Cold Start Performance

**Objective**: Measure app launch time

**Steps**:

1. ✅ Kill app completely
2. ✅ Launch from home screen
3. ✅ Time from tap to Today screen
4. ✅ Target: < 3 seconds

**Expected**: Fast cold start

---

### Test Case 21: Navigation Performance

**Objective**: Test smooth transitions

**Steps**:

1. ✅ Rapidly switch between tabs
2. ✅ Verify no lag or stutter
3. ✅ Open/close capture screen repeatedly
4. ✅ Verify smooth animations

**Expected**: 60fps transitions

---

### Test Case 22: Large Dataset Performance

**Objective**: Test with many items

**Steps**:

1. ✅ Create 100+ tasks
2. ✅ Create 100+ notes
3. ✅ Navigate to Tasks screen
4. ✅ Verify scroll is smooth
5. ✅ Test filters still work fast
6. ✅ Search is responsive

**Expected**: No performance degradation

---

## Security Tests

### Test Case 23: Data Encryption

**Objective**: Verify data is encrypted at rest

**Steps** (requires file system access):

1. ✅ Create vault with password
2. ✅ Add sensitive data
3. ✅ Close app
4. ✅ Access app's file system
5. ✅ Locate database file
6. ✅ Verify file is encrypted (not readable)

**Expected**: All data encrypted in storage

---

### Test Case 24: Password Storage

**Objective**: Verify password is never stored plainly

**Steps** (requires dev tools):

1. ✅ Search entire codebase for password storage
2. ✅ Verify only key derivation used
3. ✅ Check AsyncStorage
4. ✅ Verify no plain password stored

**Expected**: Password never stored, only derived keys

---

### Test Case 25: Auto-Lock Timing

**Objective**: Test automatic locking

**Steps**:

1. ✅ Unlock vault
2. ✅ Put app in background
3. ✅ Wait 1 minute
4. ✅ Return to app
5. ✅ Verify lock screen appears
6. ✅ Repeat with different timings

**Expected**: Consistent auto-lock after timeout

---

## Platform-Specific Tests

### iOS Tests

**Test Case 26: iOS Specific**

1. ✅ **Face ID/Touch ID**: Test biometric prompt (when implemented)
2. ✅ **Safe Area**: Verify UI respects notches on iPhone X+
3. ✅ **Dark Mode**: Test in iOS dark mode (should already be dark)
4. ✅ **iPad**: Test on iPad simulator (if supporting tablets)
5. ✅ **Permissions**: Camera, NFC, Location prompts show correctly
6. ✅ **Background Modes**: Verify fetch works in background

---

### Android Tests

**Test Case 27: Android Specific**

1. ✅ **Fingerprint**: Test biometric prompt (when implemented)
2. ✅ **Navigation**: Test with physical back button
3. ✅ **Permissions**: Runtime permission requests work
4. ✅ **Adaptive Icon**: Verify icon looks good on different launchers
5. ✅ **Battery Optimization**: Test background sync with Doze mode
6. ✅ **Various Devices**: Test on different Android versions (8+)

---

## Automated Testing

### Unit Tests

```bash
# From the repo root (recommended in monorepo)
pnpm test:coverage

# Or from apps/mobile using npm (legacy)
npm test
npm test -- --coverage
```

**Test Files to Run**:

- `src/__tests__/sync-client.test.ts`
- `src/__tests__/database.test.ts`
- `src/__tests__/components/DailyBrief.test.tsx`
- `src/__tests__/components/TimelineItemCard.test.tsx`

**Coverage Target**: > 70%

---

### E2E Tests (Future)

**Using Detox or Maestro**:

```bash
# Install Detox
npm install -g detox-cli

# Run E2E tests
detox test --configuration ios.sim.debug
```

**E2E Test Scenarios**:

1. Complete onboarding flow
2. Create and complete a task
3. Lock and unlock vault
4. Add note and verify persistence

---

## Test Results Template

Use this template to document test results:

```markdown
## Test Session: [Date]

**Tester**: [Name]
**Platform**: iOS 16.0 / Android 13
**Device**: iPhone 14 Pro / Pixel 7
**App Version**: 1.1.0 (Build 1)

### Results

| Test Case                | Status  | Notes                      |
| ------------------------ | ------- | -------------------------- |
| TC1: First-Time User     | ✅ PASS |                            |
| TC2: Onboarding Steps    | ✅ PASS |                            |
| TC3: Password Validation | ✅ PASS |                            |
| TC4: Password Toggle     | ✅ PASS |                            |
| TC5: Security Warning    | ✅ PASS |                            |
| TC6: App Lock            | ✅ PASS |                            |
| TC7: Correct Password    | ✅ PASS |                            |
| TC8: Wrong Password      | ⚠️ FAIL | Shake animation not smooth |
| ...                      |         |                            |

### Issues Found

1. **Shake Animation Stutters** (TC8)
   - Severity: Low
   - Description: Animation drops frames on older devices
   - Steps to Reproduce: Enter wrong password on iPhone 8
   - Fix: Reduce animation complexity

2. **[Add more issues]**

### Performance Metrics

- Cold Start: 2.1s ✅
- Hot Start: 0.8s ✅
- Navigation: 60fps ✅
- Memory Usage: 85MB ✅

### Recommendations

- Add haptic feedback on password error
- Improve animation performance on older devices
- Consider adding password strength indicator
```

---

## Checklist for Production Release

Use this checklist before submitting to app stores:

### Pre-Release Checklist

**Functionality**:

- [ ] All onboarding steps work
- [ ] Password creation and validation work
- [ ] Unlock flow works reliably
- [ ] All 5 tab screens are functional
- [ ] Data persists correctly
- [ ] Sync works (if enabled)

**UI/UX**:

- [ ] No visual glitches
- [ ] Animations are smooth
- [ ] Text is readable on all screen sizes
- [ ] Icons and images load correctly
- [ ] Empty states display properly
- [ ] Error messages are clear

**Security**:

- [ ] Data is encrypted at rest
- [ ] Password is not stored plainly
- [ ] Auto-lock works
- [ ] No sensitive data in logs
- [ ] Permissions are properly requested

**Performance**:

- [ ] Cold start < 3s
- [ ] Hot start < 1s
- [ ] No memory leaks
- [ ] Smooth 60fps animations
- [ ] Works with large datasets (1000+ items)

**Testing**:

- [ ] All test cases pass
- [ ] Tested on multiple devices
- [ ] Tested on iOS and Android
- [ ] No crashes in 1-hour session
- [ ] Unit tests pass with > 70% coverage

**Legal/Compliance**:

- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] GPL v3 license included
- [ ] All permissions explained

**App Store Requirements**:

- [ ] Screenshots captured (5 per platform)
- [ ] App icon generated (1024x1024)
- [ ] Splash screen looks good
- [ ] Metadata prepared (see APP_STORE.md)
- [ ] Age rating appropriate (4+)

---

## Continuous Testing

### Daily Development

```bash
# Quick smoke test
npm test -- --testNamePattern="smoke"

# Watch mode while coding
npm test -- --watch

# Before commit
npm test && npm run lint
```

### Before Each Release

1. Run full test suite
2. Manual test all critical paths
3. Test on physical devices
4. Check performance metrics
5. Review crash logs (if any)
6. Verify all new features

---

## Reporting Issues

When you find a bug, report it with:

1. **Title**: Short, descriptive
2. **Description**: What happened vs. what should happen
3. **Steps to Reproduce**: Detailed steps
4. **Expected Result**: What should have happened
5. **Actual Result**: What actually happened
6. **Screenshots/Video**: If applicable
7. **Environment**:
   - App version
   - Device model
   - OS version
   - Any error messages

**Example**:

```markdown
**Title**: Shake animation stutters on iPhone 8

**Description**: When entering an incorrect password on the unlock screen, the shake animation drops frames and looks choppy.

**Steps**:

1. Lock the vault
2. Open app to unlock screen
3. Enter wrong password: "wrong123"
4. Tap "Unlock Vault"
5. Observe shake animation

**Expected**: Smooth 60fps shake animation
**Actual**: Animation stutters, appears to be ~30fps

**Environment**:

- App: 1.0.0 (1)
- Device: iPhone 8
- iOS: 15.7
```

---

## Test Automation Roadmap

**Phase 1** (Current):

- ✅ Manual testing with checklist
- ✅ Unit tests for critical components

**Phase 2** (Next):

- [ ] Integration tests for database operations
- [ ] Component tests for all screens
- [ ] Mock data generators

**Phase 3** (Future):

- [ ] E2E tests with Detox/Maestro
- [ ] Visual regression tests
- [ ] Performance benchmarks
- [ ] CI/CD integration

---

## Resources

- **Expo Testing**: https://docs.expo.dev/develop/unit-testing/
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **React Native Testing Library**: https://callstack.github.io/react-native-testing-library/
- **Detox**: https://wix.github.io/Detox/
- **Maestro**: https://maestro.mobile.dev/

---

**Happy Testing! 🧪**

Remember: A bug found in testing is a bug not found by users.
