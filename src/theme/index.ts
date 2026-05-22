import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

export const theme = {
  colors: {
    primary: colors.primary,
    accent: colors.accent,
    background: colors.background.dark,
    surface: colors.surface.dark,
    textPrimary: colors.text.primary.dark,
    textSecondary: colors.text.secondary.dark,
    error: colors.error,
    border: colors.border.dark,
  },
  typography,
  spacing,
} as const;

export type Theme = typeof theme;
export { colors, typography, spacing };
