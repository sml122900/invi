import { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { completeOnboarding } from '@/features/profile/api';
import { theme } from '@/theme';

const CURRENT_YEAR = new Date().getFullYear();

function onboardingErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return '오류가 발생했습니다. 다시 시도해 주세요.';
  const msg = error.message;

  if (msg.includes('under_age')) return '만 19세 이상만 가입할 수 있습니다.';
  if (msg.includes('invalid_gender')) return '성별을 선택해 주세요.';
  if (msg.includes('not_authenticated')) return '로그인이 필요합니다.';

  return '오류가 발생했습니다. 다시 시도해 주세요.';
}

export default function BasicInfoScreen() {
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [birthYearText, setBirthYearText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!gender) return '성별을 선택해 주세요.';
    const year = parseInt(birthYearText, 10);
    if (isNaN(year) || birthYearText.length !== 4) return '생년을 4자리 연도로 입력해 주세요. (예: 1995)';
    if (CURRENT_YEAR - year < 19) return '만 19세 이상만 이용할 수 있습니다.';
    if (year < 1900 || year > CURRENT_YEAR) return '올바른 연도를 입력해 주세요.';
    return null;
  }

  async function handleSubmit() {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await completeOnboarding(gender!, parseInt(birthYearText, 10));
      router.replace('/(tabs)');
    } catch (e) {
      setError(onboardingErrorMessage(e));
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
        <AppText size="2xl" weight="semibold" style={styles.title}>
          잠깐, 몇 가지만{'\n'}알려주세요
        </AppText>
        <AppText size="md" variant="secondary" style={styles.subtitle}>
          가입 후 변경되지 않는 정보예요.{'\n'}신중하게 입력해 주세요.
        </AppText>

        <View style={styles.section}>
          <AppText size="sm" weight="medium" style={styles.sectionLabel}>
            성별
          </AppText>
          <View style={styles.genderRow}>
            <GenderButton
              label="남성"
              selected={gender === 'male'}
              onPress={() => setGender('male')}
            />
            <GenderButton
              label="여성"
              selected={gender === 'female'}
              onPress={() => setGender('female')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <TextField
            label="태어난 연도"
            value={birthYearText}
            onChangeText={setBirthYearText}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="예: 1995"
          />
        </View>

        {error ? (
          <AppText size="sm" style={styles.errorText}>
            {error}
          </AppText>
        ) : null}

        <Button
          label="다음으로"
          onPress={handleSubmit}
          loading={loading}
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GenderButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.genderBtn, selected && styles.genderBtnSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <AppText
        size="md"
        weight={selected ? 'semibold' : 'regular'}
        style={selected ? styles.genderBtnTextSelected : undefined}
      >
        {label}
      </AppText>
    </TouchableOpacity>
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
  title: { lineHeight: 36 },
  subtitle: { marginTop: theme.spacing[3], marginBottom: theme.spacing[10], lineHeight: 22 },
  section: { marginBottom: theme.spacing[5] },
  sectionLabel: { color: theme.colors.textSecondary, marginBottom: theme.spacing[2] },
  genderRow: { flexDirection: 'row', gap: theme.spacing[3] },
  genderBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}18`,
  },
  genderBtnTextSelected: { color: theme.colors.accent },
  errorText: { color: theme.colors.error, marginBottom: theme.spacing[3] },
  button: { marginTop: theme.spacing[2] },
});
