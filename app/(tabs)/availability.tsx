import { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useMyAvailableTimes } from '@/features/courses/hooks';
import { setAvailableTimes } from '@/features/courses/api';
import { SLOT_INFO, DAY_LABELS } from '@/features/courses/constants';
import type { TimeSlot } from '@/features/courses/types';
import { theme } from '@/theme';

function keyOf(day: number, slot: TimeSlot): string {
  return `${day}-${slot}`;
}

export default function AvailabilityScreen() {
  const { times, loading, reload } = useMyAvailableTimes();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = new Set<string>();
    for (const t of times) s.add(keyOf(t.day_of_week, t.slot));
    setSelected(s);
  }, [times]);

  function toggle(day: number, slot: TimeSlot) {
    setSelected(prev => {
      const next = new Set(prev);
      const k = keyOf(day, slot);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const arr: { day_of_week: number; slot: TimeSlot }[] = [];
      for (const k of selected) {
        const [d, s] = k.split('-');
        arr.push({ day_of_week: Number(d), slot: s as TimeSlot });
      }
      await setAvailableTimes(arr);
      await reload();
      Alert.alert('저장 완료');
    } catch {
      Alert.alert('오류', '저장하지 못했어요.');
    } finally {
      setSaving(false);
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
        <AppText size="lg" weight="semibold">가용 시간</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <AppText size="sm" variant="secondary" style={styles.intro}>
          만남이 가능한 요일·시간대를 골라주세요. 상대도 겹치는 슬롯이 있어야 인비가 도착해요.
        </AppText>

        <View style={styles.legend}>
          {SLOT_INFO.map(info => (
            <View key={info.slot} style={styles.legendItem}>
              <AppText size="sm" weight="semibold">{info.label}</AppText>
              <AppText size="xs" variant="secondary">{info.desc}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          <View style={styles.gridHeader}>
            <View style={styles.gridDayCell} />
            {SLOT_INFO.map(info => (
              <View key={info.slot} style={styles.gridSlotHeader}>
                <AppText size="xs" variant="secondary">{info.label}</AppText>
              </View>
            ))}
          </View>

          {DAY_LABELS.map((day, idx) => (
            <View key={idx} style={styles.gridRow}>
              <View style={styles.gridDayCell}>
                <AppText size="sm" weight="semibold">{day}</AppText>
              </View>
              {SLOT_INFO.map(info => {
                const on = selected.has(keyOf(idx, info.slot));
                return (
                  <TouchableOpacity
                    key={info.slot}
                    style={[styles.gridCell, on && styles.gridCellOn]}
                    onPress={() => toggle(idx, info.slot)}
                    activeOpacity={0.7}
                  >
                    {on && <View style={styles.gridDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <AppText size="xs" variant="secondary" style={styles.footnote}>
          선택한 슬롯 {selected.size}개
        </AppText>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="저장"
          loading={saving}
          disabled={saving}
          onPress={handleSave}
        />
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
  legend: {
    flexDirection: 'row',
    gap: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing[2],
  },
  legendItem: {
    flex: 1,
  },
  grid: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: theme.spacing[2],
    gap: theme.spacing[1],
  },
  gridHeader: {
    flexDirection: 'row',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridDayCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridSlotHeader: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCell: {
    flex: 1,
    height: 44,
    marginHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  gridCellOn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  gridDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  footnote: {
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[8],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
