import { supabase } from '@/lib/supabase';
import type { Profile, ProfileUpdateInput, VerificationStatus, OrgType } from './types';

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function completeOnboarding(gender: 'male' | 'female', birthYear: number) {
  const { error } = await supabase.rpc('complete_onboarding', {
    p_gender: gender,
    p_birth_year: birthYear,
  });

  if (error) throw error;
}

export async function updateProfile(fields: ProfileUpdateInput): Promise<{ completeness: number }> {
  const args: Record<string, unknown> = {};
  if (fields.height_cm      !== undefined) args.p_height_cm      = fields.height_cm;
  if (fields.region          !== undefined) args.p_region          = fields.region;
  if (fields.active_regions  !== undefined) args.p_active_regions  = fields.active_regions;
  if (fields.mbti            !== undefined) args.p_mbti            = fields.mbti;
  if (fields.face_type       !== undefined) args.p_face_type       = fields.face_type;
  if (fields.smoking         !== undefined) args.p_smoking         = fields.smoking;
  if (fields.drinking        !== undefined) args.p_drinking        = fields.drinking;
  if (fields.religion        !== undefined) args.p_religion        = fields.religion;
  if (fields.intro_prompts   !== undefined) args.p_intro_prompts   = fields.intro_prompts;
  if (fields.tags            !== undefined) args.p_tags            = fields.tags;

  const { data, error } = await supabase.rpc('update_profile', args);
  if (error) throw error;
  return data as { completeness: number };
}

export async function getMyVerifications(): Promise<VerificationStatus[]> {
  const { data, error } = await supabase.rpc('get_my_verifications');
  if (error) throw error;
  return (data ?? []) as unknown as VerificationStatus[];
}

export async function requestOrgVerification(
  email: string,
  type: OrgType
): Promise<{ code?: string }> {
  const { data, error } = await supabase.rpc('request_org_verification', {
    p_email: email,
    p_type: type,
  });
  if (error) throw error;
  return (data ?? {}) as { code?: string };
}

export async function confirmOrgVerification(code: string): Promise<{ type: OrgType }> {
  const { data, error } = await supabase.rpc('confirm_org_verification', {
    p_code: code,
  });
  if (error) throw error;
  return data as { type: OrgType };
}
