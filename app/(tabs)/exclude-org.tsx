import { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { useMyOrgMatchSettings } from '@/features/match-prefs/hooks';
import { updateOrgMatchSettings } from '@/features/match-prefs/api';
import { theme } from '@/theme';

export default function ExcludeOrgScreen() {
  const { settings, loading, reload, setSettings } = useMyOrgMatchSettings();
  // 행이 없으면(예외 케이스) 기본값 ON 으로 시작
  const excludeSchool  = settings?.exclude_same_school  ?? true;
  const excludeCompany = settings?.exclude_same_company ?? true;
  const [busy, setBusy] = useState<'school' | 'company' | null>(null);

  useEffect(() => { /* settings 가 바뀌면 자동 반영 */ }, [settings]);

  async function toggle(field: 'exclude_same_school' | 'exclude_same_company') {
    const current = field === 'exclude_same_school' ? excludeSchool : excludeCompany;
    const next = !current;
    setBusy(field === 'exclude_same_school' ? 'school' : 'company');

    // optimistic
    if (settings) {
      setSettings({ ...settings, [field]: next });
    }
    try {
      await updateOrgMatchSettings({ [field]: next });
      await reload();
    } catch {
      Alert.alert('오류', '저장하지 못했어요.');
      await reload(); // 원복
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <AppText variant="secondary">← 뒤로</AppText>
        </TouchableOpacity>
        <AppText size="lg" weight="semibold">같은 학교/회사 제외</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <AppText size="sm" variant="secondary" style={styles.intro}>
          둘 중 한 분이라도 켜두면 같은 학교/회사끼리는 매칭되지 않아요.
          동문·동료를 만나고 싶으면 끄세요.
        </AppText>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AppText size="md" weight="semibold">같은 학교 제외</AppText>
            <AppText size="xs" variant="secondary" style={styles.rowHint}>
              인증된 학교가 동일하면 매칭에서 제외
            </AppText>
          </View>
          {busy === 'school' ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <Switch
              value={excludeSchool}
              onValueChange={() => toggle('exclude_same_school')}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              thumbColor={theme.colors.textPrimary}
            />
          )}
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AppText size="md" weight="semibold">같은 회사 제외</AppText>
            <AppText size="xs" variant="secondary" style={styles.rowHint}>
              인증된 회사가 동일하면 매칭에서 제외
            </AppText>
          </View>
          {busy === 'company' ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <Switch
              value={excludeCompany}
              onValueChange={() => toggle('exclude_same_company')}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              thumbColor={theme.colors.textPrimary}
            />
          )}
        </View>

        <AppText size="xs" variant="secondary" style={styles.footnote}>
          상대방의 설정도 함께 적용돼요. 한쪽이라도 켜져 있으면 매칭에서 빠집니다.
        </AppText>
      </View>
    </View>
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
    gap: theme.spacing[4],
  },
  intro: {
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing[4],
  },
  rowHint: {
    marginTop: 2,
  },
  footnote: {
    lineHeight: 18,
    marginTop: theme.spacing[2],
  },
});
