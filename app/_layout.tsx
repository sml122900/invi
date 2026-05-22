import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useSession';
import { theme } from '@/theme';

export default function RootLayout() {
  const { loading } = useSession();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
