import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { theme } from '@/theme';

interface ProgressBarProps {
  progress: number; // 0–100
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <View>
      {label !== undefined && (
        <View style={styles.header}>
          <AppText size="sm" variant="secondary">{label}</AppText>
          <AppText size="sm" weight="semibold">{clamped}%</AppText>
        </View>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[1],
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
});
