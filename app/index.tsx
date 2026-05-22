import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useSession';
import { getMyProfile } from '@/features/profile/api';
import { theme } from '@/theme';

export default function Index() {
  const { session, loading: sessionLoading } = useSession();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setOnboarded(null);
      return;
    }

    getMyProfile()
      .then((profile) => {
        setOnboarded(
          profile !== null && profile.gender !== null && profile.birth_year !== null
        );
      })
      .catch(() => setOnboarded(false));
  }, [session]);

  if (sessionLoading || (session !== null && onboarded === null)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!onboarded) {
    return <Redirect href="/(onboarding)/basic-info" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
