import { useState } from 'react';
import { View, TextInput, TextInputProps, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { theme } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, secureTextEntry, ...props }: TextFieldProps) {
  const isPassword = secureTextEntry === true;
  const [hidden, setHidden] = useState(isPassword);

  return (
    <View style={styles.container}>
      <AppText size="sm" weight="medium" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, isPassword && styles.inputWithToggle, error ? styles.inputError : null, style]}
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.accent}
          secureTextEntry={hidden}
          autoCapitalize={isPassword ? 'none' : props.autoCapitalize}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity style={styles.toggle} onPress={() => setHidden(h => !h)}>
            <AppText size="sm" style={styles.toggleText}>
              {hidden ? '보기' : '숨기기'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <AppText size="sm" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing[1],
  },
  label: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: theme.spacing[4],
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputWithToggle: {
    paddingRight: 64,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  toggle: {
    position: 'absolute',
    right: theme.spacing[4],
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  toggleText: {
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.error,
    marginTop: 2,
  },
});
