import type { FrequencyLevel, ReligionType } from '@/features/profile/types';

// null = "상관없음" (DB 컬럼은 그대로 NULL)
export interface IdealType {
  user_id: string;
  age_min: number | null;
  age_max: number | null;
  height_min: number | null;
  height_max: number | null;
  smoking_pref: FrequencyLevel | null;
  drinking_pref: FrequencyLevel | null;
  religion_pref: ReligionType | null;
  // 세분화(잠금) — 1C 에선 표시 안 함, 변경 안 함
  school_pref: string | null;
  company_pref: string | null;
  salary_pref: string | null;
  paid_until: string | null;
  updated_at: string;
}

export interface IdealTypeInput {
  age_min: number | null;
  age_max: number | null;
  height_min: number | null;
  height_max: number | null;
  smoking_pref: FrequencyLevel | null;
  drinking_pref: FrequencyLevel | null;
  religion_pref: ReligionType | null;
}

export interface OrgMatchSettings {
  user_id: string;
  exclude_same_school: boolean;
  exclude_same_company: boolean;
  updated_at: string;
}

export type LockedPref = 'school' | 'company' | 'salary';
