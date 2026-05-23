import { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Chip } from '@/components/ui/Chip';
import { useCourse } from '@/features/courses/hooks';
import {
  updateCourse, deleteCourse, addPlace, deletePlace, reorderPlaces, searchPlaces,
} from '@/features/courses/api';
import {
  CATEGORY_OPTIONS, CATEGORY_LABEL, SCENARIO_OPTIONS,
} from '@/features/courses/constants';
import type { Place, PlaceCategory, SearchResult } from '@/features/courses/types';
import { theme } from '@/theme';

const BUDGET_OPTIONS: { value: string; label: string }[] = [
  { value: '5',     label: '~5만원' },
  { value: '10',    label: '~10만원' },
  { value: '15',    label: '~15만원' },
  { value: 'dutch', label: '더치페이' },
];

export default function CourseEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? null;
  const { course, loading, reload } = useCourse(id);

  const [name, setName] = useState('');
  const [budget, setBudget] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyPlaceId, setBusyPlaceId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!course) return;
    setName(course.name);
    setBudget(course.budget_range);
    setDuration(course.duration_min ? String(course.duration_min) : '');
    setIsPublic(course.is_public);
  }, [course]);

  const scenarioLabel =
    SCENARIO_OPTIONS.find(s => s.value === course?.scenario)?.label ?? course?.scenario ?? '';

  async function handleSaveMeta() {
    if (!course) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('코스 이름을 입력해주세요');
      return;
    }
    const durNum = duration.trim() ? Number(duration.trim()) : NaN;
    setSaving(true);
    try {
      await updateCourse(course.id, {
        name: trimmedName,
        budget_range: budget,
        duration_min: Number.isFinite(durNum) ? durNum : null,
        is_public: isPublic,
      });
      await reload();
      Alert.alert('저장 완료');
    } catch {
      Alert.alert('오류', '저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMovePlace(place: Place, direction: -1 | 1) {
    if (!course) return;
    const list = course.places;
    const idx = list.findIndex(p => p.id === place.id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const a = list[idx];
    const b = list[targetIdx];
    setBusyPlaceId(place.id);
    try {
      await reorderPlaces(course.id, [
        { id: a.id, order_index: b.order_index },
        { id: b.id, order_index: a.order_index },
      ]);
      await reload();
    } catch {
      Alert.alert('오류', '순서를 바꾸지 못했어요.');
    } finally {
      setBusyPlaceId(null);
    }
  }

  function confirmDeletePlace(place: Place) {
    Alert.alert('장소 삭제', `'${place.name}'을 코스에서 뺄까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setBusyPlaceId(place.id);
          try {
            await deletePlace(place.id);
            await reload();
          } catch {
            Alert.alert('오류', '삭제하지 못했어요.');
          } finally {
            setBusyPlaceId(null);
          }
        },
      },
    ]);
  }

  function confirmDeleteCourse() {
    if (!course) return;
    Alert.alert('코스 삭제', '이 코스 전체를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCourse(course.id);
            router.back();
          } catch {
            Alert.alert('오류', '삭제하지 못했어요.');
          }
        },
      },
    ]);
  }

  async function handlePickFromSearch(result: SearchResult) {
    if (!course) return;
    const nextOrder = course.places.length;
    try {
      await addPlace(course.id, result, nextOrder);
      await reload();
      setSearchOpen(false);
    } catch {
      Alert.alert('오류', '장소를 추가하지 못했어요.');
    }
  }

  if (loading || !course) {
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
        <AppText size="lg" weight="semibold">코스 편집</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.scenarioRow}>
          <View style={styles.scenarioBadge}>
            <AppText size="xs" style={styles.scenarioBadgeText}>{scenarioLabel}</AppText>
          </View>
        </View>

        <TextField
          label="코스 이름"
          value={name}
          onChangeText={setName}
          maxLength={30}
        />

        <View style={styles.metaSection}>
          <AppText size="sm" variant="secondary" style={styles.metaLabel}>예산</AppText>
          <View style={styles.chipRow}>
            {BUDGET_OPTIONS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={budget === opt.value}
                onPress={() => setBudget(budget === opt.value ? null : opt.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.metaSection}>
          <AppText size="sm" variant="secondary" style={styles.metaLabel}>예상 소요 (분)</AppText>
          <TextInput
            value={duration}
            onChangeText={t => setDuration(t.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="예: 180"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.numberInput}
          />
        </View>

        <View style={styles.metaSection}>
          <View style={styles.publicRow}>
            <View style={{ flex: 1 }}>
              <AppText size="sm" weight="semibold">매칭 카드에 공개</AppText>
              <AppText size="xs" variant="secondary" style={{ marginTop: 2 }}>
                꺼두면 이 코스는 인비에 등장하지 않아요
              </AppText>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              thumbColor={theme.colors.textPrimary}
            />
          </View>
        </View>

        <View style={styles.placesHeader}>
          <AppText size="md" weight="semibold">장소</AppText>
          <TouchableOpacity onPress={() => setSearchOpen(true)} hitSlop={8}>
            <AppText style={{ color: theme.colors.accent }} weight="semibold">+ 추가</AppText>
          </TouchableOpacity>
        </View>

        {course.places.length === 0 ? (
          <AppText size="sm" variant="secondary" style={styles.emptyPlaces}>
            아직 장소가 없어요. + 추가로 첫 장소를 골라보세요.
          </AppText>
        ) : (
          <View style={styles.placesList}>
            {course.places.map((p, idx) => {
              const busy = busyPlaceId === p.id;
              return (
                <View key={p.id} style={styles.placeCard}>
                  <View style={styles.placeOrder}>
                    <AppText size="sm" weight="semibold" style={styles.placeOrderText}>
                      {idx + 1}
                    </AppText>
                  </View>
                  <View style={styles.placeBody}>
                    <AppText size="md" weight="semibold" numberOfLines={1}>{p.name}</AppText>
                    <AppText size="xs" variant="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                      {CATEGORY_LABEL[p.category]}
                      {p.district ? ` · ${p.district}` : ''}
                      {p.stay_minutes ? ` · ${p.stay_minutes}분` : ''}
                    </AppText>
                  </View>
                  <View style={styles.placeActions}>
                    {busy ? (
                      <ActivityIndicator color={theme.colors.accent} />
                    ) : (
                      <>
                        <TouchableOpacity
                          hitSlop={6}
                          disabled={idx === 0}
                          onPress={() => handleMovePlace(p, -1)}
                        >
                          <AppText style={[styles.moveBtn, idx === 0 && styles.moveBtnDisabled]}>↑</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          hitSlop={6}
                          disabled={idx === course.places.length - 1}
                          onPress={() => handleMovePlace(p, 1)}
                        >
                          <AppText
                            style={[styles.moveBtn, idx === course.places.length - 1 && styles.moveBtnDisabled]}
                          >
                            ↓
                          </AppText>
                        </TouchableOpacity>
                        <TouchableOpacity hitSlop={6} onPress={() => confirmDeletePlace(p)}>
                          <AppText size="sm" style={styles.deleteBtn}>삭제</AppText>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.deleteCourseBtn}
          onPress={confirmDeleteCourse}
          activeOpacity={0.7}
        >
          <AppText style={{ color: theme.colors.error }} weight="semibold">코스 삭제</AppText>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="저장"
          loading={saving}
          disabled={saving}
          onPress={handleSaveMeta}
        />
      </View>

      <SearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={handlePickFromSearch}
      />
    </KeyboardAvoidingView>
  );
}

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onPick: (r: SearchResult) => void;
}

function SearchModal({ visible, onClose, onPick }: SearchModalProps) {
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCategory(null);
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  }, [visible]);

  async function handleSearch() {
    const base = query.trim();
    if (!base) return;
    const finalQuery = category ? `${base} ${CATEGORY_LABEL[category]}` : base;
    setLoading(true);
    try {
      const res = await searchPlaces(finalQuery);
      setResults(res);
      setSearched(true);
    } catch {
      Alert.alert('검색 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <AppText variant="secondary">닫기</AppText>
          </TouchableOpacity>
          <AppText size="lg" weight="semibold">장소 검색</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchBody}>
          <AppText size="sm" variant="secondary" style={styles.metaLabel}>카테고리 (선택)</AppText>
          <View style={styles.chipRow}>
            {CATEGORY_OPTIONS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={category === opt.value}
                onPress={() => setCategory(category === opt.value ? null : opt.value)}
              />
            ))}
          </View>

          <View style={styles.searchInputRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="예: 홍대 술집, 성수 카페"
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]}
              disabled={!query.trim() || loading}
              onPress={handleSearch}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <AppText weight="semibold" style={{ color: theme.colors.background }}>검색</AppText>
              )}
            </TouchableOpacity>
          </View>

          {searched && !loading && results.length === 0 && (
            <AppText size="sm" variant="secondary" style={styles.emptyPlaces}>
              검색 결과가 없어요.
            </AppText>
          )}

          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => onPick(item)}
                activeOpacity={0.8}
              >
                <AppText size="md" weight="semibold" numberOfLines={1}>{item.name}</AppText>
                <AppText size="xs" variant="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                  {CATEGORY_LABEL[item.category]}
                  {item.naverCategory ? ` · ${item.naverCategory}` : ''}
                </AppText>
                <AppText size="xs" variant="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                  {item.roadAddress || item.address}
                </AppText>
              </TouchableOpacity>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingBottom: theme.spacing[10],
  },
  scenarioRow: {
    flexDirection: 'row',
  },
  scenarioBadge: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  scenarioBadgeText: {
    color: theme.colors.textSecondary,
  },
  metaSection: {
    gap: theme.spacing[2],
  },
  metaLabel: {
    marginBottom: theme.spacing[1],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  numberInput: {
    height: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: theme.spacing[4],
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: theme.spacing[4],
  },
  placesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing[2],
  },
  emptyPlaces: {
    textAlign: 'center',
    paddingVertical: theme.spacing[6],
  },
  placesList: {
    gap: theme.spacing[2],
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing[3],
    gap: theme.spacing[3],
  },
  placeOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: theme.colors.textSecondary,
  },
  placeBody: {
    flex: 1,
  },
  placeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  moveBtn: {
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  deleteBtn: {
    color: theme.colors.error,
  },
  deleteCourseBtn: {
    alignSelf: 'center',
    marginTop: theme.spacing[6],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  footer: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[8],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBody: {
    flex: 1,
    padding: theme.spacing[5],
    gap: theme.spacing[3],
  },
  searchInputRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: theme.spacing[4],
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchBtn: {
    height: 48,
    paddingHorizontal: theme.spacing[5],
    borderRadius: 12,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
  resultsList: {
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  resultItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
