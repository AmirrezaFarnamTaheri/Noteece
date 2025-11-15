# UI Component Library

Comprehensive documentation for Noteece's reusable UI components, animations, and error handling.

## Table of Contents

- [Animation Components](#animation-components)
- [Skeleton Components](#skeleton-components)
- [Error Components](#error-components)
- [Haptic Feedback](#haptic-feedback)
- [Best Practices](#best-practices)

---

## Animation Components

All animation components use React Native's Animated API with `useNativeDriver: true` for optimal performance.

### FadeIn

Smooth fade-in animation for any child component.

**Props:**

```typescript
interface FadeInProps {
  children: React.ReactNode;
  duration?: number; // Animation duration in ms (default: 300)
  delay?: number; // Delay before animation starts (default: 0)
  style?: ViewStyle; // Additional styles
}
```

**Example:**

```tsx
import { FadeIn } from "@/components/animations";

<FadeIn duration={500} delay={200}>
  <Text>This text fades in smoothly</Text>
</FadeIn>;
```

**Use Cases:**

- Content reveals
- Modal/dialog appearances
- Screen transitions
- Loading complete states

---

### SlideIn

Directional slide-in animation from various edges.

**Props:**

```typescript
interface SlideInProps {
  children: React.ReactNode;
  direction?: "left" | "right" | "top" | "bottom"; // Default: 'bottom'
  duration?: number; // Animation duration in ms (default: 300)
  delay?: number; // Delay before animation (default: 0)
  distance?: number; // Distance to slide in px (default: 50)
  style?: ViewStyle;
}
```

**Example:**

```tsx
import { SlideIn } from "@/components/animations";

<SlideIn direction="right" distance={100}>
  <View style={styles.card}>
    <Text>Slides in from the right</Text>
  </View>
</SlideIn>;
```

**Use Cases:**

- List item animations
- Card reveals
- Notification banners
- Bottom sheets

---

### ScaleIn

Scale animation with optional bounce effect.

**Props:**

```typescript
interface ScaleInProps {
  children: React.ReactNode;
  duration?: number; // Animation duration in ms (default: 300)
  delay?: number; // Delay before animation (default: 0)
  initialScale?: number; // Starting scale (default: 0.8)
  bounce?: boolean; // Enable bounce effect (default: false)
  style?: ViewStyle;
}
```

**Example:**

```tsx
import { ScaleIn } from "@/components/animations";

<ScaleIn bounce initialScale={0.5}>
  <TouchableOpacity style={styles.button}>
    <Text>Button with bounce</Text>
  </TouchableOpacity>
</ScaleIn>;
```

**Use Cases:**

- Button feedback
- Icon animations
- Achievement popups
- Important notifications

---

### Pulse

Continuous pulsing animation for attention-grabbing elements.

**Props:**

```typescript
interface PulseProps {
  children: React.ReactNode;
  duration?: number; // Full cycle duration in ms (default: 1000)
  minScale?: number; // Minimum scale (default: 0.95)
  maxScale?: number; // Maximum scale (default: 1.05)
  repeat?: boolean; // Enable looping (default: true)
  style?: ViewStyle;
}
```

**Example:**

```tsx
import { Pulse } from "@/components/animations";

<Pulse duration={1500} minScale={0.9} maxScale={1.1}>
  <View style={styles.badge}>
    <Text>5</Text>
  </View>
</Pulse>;
```

**Use Cases:**

- Notification badges
- Live indicators
- Recording status
- Attention points

---

## Skeleton Components

Skeleton components provide animated loading placeholders with shimmer effects.

### SkeletonBox

Base skeleton component for custom loading shapes.

**Props:**

```typescript
interface SkeletonBoxProps {
  width?: number | string; // Width (default: '100%')
  height?: number | string; // Height (default: 20)
  borderRadius?: number; // Border radius (default: 4)
  style?: ViewStyle;
}
```

**Example:**

```tsx
import { SkeletonBox } from "@/components/skeletons";

<SkeletonBox width={200} height={40} borderRadius={8} />;
```

---

### SkeletonCard

Skeleton placeholder for card-based layouts.

**Props:**

```typescript
interface SkeletonCardProps {
  showImage?: boolean; // Show image placeholder (default: true)
  lines?: number; // Number of text lines (default: 3)
}
```

**Example:**

```tsx
import { SkeletonCard } from "@/components/skeletons";

<SkeletonCard showImage lines={2} />;
```

**Use Cases:**

- Blog post cards
- Product cards
- News articles
- Social media posts

---

### SkeletonList

Skeleton placeholder for list items.

**Props:**

```typescript
interface SkeletonListProps {
  count?: number; // Number of items (default: 5)
  showAvatar?: boolean; // Show avatar placeholder (default: true)
  lines?: number; // Text lines per item (default: 2)
}
```

**Example:**

```tsx
import { SkeletonList } from "@/components/skeletons";

<SkeletonList count={10} showAvatar lines={3} />;
```

**Use Cases:**

- User lists
- Comment sections
- Chat messages
- Search results

---

## Error Components

Comprehensive error handling and recovery components.

### ErrorBoundary

Full-screen error boundary for catching React errors.

**Props:**

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode; // Custom fallback UI
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void; // Error callback
}
```

**Example:**

```tsx
import { ErrorBoundary } from "@/components/errors";

<ErrorBoundary
  onError={(error, info) => {
    logToSentry(error, info);
  }}
>
  <YourApp />
</ErrorBoundary>;
```

**Features:**

- Automatic error catching
- Retry functionality
- Dev-only error details
- Custom fallback support
- Error logging callback

**Root Layout Integration:**

```tsx
// app/_layout.tsx
import { ErrorBoundary } from "@/components/errors";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Stack>{/* Your app */}</Stack>
    </ErrorBoundary>
  );
}
```

---

### ErrorFallback

Lightweight inline error display for component-level errors.

**Props:**

```typescript
interface ErrorFallbackProps {
  error?: Error; // Error object
  onRetry?: () => void; // Retry callback
  message?: string; // Custom error message
  compact?: boolean; // Compact mode (default: false)
}
```

**Example:**

```tsx
import { ErrorFallback } from "@/components/errors";

{
  error ? (
    <ErrorFallback
      error={error}
      message="Failed to load posts"
      onRetry={refetch}
      compact
    />
  ) : (
    <PostList posts={posts} />
  );
}
```

**Use Cases:**

- API fetch errors
- Component load failures
- Network errors
- Data parsing errors

---

## Haptic Feedback

Comprehensive haptic feedback system integrated with user settings.

### Haptic Manager

Central manager for all haptic feedback.

**Available Methods:**

```typescript
import { haptics } from "@/lib/haptics";

// Light - Subtle interactions
await haptics.light();

// Medium - Standard interactions
await haptics.medium();

// Heavy - Important actions
await haptics.heavy();

// Success - Successful operations
await haptics.success();

// Warning - Caution required
await haptics.warning();

// Error - Failed operations
await haptics.error();

// Selection - Switching items
await haptics.selection();

// Rigid - Reaching boundaries
await haptics.rigid();

// Soft - Gentle confirmations
await haptics.soft();
```

### Usage Guidelines

**Light Haptics:**

- Hover states
- Small UI changes
- Minor confirmations
- Theme changes

**Medium Haptics:**

- Button presses
- Toggle switches
- List selections
- Tab navigation

**Heavy Haptics:**

- Lock vault
- Delete actions
- Major confirmations
- Important saves

**Success/Warning/Error:**

- API responses
- Validation results
- Operation outcomes
- System notifications

**Example Implementation:**

```tsx
import { haptics } from "@/lib/haptics";

const handleSave = async () => {
  try {
    haptics.medium(); // Immediate feedback
    await saveData();
    haptics.success(); // Success confirmation
  } catch (error) {
    haptics.error(); // Error feedback
    showError(error);
  }
};
```

### Settings Integration

Haptics respect user preferences automatically:

```tsx
// Settings toggle (automatically handled)
const handleToggleHaptics = async (value: boolean) => {
  await updateSetting("haptics", value);
  // Haptic manager updates automatically
};
```

---

## Best Practices

### Animation Best Practices

1. **Use Native Driver:** Always use `useNativeDriver: true` for better performance
2. **Stagger Animations:** Use delays for list items to create staggered effects
3. **Keep Duration Short:** 200-400ms is ideal for most animations
4. **Avoid Over-Animation:** Don't animate everything - be selective

**Example - Staggered List:**

```tsx
{
  items.map((item, index) => (
    <SlideIn key={item.id} delay={index * 50} direction="bottom">
      <ListItem item={item} />
    </SlideIn>
  ));
}
```

### Skeleton Best Practices

1. **Match Layout:** Skeleton should match actual content layout
2. **Show Early:** Display skeletons immediately on load
3. **Consistent Duration:** Keep loading times predictable
4. **Shimmer Effect:** Built-in shimmer provides better UX than static

**Example - Conditional Rendering:**

```tsx
{
  loading ? (
    <SkeletonList count={10} />
  ) : (
    <FlatList
      data={items}
      renderItem={({ item, index }) => (
        <FadeIn delay={index * 30}>
          <ListItem item={item} />
        </FadeIn>
      )}
    />
  );
}
```

### Error Handling Best Practices

1. **Use Error Boundaries:** Wrap all major sections
2. **Provide Recovery:** Always offer retry or alternative actions
3. **Log Errors:** Send errors to monitoring service
4. **User-Friendly Messages:** Avoid technical jargon in production

**Example - Component-Level Boundary:**

```tsx
<ErrorBoundary
  onError={(error, info) => {
    logError({ error, info, component: "SocialHub" });
  }}
>
  <SocialHub />
</ErrorBoundary>
```

### Haptic Feedback Best Practices

1. **Match Intensity:** Use appropriate haptic strength for action importance
2. **Immediate Feedback:** Trigger haptics at the start of async operations
3. **Confirm Outcomes:** Use success/error haptics for operation results
4. **Respect Settings:** Always check user preferences (handled automatically)

**Example - Multi-Step Action:**

```tsx
const handleDelete = async () => {
  haptics.warning(); // Alert user
  const confirmed = await showAlert();

  if (!confirmed) return;

  haptics.heavy(); // Confirm action
  try {
    await deleteItem();
    haptics.success(); // Success feedback
  } catch (error) {
    haptics.error(); // Error feedback
  }
};
```

---

## Component Composition

Combine components for rich interactions:

```tsx
import { FadeIn, SlideIn, SkeletonCard, ErrorFallback } from "@/components";

function PostCard({ postId }) {
  const { data, loading, error, refetch } = usePost(postId);

  if (loading) {
    return (
      <FadeIn>
        <SkeletonCard lines={3} />
      </FadeIn>
    );
  }

  if (error) {
    return (
      <SlideIn direction="top">
        <ErrorFallback
          error={error}
          message="Failed to load post"
          onRetry={refetch}
          compact
        />
      </SlideIn>
    );
  }

  return (
    <ScaleIn bounce>
      <View style={styles.card}>
        <Text>{data.title}</Text>
        <Text>{data.content}</Text>
      </View>
    </ScaleIn>
  );
}
```

---

## Performance Considerations

### Animation Performance

- All animations use `useNativeDriver: true`
- Animations run on UI thread, not JS thread
- 60 FPS on most devices
- Minimal battery impact

### Memory Management

- Components clean up on unmount
- Animations stop automatically
- No memory leaks in loops
- Efficient re-renders

### Bundle Size

- Tree-shakeable exports
- No external dependencies beyond React Native
- Small footprint: ~5KB total
- TypeScript definitions included

---

## Accessibility

All components follow React Native accessibility best practices:

- **Screen Reader Support:** Proper accessibility labels
- **Reduced Motion:** Respect system settings (future enhancement)
- **High Contrast:** Work with all color themes
- **Haptics:** Provide alternative feedback for audio/visual cues

---

## Future Enhancements

Planned improvements:

1. **Reduced Motion Support:** Detect system preference and reduce animations
2. **Custom Themes:** Theme-aware animation colors
3. **Advanced Gestures:** Pan, pinch, rotate animations
4. **Reanimated 2:** Migration for even better performance
5. **Web Support:** Cross-platform animation library

---

## Troubleshooting

### Animations Not Working

**Problem:** Animations don't play
**Solution:** Ensure `useNativeDriver: true` props are animatable (transform, opacity)

### Haptics Not Working

**Problem:** No haptic feedback
**Solution:** Check device support and user settings

### Error Boundary Not Catching

**Problem:** ErrorBoundary doesn't catch errors
**Solution:** ErrorBoundary only catches render errors, not async/event handler errors

### Skeleton Shimmer Not Visible

**Problem:** Shimmer effect not animating
**Solution:** Check that parent component isn't blocking animations

---

## Support

For issues or questions:

- Check component source code in `/src/components/`
- Review TypeScript types for prop definitions
- Test in development mode for detailed error messages
- Report bugs with reproduction steps

---

**Version:** 1.0.0
**Last Updated:** 2025-11-07
**Maintained by:** Noteece Team
