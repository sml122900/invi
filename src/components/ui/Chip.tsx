import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { theme } from '@/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  small?: boolean;
}

export function Chip({ label, selected, onPress, style, small = false }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, small && styles.small, selected && styles.selected, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AppText
        size={small ? 'xs' : 'sm'}
        weight={selected ? 'semibold' : 'regular'}
        style={[styles.label, selected && styles.labelSelected]}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  small: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 5,
    borderRadius: 14,
  },
  selected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  label: {
    color: theme.colors.textSecondary,
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
