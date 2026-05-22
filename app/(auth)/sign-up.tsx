import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { signUp } from '@/features/auth/api';
import { authErrorMessage } from '@/features/auth/errors';
import { theme } from '@/theme';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError('');
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      router.replace('/(onboarding)/basic-info');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AppText size="3xl" weight="semibold" style={styles.title}>
          INVI
        </AppText>
        <AppText size="md" variant="secondary" style={styles.subtitle}>
          초대장으로 시작하는 소개팅
        </AppText>

        <View style={styles.form}>
          <TextField
            label="이메일"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="your@email.com"
          />
          <TextField
            label="비밀번호"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="6자 이상"
          />
          {error ? (
            <AppText size="sm" style={styles.errorText}>
              {error}
            </AppText>
          ) : null}
          <Button label="가입하기" onPress={handleSignUp} loading={loading} />
        </View>

        <Link href="/(auth)/sign-in" asChild>
          <AppText size="sm" variant="secondary" style={styles.link}>
            이미 계정이 있으신가요? <AppText size="sm" style={styles.linkAccent}>로그인</AppText>
          </AppText>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[16],
    paddingBottom: theme.spacing[8],
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: theme.spacing[2], marginBottom: theme.spacing[10] },
  form: { gap: theme.spacing[4] },
  errorText: { color: theme.colors.error },
  link: { textAlign: 'center', marginTop: theme.spacing[8] },
  linkAccent: { color: theme.colors.accent },
});
