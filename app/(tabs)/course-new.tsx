import { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { SCENARIO_OPTIONS } from '@/features/courses/constants';
import { createCourse } from '@/features/courses/api';
import type { Scenario } from '@/features/courses/types';
import { theme } from '@/theme';

export default function CourseNewScreen() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!scenario) {
      Alert.alert('시나리오를 골라주세요');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('코스 이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      const c = await createCourse(trimmed, scenario);
      router.replace({ pathname: '/(tabs)/course-edit', params: { id: c.id } });
    } catch {
      Alert.alert('오류', '코스를 만들지 못했어요.');
    } finally {
      setSaving(false);
    }
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
        <AppText size="lg" weight="semibold">새 코스</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <AppText size="sm" variant="secondary" style={styles.sectionLabel}>
          어떤 데이트를 그리세요?
        </AppText>
        <View style={styles.scenarioList}>
          {SCENARIO_OPTIONS.map(opt => {
            const selected = scenario === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.scenarioCard, selected && styles.scenarioSelected]}
                onPress={() => setScenario(opt.value)}
                activeOpacity={0.85}
              >
                <AppText size="md" weight="semibold">{opt.label}</AppText>
                <AppText size="sm" variant="secondary" style={styles.scenarioHint}>
                  {opt.hint}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.nameSection}>
          <TextField
            label="코스 이름"
            value={name}
            onChangeText={setName}
            placeholder="예: 홍대 카페 산책"
            maxLength={30}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="만들기"
          loading={saving}
          disabled={!scenario || !name.trim() || saving}
          onPress={handleCreate}
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
    gap: theme.spacing[4],
  },
  sectionLabel: {
    marginBottom: theme.spacing[1],
  },
  scenarioList: {
    gap: theme.spacing[2],
  },
  scenarioCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: theme.spacing[4],
    gap: theme.spacing[1],
  },
  scenarioSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surface,
  },
  scenarioHint: {
    lineHeight: 18,
  },
  nameSection: {
    marginTop: theme.spacing[4],
  },
  footer: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[8],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
