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
  const { error } = await supabase.rpc('update_ideal_type', {
    p_age_min:       input.age_min,
    p_age_max:       input.age_max,
    p_height_min:    input.height_min,
    p_height_max:    input.height_max,
    p_smoking_pref:  input.smoking_pref,
    p_drinking_pref: input.drinking_pref,
    p_religion_pref: input.religion_pref,
  });
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
