import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { signOut } from '@/features/auth/api';
import { useMyProfile, useMyVerifications } from '@/features/profile/hooks';
import { useMyCourses, useMyAvailableTimes } from '@/features/courses/hooks';
import { theme } from '@/theme';
import type { IntroPrompt } from '@/features/profile/types';

export default function HomeScreen() {
  const { profile, loading: profileLoading } = useMyProfile();
  const { verifications, loading: verifLoading } = useMyVerifications();
  const { courses, loading: coursesLoading } = useMyCourses();
  const { times, loading: timesLoading } = useMyAvailableTimes();

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  // 매칭 준비 조건 계산
  const hasBasicInfo = !!(
    profile?.height_cm &&
    profile?.region &&
    profile?.face_type &&
    profile?.mbti &&
    profile?.smoking &&
    profile?.drinking
  );
  const prompts = (profile?.intro_prompts ?? []) as IntroPrompt[];
  const hasIntro        = prompts.length >= 3;
  const hasTags         = (profile?.tags?.length ?? 0) >= 5;
  const hasVerif        = verifications.length > 0;
  const hasPublicCourse = courses.some(c => c.is_public);
  const hasAvailability = times.length > 0;
  const isReady = hasBasicInfo && hasIntro && hasTags && hasVerif &&
                  hasPublicCourse && hasAvailability;

  const missing: string[] = [];
  if (!hasBasicInfo)     missing.push('기본 정보');
  if (!hasIntro)         missing.push('자기소개 3개');
  if (!hasTags)          missing.push('취향 태그 5개');
  if (!hasVerif)         missing.push('학교/직장 인증');
  if (!hasPublicCourse)  missing.push('공개 코스 1개');
  if (!hasAvailability)  missing.push('가용 시간 설정');

  const isLoading = profileLoading || verifLoading || coursesLoading || timesLoading;

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.topBar}>
        <AppText size="lg" weight="semibold">INVI</AppText>
        <TouchableOpacity onPress={handleSignOut}>
          <AppText size="sm" variant="secondary">로그아웃</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        <AppText size="xl" weight="semibold" style={styles.headline}>
          오늘의 인비는{'\n'}곧 도착해요
        </AppText>
        <AppText size="sm" variant="secondary" style={styles.sub}>
          매일 오전 1시, 오후 11시에 새로운 인연을 전해드려요.
        </AppText>

        {!isLoading && profile && (
          <View style={styles.readyCard}>
            <ProgressBar
              progress={profile.completeness ?? 0}
              label="프로필 완성도"
            />

            <View style={styles.readyStatus}>
              {isReady ? (
                <View style={styles.readyBadge}>
                  <AppText size="sm" weight="semibold" style={styles.readyText}>
                    매칭 준비 완료
                  </AppText>
                </View>
              ) : (
                <>
                  <AppText size="sm" variant="secondary" style={styles.missingTitle}>
                    아직 {missing.length}개 항목이 필요해요
                  </AppText>
                  {missing.map(item => (
                    <AppText key={item} size="sm" variant="secondary" style={styles.missingItem}>
                      · {item}
                    </AppText>
                  ))}
                </>
              )}
            </View>

            <View style={styles.actionRow}>
              <Button
                label="프로필 편집"
                variant="secondary"
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/profile')}
              />
              {!hasVerif && (
                <Button
                  label="인증하기"
                  style={styles.actionBtn}
                  onPress={() => router.push('/(tabs)/verify-org')}
                />
              )}
            </View>

            <View style={styles.actionRow}>
              <Button
                label={hasPublicCourse ? '내 코스' : '코스 만들기'}
                variant={hasPublicCourse ? 'secondary' : 'primary'}
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/courses')}
              />
              <Button
                label={hasAvailability ? '가용 시간' : '가용 시간 설정'}
                variant={hasAvailability ? 'secondary' : 'primary'}
                style={styles.actionBtn}
                onPress={() => router.push('/(tabs)/availability')}
              />
            </View>
          </View>
        )}

        {isLoading && (
          <AppText variant="secondary" style={styles.loadingText}>
            불러오는 중...
          </AppText>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[4],
  },
  scrollBody: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[10],
    justifyContent: 'center',
  },
  headline: {
    textAlign: 'center',
    lineHeight: 32,
  },
  sub: {
    textAlign: 'center',
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[6],
    lineHeight: 22,
  },
  readyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing[5],
    gap: theme.spacing[4],
  },
  readyStatus: {
    gap: theme.spacing[1],
  },
  readyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  readyText: { color: '#fff' },
  missingTitle: {
    marginBottom: theme.spacing[1],
  },
  missingItem: {
    paddingLeft: theme.spacing[2],
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  actionBtn: {
    flex: 1,
    height: 44,
  },
  loadingText: {
    textAlign: 'center',
  },
});
