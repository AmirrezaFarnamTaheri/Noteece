import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { NativeModules } from 'react-native';
// @ts-ignore: expo vector icons type mismatch
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { AppLauncher } = NativeModules;

interface SocialAppProps {
  name: string;
  pkg: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  category: AppCategory;
}

type AppCategory = 'social' | 'messaging' | 'dating' | 'browser' | 'media' | 'reading';

// Comprehensive app list for Prime capture
const APPS: SocialAppProps[] = [
  // Social Media
  {
    name: 'Twitter',
    pkg: 'com.twitter.android',
    icon: 'twitter',
    color: '#1DA1F2',
    category: 'social',
  },
  {
    name: 'Instagram',
    pkg: 'com.instagram.android',
    icon: 'instagram',
    color: '#E4405F',
    category: 'social',
  },
  {
    name: 'LinkedIn',
    pkg: 'com.linkedin.android',
    icon: 'linkedin',
    color: '#0A66C2',
    category: 'social',
  },
  {
    name: 'Reddit',
    pkg: 'com.reddit.frontpage',
    icon: 'reddit',
    color: '#FF4500',
    category: 'social',
  },
  {
    name: 'Facebook',
    pkg: 'com.facebook.katana',
    icon: 'facebook',
    color: '#1877F2',
    category: 'social',
  },
  {
    name: 'TikTok',
    pkg: 'com.zhiliaoapp.musically',
    icon: 'music-note',
    color: '#000000',
    category: 'social',
  },
  {
    name: 'Pinterest',
    pkg: 'com.pinterest',
    icon: 'pinterest',
    color: '#E60023',
    category: 'social',
  },
  {
    name: 'Tumblr',
    pkg: 'com.tumblr',
    icon: 'tumblr',
    color: '#35465C',
    category: 'social',
  },

  // Messaging
  {
    name: 'Telegram',
    pkg: 'org.telegram.messenger',
    icon: 'telegram',
    color: '#26A5E4',
    category: 'messaging',
  },
  {
    name: 'Discord',
    pkg: 'com.discord',
    icon: 'discord',
    color: '#5865F2',
    category: 'messaging',
  },
  {
    name: 'WhatsApp',
    pkg: 'com.whatsapp',
    icon: 'whatsapp',
    color: '#25D366',
    category: 'messaging',
  },
  {
    name: 'Signal',
    pkg: 'org.thoughtcrime.securesms',
    icon: 'message-text-lock',
    color: '#3A76F0',
    category: 'messaging',
  },
  {
    name: 'Slack',
    pkg: 'com.slack',
    icon: 'slack',
    color: '#4A154B',
    category: 'messaging',
  },
  {
    name: 'Snapchat',
    pkg: 'com.snapchat.android',
    icon: 'snapchat',
    color: '#FFFC00',
    category: 'messaging',
  },

  // Dating Apps
  {
    name: 'Tinder',
    pkg: 'com.tinder',
    icon: 'fire',
    color: '#FE3C72',
    category: 'dating',
  },
  {
    name: 'Bumble',
    pkg: 'com.bumble.app',
    icon: 'bee',
    color: '#FFC629',
    category: 'dating',
  },
  {
    name: 'Hinge',
    pkg: 'co.hinge.app',
    icon: 'heart-outline',
    color: '#6C5CE7',
    category: 'dating',
  },
  {
    name: 'OkCupid',
    pkg: 'com.okcupid.okcupid',
    icon: 'heart-multiple',
    color: '#0500FF',
    category: 'dating',
  },

  // Browsers
  {
    name: 'Chrome',
    pkg: 'com.android.chrome',
    icon: 'google-chrome',
    color: '#4285F4',
    category: 'browser',
  },
  {
    name: 'Firefox',
    pkg: 'org.mozilla.firefox',
    icon: 'firefox',
    color: '#FF7139',
    category: 'browser',
  },
  {
    name: 'Brave',
    pkg: 'com.brave.browser',
    icon: 'shield-check',
    color: '#FB542B',
    category: 'browser',
  },
  {
    name: 'Edge',
    pkg: 'com.microsoft.emmx',
    icon: 'microsoft-edge',
    color: '#0078D7',
    category: 'browser',
  },
  {
    name: 'DuckDuckGo',
    pkg: 'com.duckduckgo.mobile.android',
    icon: 'duck',
    color: '#DE5833',
    category: 'browser',
  },

  // Media & Video
  {
    name: 'YouTube',
    pkg: 'com.google.android.youtube',
    icon: 'youtube',
    color: '#FF0000',
    category: 'media',
  },
  {
    name: 'Twitch',
    pkg: 'tv.twitch.android.app',
    icon: 'twitch',
    color: '#9146FF',
    category: 'media',
  },
  {
    name: 'Spotify',
    pkg: 'com.spotify.music',
    icon: 'spotify',
    color: '#1DB954',
    category: 'media',
  },

  // Reading
  {
    name: 'Medium',
    pkg: 'com.medium.reader',
    icon: 'alpha-m-box',
    color: '#000000',
    category: 'reading',
  },
  {
    name: 'NYTimes',
    pkg: 'com.nytimes.android',
    icon: 'newspaper',
    color: '#000000',
    category: 'reading',
  },
];

const CATEGORY_LABELS: Record<AppCategory, string> = {
  social: '📱 Social Media',
  messaging: '💬 Messaging',
  dating: '💕 Dating',
  browser: '🌐 Browsers',
  media: '🎬 Media',
  reading: '📚 Reading',
};

const CATEGORY_ORDER: AppCategory[] = ['social', 'messaging', 'dating', 'browser', 'media', 'reading'];

export const SocialDock: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>('social');

  const startSession = async (app: SocialAppProps) => {
    try {
      if (Platform.OS === 'android') {
        // Use Native Module for Intent + Service Signaling
        await AppLauncher.launchWithSession(app.pkg, app.name.toLowerCase());
      } else {
        // Fallback or iOS logic (Linking)
        console.warn('Active Interception not supported on this platform');
      }
    } catch (error) {
      console.error('Failed to launch session:', error);
      // Show toast/alert
    }
  };

  const filteredApps = APPS.filter((app) => app.category === selectedCategory);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔮 Social Dock</Text>
      <Text style={styles.subtitle}>Launch apps with Prime capture enabled</Text>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {CATEGORY_ORDER.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.tab, selectedCategory === category && styles.tabActive]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.tabText, selectedCategory === category && styles.tabTextActive]}>
              {CATEGORY_LABELS[category]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* App Grid */}
      <View style={styles.grid}>
        {filteredApps.map((app) => (
          <TouchableOpacity
            key={app.name}
            style={[styles.iconButton, { backgroundColor: app.color + '15' }]}
            onPress={() => startSession(app)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: app.color + '30' }]}>
              <MaterialCommunityIcons name={app.icon} size={28} color={app.color} />
            </View>
            <Text style={styles.iconLabel}>{app.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Prime Status */}
      <View style={styles.primeStatus}>
        <MaterialCommunityIcons name="eye" size={16} color="#00FF88" />
        <Text style={styles.primeStatusText}>Prime Capture Active</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0A0E27',
    borderRadius: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#2A2E47',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#8888AA',
    fontSize: 13,
    marginBottom: 16,
  },
  tabsContainer: {
    marginBottom: 16,
    marginHorizontal: -8,
  },
  tabsContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(100,150,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(100,150,255,0.5)',
  },
  tabText: {
    color: '#8888AA',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
  },
  iconButton: {
    width: '30%',
    aspectRatio: 0.9,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconLabel: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  primeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  primeStatusText: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: '600',
  },
});
