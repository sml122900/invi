import { supabase } from '@/lib/supabase';

export async function getMyProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('gender, birth_year')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function completeOnboarding(gender: 'male' | 'female', birthYear: number) {
  const { error } = await supabase.rpc('complete_onboarding', {
    p_gender: gender,
    p_birth_year: birthYear,
  });

  if (error) throw error;
}
