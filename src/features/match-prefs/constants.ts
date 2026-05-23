import type { LockedPref } from './types';

// 입력 범위 가드 (UI 검증·플레이스홀더용). RPC 측에서 한 번 더 검증.
export const AGE_BOUNDS    = { min: 20, max: 60 } as const;
export const HEIGHT_BOUNDS = { min: 140, max: 210 } as const;

// 잠금(유료) 조건 — 1C 에서는 표시·안내만, DB 변경 없음
export const LOCKED_PREFS: { key: LockedPref; label: string; hint: string }[] = [
  { key: 'school',  label: '학벌',       hint: '대학·학위 수준으로 매칭' },
  { key: 'company', label: '직장',       hint: '산업·회사 규모로 매칭' },
  { key: 'salary',  label: '연봉대',     hint: '연봉 구간으로 매칭' },
];

export const LOCKED_INFO_TITLE = '토큰으로 잠금 해제';
export const LOCKED_INFO_BODY  =
  '토큰으로 잠금 해제하면 학벌·직장·연봉 조건으로 매칭할 수 있어요.\n' +
  '결제는 곧 열려요. 지금은 기본 조건으로 인비를 받아볼 수 있어요.';
