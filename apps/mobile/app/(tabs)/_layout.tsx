import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/lib/theme';

/**
 * F15 DESIGN DECISION: 9 tab items exceed the recommended maximum of 5 for bottom navigation.
 * This is an intentional trade-off for this app's feature-rich personal workspace model.
 * All primary content domains (Today, Tasks, Notes, Capture, Insights, Social, Music, Health)
 * are given equal tab prominence. The "More" tab serves as an overflow for settings and
 * secondary features.
 *
 * Future refinement: Consolidate to 5 primary tabs (Today, Tasks, Notes, Capture, More)
 * with Social, Music, Health, and Insights accessible via the "More" drawer or a
 * swipeable secondary tab bar.
 */

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.fontSize.xs,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Today',
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Tasks',
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Notes',
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size * 1.5} color={colors.primary} />,
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Capture',
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <Ionicons name="bulb-outline" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Insights',
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Social Hub',
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: 'Music',
          tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes-outline" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Music Hub',
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color, size }) => <Ionicons name="fitness-outline" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Health Hub',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} />,
          tabBarAccessibilityLabel: 'More options',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.backgroundElevated,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
});
