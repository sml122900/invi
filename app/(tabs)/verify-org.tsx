import { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { requestOrgVerification, confirmOrgVerification } from '@/features/profile/api';
import { theme } from '@/theme';
import type { OrgType } from '@/features/profile/types';

type Step = 'input' | 'code' | 'done';

const ERROR_MESSAGES: Record<string, string> = {
  generic_email:        '학교 또는 직장 이메일이 아닌 범용 메일 주소는 사용할 수 없어요.',
  invalid_email_format: '이메일 형식이 올바르지 않아요.',
  not_school_domain:    '학교 이메일이 아닌 것 같아요. (예: *.ac.kr)',
  not_company_domain:   '이미 학교 이메일로 감지됐어요. 직장으로 변경해 주세요.',
  rate_limited:         '1분 후 다시 요청해 주세요.',
  invalid_type:         '학교 또는 직장을 선택해 주세요.',
  invalid_code:         '인증 코드가 올바르지 않아요.',
  code_expired:         '인증 코드가 만료됐어요. 다시 요청해 주세요.',
  too_many_attempts:    '시도 횟수를 초과했어요. 다시 요청해 주세요.',
  no_pending_verification: '인증 요청을 먼저 해주세요.',
};

function parseError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  for (const [key, text] of Object.entries(ERROR_MESSAGES)) {
    if (msg.includes(key)) return text;
  }
  return '오류가 발생했어요. 다시 시도해 주세요.';
}

export default function VerifyOrgScreen() {
  const [orgType, setOrgType] = useState<OrgType>('school');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null); // 개발 모드 코드 노출
  const [verifiedType, setVerifiedType] = useState<OrgType | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleRequest() {
    if (!email.trim()) {
      Alert.alert('이메일을 입력해 주세요.');
      return;
    }
    setRequesting(true);
    try {
      const result = await requestOrgVerification(email.trim(), orgType);
      // 서버가 개발 모드일 때만 code 반환. 클라이언트는 그냥 노출.
      setDevCode(result.code ?? null);
      setStep('code');
    } catch (e) {
      Alert.alert(parseError(e));
    } finally {
      setRequesting(false);
    }
  }

  async function handleConfirm() {
    if (code.trim().length !== 6) {
      Alert.alert('6자리 코드를 입력해 주세요.');
      return;
    }
    setConfirming(true);
    try {
      const result = await confirmOrgVerification(code.trim());
      setVerifiedType(result.type);
      setStep('done');
    } catch (e) {
      Alert.alert(parseError(e));
    } finally {
      setConfirming(false);
    }
  }

  function handleRetry() {
    setStep('input');
    setCode('');
    setDevCode(null);
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
          <AppText size="lg" weight="semibold">학교/직장 인증</AppText>
          <View style={{ width: 36 }} />
        </View>

        <AppText variant="secondary" style={styles.desc}>
          학교 또는 직장 이메일로 인증하면 매칭에서 신뢰 배지가 표시돼요.
          조직명은 상대방에게 노출되지 않아요.
        </AppText>

        {/* ── Step: input ── */}
        {step === 'input' && (
          <View style={styles.card}>
            <AppText size="sm" variant="secondary" style={styles.fieldLabel}>인증 유형</AppText>
            <View style={styles.typeRow}>
              <Chip
                label="학교"
                selected={orgType === 'school'}
                onPress={() => setOrgType('school')}
                style={styles.typeChip}
              />
              <Chip
                label="직장"
                selected={orgType === 'company'}
                onPress={() => setOrgType('company')}
                style={styles.typeChip}
              />
            </View>

            <AppText size="sm" variant="secondary" style={[styles.fieldLabel, { marginTop: theme.spacing[4] }]}>
              {orgType === 'school' ? '학교 이메일' : '직장 이메일'}
            </AppText>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={
                orgType === 'school'
                  ? '예: username@yonsei.ac.kr'
                  : '예: username@samsung.com'
              }
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <AppText size="xs" variant="secondary" style={styles.hint}>
              {orgType === 'school'
                ? 'ac.kr 도메인 이메일만 학교로 인증됩니다.'
                : 'gmail, naver 등 범용 메일은 사용할 수 없어요.'}
            </AppText>

            <Button
              label="인증 코드 받기"
              onPress={handleRequest}
              loading={requesting}
              style={{ marginTop: theme.spacing[4] }}
            />
          </View>
        )}

        {/* ── Step: code ── */}
        {step === 'code' && (
          <View style={styles.card}>
            {/* 개발 모드 코드 노출 배너 — 서버가 code 반환할 때만 표시 */}
            {devCode && (
              <View style={styles.devBanner}>
                <AppText size="xs" style={styles.devBannerLabel}>개발 모드 — 인증 코드</AppText>
                <AppText size="xl" weight="semibold" style={styles.devCode}>{devCode}</AppText>
              </View>
            )}
            {!devCode && (
              <AppText size="sm" variant="secondary" style={styles.codeSentMsg}>
                {email} 로 인증 코드를 보냈어요.{'\n'}
                이메일을 확인하거나 Supabase Studio에서 pending 행을 확인하세요.
              </AppText>
            )}

            <AppText size="sm" variant="secondary" style={styles.fieldLabel}>
              인증 코드 (6자리)
            </AppText>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={text => setCode(text.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              maxLength={6}
            />

            <AppText size="xs" variant="secondary" style={styles.hint}>
              코드는 요청 후 10분간 유효합니다. 5회 틀리면 새로 요청해야 해요.
            </AppText>

            <Button
              label="확인"
              onPress={handleConfirm}
              loading={confirming}
              style={{ marginTop: theme.spacing[4] }}
            />
            <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
              <AppText size="sm" variant="secondary">다시 요청하기</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && (
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <AppText style={styles.successEmoji}>✓</AppText>
            </View>
            <AppText size="lg" weight="semibold" style={styles.successTitle}>
              {verifiedType === 'school' ? '학교' : '직장'} 인증 완료
            </AppText>
            <AppText variant="secondary" style={styles.successDesc}>
              인증이 완료됐어요. 조직명은 상대방에게 노출되지 않으며,
              프로필에 "{verifiedType === 'school' ? '학교' : '직장'} 인증됨" 배지가 표시됩니다.
            </AppText>
            <Button
              label="프로필로 돌아가기"
              onPress={() => router.replace('/(tabs)/profile')}
              style={{ marginTop: theme.spacing[6] }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: theme.spacing[12] },
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
  desc: {
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[4],
    lineHeight: 22,
  },
  card: {
    marginHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing[5],
  },
  fieldLabel: { marginBottom: theme.spacing[2] },
  typeRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  typeChip: { flex: 1 },
  input: {
    height: 52,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: theme.spacing[4],
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: theme.typography.size.xl,
  },
  hint: {
    marginTop: theme.spacing[2],
    lineHeight: 18,
  },
  codeSentMsg: {
    lineHeight: 22,
    marginBottom: theme.spacing[4],
  },
  devBanner: {
    backgroundColor: '#1A2B1A',
    borderRadius: 8,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D5A2D',
  },
  devBannerLabel: {
    color: '#6DBF6D',
    marginBottom: theme.spacing[1],
  },
  devCode: {
    color: '#6DBF6D',
    letterSpacing: 6,
  },
  retryBtn: {
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing[4],
  },
  successEmoji: {
    fontSize: 28,
    color: '#fff',
  },
  successTitle: {
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  successDesc: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
