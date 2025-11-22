import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { NativeModules } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '../../store'; // Assuming standard store path

const { AppLauncher } = NativeModules;

interface SocialAppProps {
  name: string;
  pkg: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

const APPS: SocialAppProps[] = [
  { name: 'Twitter', pkg: 'com.twitter.android', icon: 'twitter', color: '#1DA1F2' },
  { name: 'Reddit', pkg: 'com.reddit.frontpage', icon: 'reddit', color: '#FF4500' },
  { name: 'YouTube', pkg: 'com.google.android.youtube', icon: 'youtube', color: '#FF0000' },
  { name: 'LinkedIn', pkg: 'com.linkedin.android', icon: 'linkedin', color: '#0A66C2' },
];

export const SocialDock: React.FC = () => {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social Dock</Text>
      <View style={styles.grid}>
        {APPS.map((app) => (
          <TouchableOpacity
            key={app.name}
            style={[styles.iconButton, { backgroundColor: app.color + '20' }]} // 20% opacity bg
            onPress={() => startSession(app)}
          >
            <MaterialCommunityIcons name={app.icon} size={32} color={app.color} />
            <Text style={styles.iconLabel}>{app.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0A0E27', // Deep Obsidian
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#2A2E47',
  },
  title: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: '48%',
    aspectRatio: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconLabel: {
    color: '#E0E0E0',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});
