# Sentry Error Tracking Setup

This guide explains how to configure Sentry for error tracking in the Noteece mobile app.

## What is Sentry?

Sentry is a real-time error tracking service that helps you monitor and fix crashes and exceptions in production. It provides:

- **Real-time error reporting** - Get notified immediately when errors occur
- **Stack traces** - See exactly where errors happened in your code
- **Release tracking** - Track errors across different app versions
- **Performance monitoring** - Monitor app performance and identify bottlenecks
- **User context** - Understand which users are affected by errors

## Installation

Sentry is already installed in the project:

```bash
# Package is already in package.json
@sentry/react-native
```

## Configuration

### Step 1: Create a Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for a free account
3. Create a new project for "React Native"
4. Copy your DSN (Data Source Name)

### Step 2: Configure DSN

You have two options to provide your Sentry DSN:

#### Option A: Environment Variable (Recommended for Development)

Create a `.env` file in the `apps/mobile` directory:

```bash
# apps/mobile/.env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### Option B: Expo Config (Recommended for Production)

Add to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "extra": {
      "sentryDsn": "https://your-sentry-dsn@sentry.io/project-id"
    }
  }
}
```

### Step 3: Verify Setup

Run the app and trigger a test error:

```javascript
// Add this to any screen to test Sentry
throw new Error('Test Sentry error tracking');
```

You should see the error appear in your Sentry dashboard within a few seconds.

## Features Implemented

### 1. Automatic Error Capture

All uncaught JavaScript errors are automatically sent to Sentry via the `ErrorBoundary` component.

**Location**: `src/components/ErrorBoundary.tsx`

```typescript
// Errors are automatically captured with React component context
Sentry.withScope((scope) => {
  scope.setContext('react_error_boundary', {
    componentStack: errorInfo.componentStack,
  });
  Sentry.captureException(error);
});
```

### 2. Performance Monitoring

Sentry automatically tracks:
- App startup time
- Screen navigation performance
- Network request performance

**Configuration**: `src/lib/sentry.ts`

```typescript
tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in production
```

### 3. Session Tracking

Sessions are automatically tracked to understand:
- How many users are using the app
- Session duration
- Crash-free session rate

### 4. Release Tracking

Errors are tagged with:
- **Release version**: From `app.json` version
- **Environment**: `development` or `production`
- **Dist**: Build number for iOS/Android

### 5. Manual Error Reporting

You can manually report errors with additional context:

```typescript
import { captureException, addBreadcrumb } from '@/lib/sentry';

// Capture an exception with context
try {
  dangerousFunction();
} catch (error) {
  captureException(error, {
    feature: 'sync',
    operation: 'manual_sync',
  });
}

// Add breadcrumbs for debugging
addBreadcrumb({
  category: 'sync',
  message: 'Starting manual sync',
  level: 'info',
});
```

### 6. User Context

Track which users are affected by errors:

```typescript
import { setUser, clearUser } from '@/lib/sentry';

// After user logs in
setUser({
  id: userId,
  email: userEmail,
});

// After user logs out
clearUser();
```

## Available Helper Functions

The `src/lib/sentry.ts` module exports several helper functions:

### `initSentry()`

Initialize Sentry (called automatically in `app/_layout.tsx`)

### `captureException(error, context?)`

Manually capture an exception with optional context

```typescript
captureException(new Error('Something went wrong'), {
  action: 'delete_task',
  taskId: '123',
});
```

### `captureMessage(message, level?)`

Send a message to Sentry (for logging important events)

```typescript
captureMessage('User completed onboarding', 'info');
```

### `setUser(user)`

Set user context for all future events

```typescript
setUser({
  id: 'user123',
  email: 'user@example.com',
  username: 'johndoe',
});
```

### `clearUser()`

Clear user context (call on logout)

### `addBreadcrumb(breadcrumb)`

Add a breadcrumb for debugging

```typescript
addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to tasks screen',
  level: 'info',
});
```

### `setTag(key, value)`

Add tags for filtering in Sentry

```typescript
setTag('feature', 'sync');
setTag('sync_type', 'manual');
```

### `setExtra(key, value)`

Add extra data to events

```typescript
setExtra('sync_duration_ms', 1234);
setExtra('num_items_synced', 42);
```

## Best Practices

### 1. Don't Send Sensitive Data

The configuration includes a `beforeBreadcrumb` hook that filters out console logs containing "password". Extend this to filter other sensitive data:

```typescript
beforeBreadcrumb(breadcrumb, hint) {
  // Filter sensitive data
  if (breadcrumb.category === 'console') {
    if (breadcrumb.message?.includes('password') ||
        breadcrumb.message?.includes('token') ||
        breadcrumb.message?.includes('secret')) {
      return null;
    }
  }
  return breadcrumb;
}
```

### 2. Use Breadcrumbs Effectively

Add breadcrumbs before operations that might fail:

```typescript
addBreadcrumb({
  category: 'database',
  message: `Querying tasks for space ${spaceId}`,
  level: 'info',
});

const tasks = await dbQuery('SELECT * FROM task WHERE space_id = ?', [spaceId]);
```

### 3. Set Meaningful Context

Add context to help debug issues:

```typescript
try {
  await syncWithServer();
} catch (error) {
  captureException(error, {
    sync_attempt: attemptNumber,
    last_sync_time: lastSyncTimestamp,
    device_online: isOnline,
  });
}
```

### 4. Adjust Sample Rates for Production

The default configuration captures:
- **100% of errors** (always want to know about crashes)
- **20% of performance traces** (to reduce quota usage)

Adjust in `src/lib/sentry.ts`:

```typescript
tracesSampleRate: 0.2, // Capture 20% of performance traces
sampleRate: 1.0,       // Capture 100% of errors
```

### 5. Test Before Production

Always test Sentry integration in development:

```bash
# Run the app
npm start

# Trigger a test error
# Add this to any screen:
throw new Error('Test Sentry error');
```

## Troubleshooting

### Sentry Not Initializing

**Symptom**: Console shows "Sentry DSN not configured"

**Solution**: Make sure you've set the `SENTRY_DSN` environment variable or added it to `app.json`

### Errors Not Appearing in Sentry

**Checklist**:
1. ✅ DSN is correct
2. ✅ App is connected to internet
3. ✅ Error occurred after Sentry initialization
4. ✅ Not filtered by `beforeSend` hook
5. ✅ Check Sentry project settings

### Too Many Events

**Symptom**: Hitting Sentry quota limits

**Solution**: Reduce sample rates or add more filtering:

```typescript
beforeSend(event, hint) {
  // Filter out certain types of errors
  if (event.exception?.values?.[0]?.type === 'NetworkError') {
    return null;
  }
  return event;
}
```

## Source Maps (Production)

For production builds, you'll want to upload source maps so Sentry can show readable stack traces:

### For EAS Build

Add to `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "SENTRY_ORG": "your-org",
        "SENTRY_PROJECT": "your-project"
      }
    }
  }
}
```

Then install Sentry CLI:

```bash
npm install -g @sentry/cli

# Login to Sentry
sentry-cli login

# Upload source maps after build
sentry-cli releases files <release-version> upload-sourcemaps ./dist
```

## Cost Considerations

Sentry offers:
- **Free tier**: 5,000 errors/month, 10,000 performance units/month
- **Paid tiers**: Start at $26/month for more capacity

For most apps, the free tier is sufficient during development and early production.

## Alternative: Self-Hosted Sentry

You can also self-host Sentry for free:

1. Follow [Sentry Self-Hosted Guide](https://develop.sentry.dev/self-hosted/)
2. Update DSN to your self-hosted instance
3. All features work the same

## Next Steps

1. ✅ Sentry is installed and configured
2. ⬜ Add your DSN to environment variables
3. ⬜ Test error tracking in development
4. ⬜ Set up source maps for production builds
5. ⬜ Configure alerts in Sentry dashboard
6. ⬜ Integrate with Slack/Email for notifications

## Additional Resources

- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [Expo Sentry Integration](https://docs.expo.dev/guides/using-sentry/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)

---

**Questions?** Check the [Sentry docs](https://docs.sentry.io) or create an issue in the repository.
