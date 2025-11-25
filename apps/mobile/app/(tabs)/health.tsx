/**
 * Health Tab Screen
 *
 * Entry point for the Health Hub
 */

import { View, StyleSheet } from 'react-native';
import { HealthHub } from '@/screens/HealthHub';
import { colors } from '@/lib/theme';

export default function HealthTab() {
  return (
    <View style={styles.container}>
      <HealthHub />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
