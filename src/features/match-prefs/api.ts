import { supabase } from '@/lib/supabase';
import type { IdealType, IdealTypeInput, OrgMatchSettings } from './types';

export async function getMyIdealType(): Promise<IdealType | null> {
  const { data, error } = await supabase
    .from('ideal_types')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as IdealType | null;
}

export async function updateIdealType(input: IdealTypeInput): Promise<void> {
  // 1A update_profile 과 동일 우회: 자동 생성 Args 타입이 NULL 을 받아들이지 않아
  // (params 는 default null 로 옵셔널이지만 supabase-js Args 는 `number | undefined`)
  // Record<string, unknown> 으로 한 번 받아 NULL = "상관없음" 의미를 그대로 전달.
  const args: Record<string, unknown> = {
    p_age_min:       input.age_min,
    p_age_max:       input.age_max,
    p_height_min:    input.height_min,
    p_height_max:    input.height_max,
    p_smoking_pref:  input.smoking_pref,
    p_drinking_pref: input.drinking_pref,
    p_religion_pref: input.religion_pref,
  };
  const { error } = await supabase.rpc('update_ideal_type', args);
  if (error) throw error;
}

export async function getMyOrgMatchSettings(): Promise<OrgMatchSettings | null> {
  const { data, error } = await supabase
    .from('org_match_settings')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as OrgMatchSettings | null;
}

export async function updateOrgMatchSettings(
  fields: Partial<Pick<OrgMatchSettings, 'exclude_same_school' | 'exclude_same_company'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');
  const { error } = await supabase
    .from('org_match_settings')
    .upsert({ user_id: user.id, ...fields }, { onConflict: 'user_id' });
  if (error) throw error;
}
