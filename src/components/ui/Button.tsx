import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { AppText } from './AppText';
import { theme } from '@/theme';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  label: string;
}

export function Button({
  variant = 'primary',
  loading = false,
  label,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        style as ViewStyle,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#15140F' : theme.colors.textPrimary} />
      ) : (
        <AppText
          weight="semibold"
          size="md"
          style={{ color: isPrimary ? '#15140F' : theme.colors.textPrimary }}
        >
          {label}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  primary: {
    backgroundColor: theme.colors.textPrimary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disabled: {
    opacity: 0.4,
  },
});
