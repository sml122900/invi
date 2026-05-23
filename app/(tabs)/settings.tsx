import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, type Href } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { signOut } from '@/features/auth/api';
import { theme } from '@/theme';

interface NavItem {
  label: string;
  hint: string;
  href: Href;
}

const ITEMS: NavItem[] = [
  { label: '프로필 편집',        hint: '기본 정보 · 자기소개 · 태그', href: '/(tabs)/profile' },
  { label: '이상형',             hint: '나이 · 키 · 흡연/음주/종교',  href: '/(tabs)/ideal-type' },
  { label: '내 코스',            hint: '데이트 코스 등록 · 공개',      href: '/(tabs)/courses' },
  { label: '가용 시간',          hint: '요일 · 시간대 슬롯',          href: '/(tabs)/availability' },
  { label: '학교/직장 인증',     hint: '이메일 인증으로 배지',         href: '/(tabs)/verify-org' },
  { label: '같은 학교/회사 제외', hint: '매칭에서 동문 · 동료 제외',    href: '/(tabs)/exclude-org' },
];

export default function SettingsScreen() {
  async function handleSignOut() {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <AppText variant="secondary">← 뒤로</AppText>
        </TouchableOpacity>
        <AppText size="lg" weight="semibold">설정</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.label}
            style={styles.row}
            onPress={() => router.push(item.href)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <AppText size="md" weight="semibold">{item.label}</AppText>
              <AppText size="xs" variant="secondary" style={styles.rowHint}>
                {item.hint}
              </AppText>
            </View>
            <AppText size="md" variant="secondary">›</AppText>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.signOut}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <AppText size="md" weight="semibold" style={styles.signOutText}>
            로그아웃
          </AppText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerSpacer: {
    width: 40,
  },
  body: {
    padding: theme.spacing[5],
    gap: theme.spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[3],
  },
  rowHint: {
    marginTop: 2,
  },
  signOut: {
    marginTop: theme.spacing[6],
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
  },
  signOutText: {
    color: theme.colors.error,
  },
});
