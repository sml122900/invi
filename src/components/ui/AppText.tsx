import { Text, TextStyle, StyleSheet, TextProps } from 'react-native';
import { theme } from '@/theme';

interface AppTextProps extends TextProps {
  variant?: 'primary' | 'secondary';
  size?: keyof typeof theme.typography.size;
  weight?: keyof typeof theme.typography.weight;
}

export function AppText({
  variant = 'primary',
  size = 'md',
  weight = 'regular',
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        styles.base,
        {
          color: variant === 'primary' ? theme.colors.textPrimary : theme.colors.textSecondary,
          fontSize: theme.typography.size[size],
          fontWeight: theme.typography.weight[weight],
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    lineHeight: 22,
  },
});
