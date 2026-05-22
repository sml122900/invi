import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { useMyProfile, useMyVerifications } from '@/features/profile/hooks';
import { FACE_TYPES, FREQUENCY_LEVELS, RELIGION_OPTIONS, TAG_LABEL_MAP } from '@/features/profile/constants';
import { theme } from '@/theme';
import type { IntroPrompt } from '@/features/profile/types';

export default function ProfilePreviewScreen() {
  const { profile, loading } = useMyProfile();
  const { verifications } = useMyVerifications();

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <AppText variant="secondary">불러오는 중...</AppText>
      </View>
    );
  }

  const age = profile.birth_year
    ? new Date().getFullYear() - profile.birth_year
    : null;

  const faceLabel = FACE_TYPES.find(f => f.value === profile.face_type)?.label ?? null;
  const smokingLabel = FREQUENCY_LEVELS.find(f => f.value === profile.smoking)?.label ?? null;
  const drinkingLabel = FREQUENCY_LEVELS.find(f => f.value === profile.drinking)?.label ?? null;
  const religionLabel = RELIGION_OPTIONS.find(r => r.value === profile.religion)?.label ?? null;

  const prompts = (profile.intro_prompts ?? []) as IntroPrompt[];

  const schoolVerif = verifications.find(v => v.type === 'school');
  const companyVerif = verifications.find(v => v.type === 'company');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <AppText style={styles.backIcon}>←</AppText>
        </TouchableOpacity>
        <AppText size="lg" weight="semibold">매칭 카드 미리보기</AppText>
        <View style={{ width: 36 }} />
      </View>

      <AppText size="xs" variant="secondary" style={styles.notice}>
        상대방에게 이런 모습으로 보여요. 학교/직장은 인증 여부만 표시됩니다.
      </AppText>

      {/* 기본 정보 카드 */}
      <View style={styles.card}>
        <View style={styles.profileTop}>
          <View style={styles.avatarBox}>
            <AppText style={styles.avatarText}>{faceLabel ?? '?'}</AppText>
          </View>
          <View style={styles.basicMeta}>
            {age && (
              <AppText size="lg" weight="semibold">{age}세</AppText>
            )}
            {profile.height_cm && (
              <AppText size="sm" variant="secondary">{profile.height_cm}cm</AppText>
            )}
            {profile.region && (
              <AppText size="sm" variant="secondary">{profile.region}</AppText>
            )}
            {profile.mbti && (
              <View style={styles.mbtiBadge}>
                <AppText size="sm" weight="semibold" style={styles.mbtiText}>
                  {profile.mbti}
                </AppText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 생활 습관 */}
        <View style={styles.habitRow}>
          {smokingLabel && (
            <View style={styles.habitItem}>
              <AppText size="xs" variant="secondary">흡연</AppText>
              <AppText size="sm">{smokingLabel}</AppText>
            </View>
          )}
          {drinkingLabel && (
            <View style={styles.habitItem}>
              <AppText size="xs" variant="secondary">음주</AppText>
              <AppText size="sm">{drinkingLabel}</AppText>
            </View>
          )}
          {religionLabel && (
            <View style={styles.habitItem}>
              <AppText size="xs" variant="secondary">종교</AppText>
              <AppText size="sm">{religionLabel}</AppText>
            </View>
          )}
        </View>
      </View>

      {/* 인증 배지 — 조직명 비노출, 인증 여부만 */}
      {(schoolVerif || companyVerif) && (
        <View style={styles.card}>
          <FieldLabel label="인증" />
          <View style={styles.badgeRow}>
            {schoolVerif && (
              <View style={styles.badge}>
                <AppText size="sm" weight="semibold" style={styles.badgeText}>학교 인증됨</AppText>
              </View>
            )}
            {companyVerif && (
              <View style={styles.badge}>
                <AppText size="sm" weight="semibold" style={styles.badgeText}>직장 인증됨</AppText>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 취향 태그 */}
      {profile.tags && profile.tags.length > 0 && (
        <View style={styles.card}>
          <FieldLabel label="취향 태그" />
          <View style={styles.chipWrap}>
            {profile.tags.map(id => (
              <Chip
                key={id}
                label={TAG_LABEL_MAP[id] ?? id}
                selected={false}
                onPress={() => {}}
                small
              />
            ))}
          </View>
        </View>
      )}

      {/* 자기소개 */}
      {prompts.length > 0 && (
        <View>
          <FieldLabel label="자기소개" style={{ paddingHorizontal: theme.spacing[4] }} />
          {prompts.map((p, i) => (
            <View key={i} style={styles.promptCard}>
              <AppText size="xs" variant="secondary" style={styles.promptQ}>{p.prompt}</AppText>
              <AppText size="sm">{p.answer}</AppText>
            </View>
          ))}
        </View>
      )}

      {prompts.length === 0 && profile.tags?.length === 0 && !schoolVerif && !companyVerif && (
        <View style={styles.emptyNotice}>
          <AppText variant="secondary" style={styles.emptyText}>
            프로필 본문을 채우면 더 매력적인 카드가 완성돼요.
          </AppText>
        </View>
      )}
    </ScrollView>
  );
}

function FieldLabel({ label, style }: { label: string; style?: object }) {
  return (
    <AppText size="sm" weight="semibold" variant="secondary" style={[{ marginBottom: theme.spacing[2] }, style]}>
      {label}
    </AppText>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: theme.spacing[12] },
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[2],
  },
  backBtn: { padding: theme.spacing[2] },
  backIcon: { fontSize: 20, color: theme.colors.textPrimary },
  notice: {
    textAlign: 'center',
    paddingHorizontal: theme.spacing[6],
    marginBottom: theme.spacing[4],
  },
  card: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing[4],
  },
  profileTop: {
    flexDirection: 'row',
    gap: theme.spacing[4],
    alignItems: 'flex-start',
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
  },
  basicMeta: {
    flex: 1,
    gap: theme.spacing[1],
  },
  mbtiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 3,
    marginTop: theme.spacing[1],
  },
  mbtiText: { color: theme.colors.accent },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing[3],
  },
  habitRow: {
    flexDirection: 'row',
    gap: theme.spacing[4],
  },
  habitItem: { gap: 2 },
  badgeRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  badge: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  badgeText: { color: theme.colors.accent },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  promptCard: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing[4],
  },
  promptQ: {
    marginBottom: theme.spacing[2],
  },
  emptyNotice: {
    alignItems: 'center',
    paddingVertical: theme.spacing[8],
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: theme.spacing[6],
  },
});
