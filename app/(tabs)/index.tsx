import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/api';
import { theme } from '@/theme';

export default function HomeScreen() {
  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <View style={styles.container}>
      <AppText size="xl" weight="semibold" style={styles.message}>
        오늘의 인비는{'\n'}곧 도착해요
      </AppText>
      <AppText size="sm" variant="secondary" style={styles.sub}>
        매일 오전 1시, 오후 11시에 새로운 인연을 전해드려요.
      </AppText>
      <Button
        variant="secondary"
        label="로그아웃"
        onPress={handleSignOut}
        style={styles.signOutBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  message: { textAlign: 'center', lineHeight: 30 },
  sub: { textAlign: 'center', marginTop: theme.spacing[3], marginBottom: theme.spacing[10] },
  signOutBtn: { width: '100%' },
});
