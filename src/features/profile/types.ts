export type FaceType = 'dog' | 'cat' | 'fox' | 'rabbit' | 'deer' | 'bear' | 'wolf' | 'squirrel';
export type FrequencyLevel = 'none' | 'sometimes' | 'social' | 'often';
export type ReligionType = 'no_religion' | 'christian' | 'catholic' | 'buddhist' | 'other';
export type OrgType = 'school' | 'company';

export interface IntroPrompt {
  prompt: string;
  answer: string;
}

export interface Profile {
  user_id: string;
  status: 'active' | 'suspended' | 'deleted';
  gender: 'male' | 'female' | null;
  birth_year: number | null;
  height_cm: number | null;
  region: string | null;
  active_regions: string[];
  mbti: string | null;
  face_type: FaceType | null;
  smoking: FrequencyLevel | null;
  drinking: FrequencyLevel | null;
  religion: ReligionType | null;
  intro_prompts: IntroPrompt[];
  tags: string[];
  manner_score: number;
  completeness: number;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationStatus {
  type: OrgType;
  verified_at: string;
}

export interface ProfileUpdateInput {
  height_cm?: number | null;
  region?: string | null;
  active_regions?: string[] | null;
  mbti?: string | null;
  face_type?: FaceType | null;
  smoking?: FrequencyLevel | null;
  drinking?: FrequencyLevel | null;
  religion?: ReligionType | null;
  intro_prompts?: IntroPrompt[] | null;
  tags?: string[] | null;
}
