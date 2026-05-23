import { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useMyIdealType } from '@/features/match-prefs/hooks';
import { updateIdealType } from '@/features/match-prefs/api';
import {
  AGE_BOUNDS, HEIGHT_BOUNDS, LOCKED_PREFS,
  LOCKED_INFO_TITLE, LOCKED_INFO_BODY,
} from '@/features/match-prefs/constants';
import { FREQUENCY_LEVELS, RELIGION_OPTIONS } from '@/features/profile/constants';
import type { FrequencyLevel, ReligionType } from '@/features/profile/types';
import { theme } from '@/theme';

function parseNum(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function IdealTypeScreen() {
  const { idealType, loading, reload } = useMyIdealType();

  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [smoking, setSmoking] = useState<FrequencyLevel | null>(null);
  const [drinking, setDrinking] = useState<FrequencyLevel | null>(null);
  const [religion, setReligion] = useState<ReligionType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!idealType) return;
    setAgeMin(idealType.age_min != null ? String(idealType.age_min) : '');
    setAgeMax(idealType.age_max != null ? String(idealType.age_max) : '');
    setHeightMin(idealType.height_min != null ? String(idealType.height_min) : '');
    setHeightMax(idealType.height_max != null ? String(idealType.height_max) : '');
    setSmoking(idealType.smoking_pref);
    setDrinking(idealType.drinking_pref);
    setReligion(idealType.religion_pref);
  }, [idealType]);

  const ageMinN    = parseNum(ageMin);
  const ageMaxN    = parseNum(ageMax);
  const heightMinN = parseNum(heightMin);
  const heightMaxN = parseNum(heightMax);

  function validate(): string | null {
    if (ageMinN != null && (ageMinN < AGE_BOUNDS.min || ageMinN > AGE_BOUNDS.max)) {
      return `나이 최솟값은 ${AGE_BOUNDS.min}–${AGE_BOUNDS.max} 사이로 적어주세요`;
    }
    if (ageMaxN != null && (ageMaxN < AGE_BOUNDS.min || ageMaxN > AGE_BOUNDS.max)) {
      return `나이 최댓값은 ${AGE_BOUNDS.min}–${AGE_BOUNDS.max} 사이로 적어주세요`;
    }
    if (ageMinN != null && ageMaxN != null && ageMinN > ageMaxN) {
      return '나이 최솟값이 최댓값보다 큽니다';
    }
    if (heightMinN != null && (heightMinN < HEIGHT_BOUNDS.min || heightMinN > HEIGHT_BOUNDS.max)) {
      return `키 최솟값은 ${HEIGHT_BOUNDS.min}–${HEIGHT_BOUNDS.max} cm 사이로 적어주세요`;
    }
    if (heightMaxN != null && (heightMaxN < HEIGHT_BOUNDS.min || heightMaxN > HEIGHT_BOUNDS.max)) {
      return `키 최댓값은 ${HEIGHT_BOUNDS.min}–${HEIGHT_BOUNDS.max} cm 사이로 적어주세요`;
    }
    if (heightMinN != null && heightMaxN != null && heightMinN > heightMaxN) {
      return '키 최솟값이 최댓값보다 큽니다';
    }
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      Alert.alert('입력 확인', err);
      return;
    }
    setSaving(true);
    try {
      await updateIdealType({
        age_min:       ageMinN,
        age_max:       ageMaxN,
        height_min:    heightMinN,
        height_max:    heightMaxN,
        smoking_pref:  smoking,
        drinking_pref: drinking,
        religion_pref: religion,
      });
      await reload();
      Alert.alert('저장 완료');
    } catch {
      Alert.alert('오류', '저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  }

  function showLockedInfo() {
    Alert.alert(LOCKED_INFO_TITLE, LOCKED_INFO_BODY);
  }

  function clearAge()    { setAgeMin(''); setAgeMax(''); }
  function clearHeight() { setHeightMin(''); setHeightMax(''); }

  const ageAny    = ageMinN == null && ageMaxN == null;
  const heightAny = heightMinN == null && heightMaxN == null;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <AppText variant="secondary">← 뒤로</AppText>
        </TouchableOpacity>
        <AppText size="lg" weight="semibold">이상형</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <AppText size="sm" variant="secondary" style={styles.intro}>
          비워두면 그 항목은 매칭에서 제약하지 않아요. 인비가 더 자주 도착해요.
        </AppText>

        {/* 나이대 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText size="md" weight="semibold">나이대</AppText>
            <Chip label="상관없음" selected={ageAny} onPress={clearAge} small />
          </View>
          <View style={styles.rangeRow}>
            <TextInput
              value={ageMin}
              onChangeText={t => setAgeMin(t.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              placeholder={`${AGE_BOUNDS.min}`}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.numInput}
            />
            <AppText size="sm" variant="secondary">~</AppText>
            <TextInput
              value={ageMax}
              onChangeText={t => setAgeMax(t.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              placeholder={`${AGE_BOUNDS.max}`}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.numInput}
            />
            <AppText size="sm" variant="secondary">세</AppText>
          </View>
        </View>

        {/* 키 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText size="md" weight="semibold">키</AppText>
            <Chip label="상관없음" selected={heightAny} onPress={clearHeight} small />
          </View>
          <View style={styles.rangeRow}>
            <TextInput
              value={heightMin}
              onChangeText={t => setHeightMin(t.replace(/[^0-9]/g, '').slice(0, 3))}
              keyboardType="number-pad"
              placeholder={`${HEIGHT_BOUNDS.min}`}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.numInput}
            />
            <AppText size="sm" variant="secondary">~</AppText>
            <TextInput
              value={heightMax}
              onChangeText={t => setHeightMax(t.replace(/[^0-9]/g, '').slice(0, 3))}
              keyboardType="number-pad"
              placeholder={`${HEIGHT_BOUNDS.max}`}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.numInput}
            />
            <AppText size="sm" variant="secondary">cm</AppText>
          </View>
        </View>

        {/* 흡연 */}
        <View style={styles.section}>
          <AppText size="md" weight="semibold">흡연</AppText>
          <View style={styles.chipRow}>
            <Chip
              label="상관없음"
              selected={smoking === null}
              onPress={() => setSmoking(null)}
            />
            {FREQUENCY_LEVELS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={smoking === opt.value}
                onPress={() => setSmoking(opt.value)}
              />
            ))}
          </View>
        </View>

        {/* 음주 */}
        <View style={styles.section}>
          <AppText size="md" weight="semibold">음주</AppText>
          <View style={styles.chipRow}>
            <Chip
              label="상관없음"
              selected={drinking === null}
              onPress={() => setDrinking(null)}
            />
            {FREQUENCY_LEVELS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={drinking === opt.value}
                onPress={() => setDrinking(opt.value)}
              />
            ))}
          </View>
        </View>

        {/* 종교 */}
        <View style={styles.section}>
          <AppText size="md" weight="semibold">종교</AppText>
          <View style={styles.chipRow}>
            <Chip
              label="상관없음"
              selected={religion === null}
              onPress={() => setReligion(null)}
            />
            {RELIGION_OPTIONS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={religion === opt.value}
                onPress={() => setReligion(opt.value)}
              />
            ))}
          </View>
        </View>

        {/* 잠금(유료) */}
        <View style={styles.lockedBlock}>
          <View style={styles.lockedHeader}>
            <AppText size="md" weight="semibold">세분화 조건</AppText>
            <View style={styles.lockBadge}>
              <AppText size="xs" style={styles.lockBadgeText}>잠금</AppText>
            </View>
          </View>
          <AppText size="xs" variant="secondary" style={styles.lockedDesc}>
            토큰으로 잠금 해제 시 사용할 수 있어요
          </AppText>

          {LOCKED_PREFS.map(pref => (
            <TouchableOpacity
              key={pref.key}
              style={styles.lockedCard}
              onPress={showLockedInfo}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <AppText size="md" weight="semibold" style={styles.lockedLabel}>
                  {pref.label}
                </AppText>
                <AppText size="xs" variant="secondary" style={{ marginTop: 2 }}>
                  {pref.hint}
                </AppText>
              </View>
              <AppText style={styles.lockIcon}>🔒</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="저장"
          loading={saving}
          disabled={saving}
          onPress={handleSave}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: theme.spacing[5],
    paddingBottom: theme.spacing[10],
  },
  intro: {
    lineHeight: 20,
  },
  section: {
    gap: theme.spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  numInput: {
    width: 84,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing[3],
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.md,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  lockedBlock: {
    marginTop: theme.spacing[4],
    paddingTop: theme.spacing[5],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing[2],
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  lockBadge: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
  },
  lockBadgeText: {
    color: theme.colors.textSecondary,
  },
  lockedDesc: {
    marginBottom: theme.spacing[2],
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing[4],
    opacity: 0.65,
    gap: theme.spacing[3],
  },
  lockedLabel: {
    color: theme.colors.textPrimary,
  },
  lockIcon: {
    fontSize: 18,
  },
  footer: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[8],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
