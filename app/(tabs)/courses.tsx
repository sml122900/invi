import { useState } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useMyCourses } from '@/features/courses/hooks';
import { deleteCourse, updateCourse } from '@/features/courses/api';
import { SCENARIO_OPTIONS } from '@/features/courses/constants';
import type { Course } from '@/features/courses/types';
import { theme } from '@/theme';

function scenarioLabel(scenario: string): string {
  return SCENARIO_OPTIONS.find(s => s.value === scenario)?.label ?? scenario;
}

export default function CoursesScreen() {
  const { courses, loading, reload } = useMyCourses();
  const [acting, setActing] = useState<string | null>(null);

  async function handleDelete(course: Course) {
    Alert.alert('코스 삭제', `'${course.name}'을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setActing(course.id);
          try {
            await deleteCourse(course.id);
            await reload();
          } catch {
            Alert.alert('오류', '삭제하지 못했어요.');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  }

  async function handleTogglePublic(course: Course) {
    setActing(course.id);
    try {
      await updateCourse(course.id, { is_public: !course.is_public });
      await reload();
    } catch {
      Alert.alert('오류', '변경하지 못했어요.');
    } finally {
      setActing(null);
    }
  }

  function renderItem({ item }: { item: Course }) {
    const busy = acting === item.id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/(tabs)/course-edit', params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.scenarioBadge}>
            <AppText size="xs" style={styles.scenarioText}>
              {scenarioLabel(item.scenario)}
            </AppText>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
            <AppText size="sm" style={styles.deleteBtn}>삭제</AppText>
          </TouchableOpacity>
        </View>

        <AppText size="md" weight="semibold" style={styles.courseName}>
          {item.name}
        </AppText>

        <View style={styles.cardBottom}>
          <AppText size="sm" variant="secondary">
            {item.is_public ? '매칭 카드에 공개' : '비공개'}
          </AppText>
          {busy ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Switch
              value={item.is_public}
              onValueChange={() => handleTogglePublic(item)}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              thumbColor={theme.colors.textPrimary}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <AppText variant="secondary">← 뒤로</AppText>
        </TouchableOpacity>
        <AppText size="lg" weight="semibold">내 코스</AppText>
        <TouchableOpacity onPress={() => router.push('/(tabs)/course-new')} hitSlop={8}>
          <AppText style={{ color: theme.colors.accent }} weight="semibold">+ 새 코스</AppText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.center}>
          <AppText variant="secondary" style={styles.emptyText}>
            아직 코스가 없어요
          </AppText>
          <Button
            label="첫 코스 만들기"
            style={styles.emptyBtn}
            onPress={() => router.push('/(tabs)/course-new')}
          />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={styles.footer}>
        <Button
          label="가용 시간 설정"
          variant="secondary"
          onPress={() => router.push('/(tabs)/availability')}
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
  list: {
    padding: theme.spacing[5],
    gap: theme.spacing[3],
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scenarioBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 3,
  },
  scenarioText: {
    color: theme.colors.textSecondary,
  },
  deleteBtn: {
    color: theme.colors.error,
  },
  courseName: {
    lineHeight: 24,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[4],
  },
  emptyText: {
    textAlign: 'center',
  },
  emptyBtn: {
    minWidth: 180,
  },
  footer: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[8],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
