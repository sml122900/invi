import { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  FACE_TYPES, FREQUENCY_LEVELS, RELIGION_OPTIONS,
  MBTI_EI, MBTI_NS, MBTI_TF, MBTI_JP,
  INTRO_PROMPTS, TAG_CATEGORIES, SEOUL_DISTRICTS,
} from '@/features/profile/constants';
import { useMyProfile, useMyVerifications } from '@/features/profile/hooks';
import { updateProfile } from '@/features/profile/api';
import { theme } from '@/theme';
import type { FaceType, FrequencyLevel, ReligionType, IntroPrompt } from '@/features/profile/types';

export default function ProfileScreen() {
  const { profile, loading, reload } = useMyProfile();
  const { verifications } = useMyVerifications();

  // ── 기본 정보 state
  const [heightText, setHeightText] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [activeRegions, setActiveRegions] = useState<string[]>([]);
  const [faceType, setFaceType] = useState<FaceType | null>(null);
  const [ei, setEI] = useState<'E' | 'I' | null>(null);
  const [ns, setNS] = useState<'N' | 'S' | null>(null);
  const [tf, setTF] = useState<'T' | 'F' | null>(null);
  const [jp, setJP] = useState<'J' | 'P' | null>(null);
  const [smoking, setSmoking] = useState<FrequencyLevel | null>(null);
  const [drinking, setDrinking] = useState<FrequencyLevel | null>(null);
  const [religion, setReligion] = useState<ReligionType | null>(null);

  // ── 자기소개 state
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [promptAnswers, setPromptAnswers] = useState<Record<string, string>>({});

  // ── 태그 state
  const [tags, setTags] = useState<string[]>([]);

  // ── 완성도
  const [completeness, setCompleteness] = useState(0);
  const [saving, setSaving] = useState(false);

  // 프로필 로드 후 form 초기화
  useEffect(() => {
    if (!profile) return;
    setHeightText(profile.height_cm ? String(profile.height_cm) : '');
    setRegion(profile.region);
    setActiveRegions(profile.active_regions ?? []);
    setFaceType(profile.face_type);
    if (profile.mbti?.length === 4) {
      setEI(profile.mbti[0] as 'E' | 'I');
      setNS(profile.mbti[1] as 'N' | 'S');
      setTF(profile.mbti[2] as 'T' | 'F');
      setJP(profile.mbti[3] as 'J' | 'P');
    }
    setSmoking(profile.smoking);
    setDrinking(profile.drinking);
    setReligion(profile.religion);

    const prompts = (profile.intro_prompts ?? []) as IntroPrompt[];
    const promptKeys = prompts.map(p => p.prompt);
    const answerMap: Record<string, string> = {};
    prompts.forEach(p => { answerMap[p.prompt] = p.answer; });
    setSelectedPrompts(promptKeys);
    setPromptAnswers(answerMap);

    setTags(profile.tags ?? []);
    setCompleteness(profile.completeness ?? 0);
  }, [profile]);

  const mbti = ei && ns && tf && jp ? `${ei}${ns}${tf}${jp}` : null;

  function toggleActiveRegion(d: string) {
    setActiveRegions(prev =>
      prev.includes(d) ? prev.filter(r => r !== d) : [...prev, d]
    );
  }

  function togglePrompt(prompt: string) {
    setSelectedPrompts(prev => {
      if (prev.includes(prompt)) {
        const next = prev.filter(p => p !== prompt);
        setPromptAnswers(ans => { const a = { ...ans }; delete a[prompt]; return a; });
        return next;
      }
      if (prev.length >= 6) return prev;
      return [...prev, prompt];
    });
  }

  function setAnswer(prompt: string, answer: string) {
    setPromptAnswers(prev => ({ ...prev, [prompt]: answer }));
  }

  function toggleTag(id: string) {
    setTags(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id);
      if (prev.length >= 10) {
        Alert.alert('태그는 최대 10개까지 선택할 수 있어요.');
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleSave() {
    const heightNum = heightText ? parseInt(heightText, 10) : undefined;
    if (heightText && (isNaN(heightNum!) || heightNum! < 130 || heightNum! > 220)) {
      Alert.alert('키는 130–220 사이로 입력해 주세요.');
      return;
    }

    // 선택된 prompt 중 빈 답변 체크
    for (const p of selectedPrompts) {
      const ans = (promptAnswers[p] ?? '').trim();
      if (!ans) {
        Alert.alert('자기소개 답변을 입력해 주세요.');
        return;
      }
      if (ans.length > 300) {
        Alert.alert('자기소개 답변은 300자 이내로 입력해 주세요.');
        return;
      }
    }

    const introPrompts = selectedPrompts.map(p => ({
      prompt: p,
      answer: (promptAnswers[p] ?? '').trim(),
    }));

    setSaving(true);
    try {
      const result = await updateProfile({
        height_cm:      heightNum ?? undefined,
        region:         region ?? undefined,
        active_regions: activeRegions.length > 0 ? activeRegions : undefined,
        mbti:           mbti ?? undefined,
        face_type:      faceType ?? undefined,
        smoking:        smoking ?? undefined,
        drinking:       drinking ?? undefined,
        religion:       religion ?? undefined,
        intro_prompts:  introPrompts.length > 0 ? introPrompts : undefined,
        tags:           tags.length > 0 ? tags : undefined,
      });
      setCompleteness(result.completeness);
      Alert.alert('저장됐어요');
      reload();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      if (msg.includes('empty_answer')) {
        Alert.alert('빈 자기소개 답변이 있어요.');
      } else if (msg.includes('answer_too_long')) {
        Alert.alert('자기소개 답변은 300자 이내로 입력해 주세요.');
      } else {
        Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setSaving(false);
    }
  }

  const schoolVerif = verifications.find(v => v.type === 'school');
  const companyVerif = verifications.find(v => v.type === 'company');

  if (loading) {
    return (
      <View style={styles.center}>
        <AppText variant="secondary">불러오는 중...</AppText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <AppText style={styles.backIcon}>←</AppText>
          </TouchableOpacity>
          <AppText size="lg" weight="semibold">나의 프로필</AppText>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile-preview')}>
            <AppText size="sm" style={styles.previewLink}>미리보기</AppText>
          </TouchableOpacity>
        </View>

        {/* 완성도 */}
        <View style={styles.card}>
          <ProgressBar progress={completeness} label="프로필 완성도" />
        </View>

        {/* ── 기본 정보 ── */}
        <SectionHeader title="기본 정보" />

        <View style={styles.card}>
          <FieldLabel label="키 (cm)" />
          <TextInput
            style={styles.textInput}
            value={heightText}
            onChangeText={setHeightText}
            keyboardType="numeric"
            placeholder="예: 172"
            placeholderTextColor={theme.colors.textSecondary}
            maxLength={3}
          />
        </View>

        <View style={styles.card}>
          <FieldLabel label="거주 지역" />
          <View style={styles.chipWrap}>
            {SEOUL_DISTRICTS.map(d => (
              <Chip
                key={d}
                label={d}
                selected={region === d}
                onPress={() => setRegion(prev => (prev === d ? null : d))}
                small
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <FieldLabel label={`활동 지역 (${activeRegions.length}개 선택)`} />
          <View style={styles.chipWrap}>
            {SEOUL_DISTRICTS.map(d => (
              <Chip
                key={d}
                label={d}
                selected={activeRegions.includes(d)}
                onPress={() => toggleActiveRegion(d)}
                small
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <FieldLabel label="얼굴상" />
          <View style={styles.chipWrap}>
            {FACE_TYPES.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                selected={faceType === f.value}
                onPress={() => setFaceType(faceType === f.value ? null : (f.value as FaceType))}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <FieldLabel label="MBTI" />
          {mbti && <AppText size="sm" weight="semibold" style={styles.mbtiResult}>{mbti}</AppText>}
          {([
            { pairs: MBTI_EI, val: ei, set: setEI },
            { pairs: MBTI_NS, val: ns, set: setNS },
            { pairs: MBTI_TF, val: tf, set: setTF },
            { pairs: MBTI_JP, val: jp, set: setJP },
          ] as const).map((row, i) => (
            <View key={i} style={styles.mbtiRow}>
              {row.pairs.map(opt => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={row.val === opt.value}
                  onPress={() => (row.set as (v: string | null) => void)(
                    row.val === opt.value ? null : opt.value
                  )}
                  style={styles.mbtiChip}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <FieldLabel label="흡연" />
          <View style={styles.chipWrap}>
            {FREQUENCY_LEVELS.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                selected={smoking === f.value}
                onPress={() => setSmoking(smoking === f.value ? null : (f.value as FrequencyLevel))}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <FieldLabel label="음주" />
          <View style={styles.chipWrap}>
            {FREQUENCY_LEVELS.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                selected={drinking === f.value}
                onPress={() => setDrinking(drinking === f.value ? null : (f.value as FrequencyLevel))}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <FieldLabel label="종교 (선택)" />
          <View style={styles.chipWrap}>
            {RELIGION_OPTIONS.map(r => (
              <Chip
                key={r.value}
                label={r.label}
                selected={religion === r.value}
                onPress={() => setReligion(religion === r.value ? null : (r.value as ReligionType))}
              />
            ))}
          </View>
        </View>

        {/* ── 자기소개 ── */}
        <SectionHeader title={`자기소개 (${selectedPrompts.length}/6, 3개 이상)`} />

        <View style={styles.card}>
          {INTRO_PROMPTS.map(prompt => {
            const selected = selectedPrompts.includes(prompt);
            return (
              <View key={prompt} style={styles.promptBlock}>
                <TouchableOpacity
                  style={styles.promptToggle}
                  onPress={() => togglePrompt(prompt)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                    {selected && <AppText size="xs" style={styles.checkMark}>✓</AppText>}
                  </View>
                  <AppText size="sm" style={styles.promptText}>{prompt}</AppText>
                </TouchableOpacity>
                {selected && (
                  <TextInput
                    style={styles.answerInput}
                    value={promptAnswers[prompt] ?? ''}
                    onChangeText={text => setAnswer(prompt, text)}
                    placeholder="자유롭게 답해보세요 (최대 300자)"
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    maxLength={300}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* ── 취향 태그 ── */}
        <SectionHeader title={`취향 태그 (${tags.length}/10 선택, 5개 이상)`} />

        {TAG_CATEGORIES.map(cat => (
          <View key={cat.label} style={styles.card}>
            <FieldLabel label={cat.label} />
            <View style={styles.chipWrap}>
              {cat.tags.map(t => (
                <Chip
                  key={t.id}
                  label={t.label}
                  selected={tags.includes(t.id)}
                  onPress={() => toggleTag(t.id)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* ── 인증 ── */}
        <SectionHeader title="학교/직장 인증" />

        <View style={styles.card}>
          <View style={styles.verificRow}>
            <AppText size="sm" variant="secondary">학교 인증</AppText>
            {schoolVerif
              ? <AppText size="sm" weight="semibold" style={styles.verifiedBadge}>인증됨</AppText>
              : <AppText size="sm" variant="secondary">미인증</AppText>
            }
          </View>
          <View style={[styles.verificRow, { marginTop: theme.spacing[2] }]}>
            <AppText size="sm" variant="secondary">직장 인증</AppText>
            {companyVerif
              ? <AppText size="sm" weight="semibold" style={styles.verifiedBadge}>인증됨</AppText>
              : <AppText size="sm" variant="secondary">미인증</AppText>
            }
          </View>
          {!schoolVerif && !companyVerif && (
            <Button
              label="인증하러 가기"
              variant="secondary"
              style={{ marginTop: theme.spacing[3] }}
              onPress={() => {
                router.push('/(tabs)/verify-org');
              }}
            />
          )}
          {(schoolVerif || companyVerif) && (
            <Button
              label="추가 인증하기"
              variant="secondary"
              style={{ marginTop: theme.spacing[3] }}
              onPress={() => router.push('/(tabs)/verify-org')}
            />
          )}
        </View>

        {/* 저장 버튼 */}
        <View style={styles.saveArea}>
          <Button label="저장하기" onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText size="sm" weight="semibold" variant="secondary">{title}</AppText>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <AppText size="sm" variant="secondary" style={styles.fieldLabel}>{label}</AppText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    paddingBottom: theme.spacing[4],
  },
  backBtn: { padding: theme.spacing[2] },
  backIcon: { fontSize: 20, color: theme.colors.textPrimary },
  previewLink: { color: theme.colors.accent },
  card: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing[4],
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  fieldLabel: {
    marginBottom: theme.spacing[2],
  },
  textInput: {
    height: 48,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: theme.spacing[3],
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  mbtiResult: {
    color: theme.colors.accent,
    marginBottom: theme.spacing[3],
    fontSize: theme.typography.size.lg,
  },
  mbtiRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  mbtiChip: { flex: 1 },
  promptBlock: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  promptToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[3],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxOn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkMark: { color: '#fff' },
  promptText: {
    flex: 1,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  answerInput: {
    marginTop: theme.spacing[3],
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: theme.spacing[3],
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  verificRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifiedBadge: { color: theme.colors.accent },
  saveArea: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
  },
});
