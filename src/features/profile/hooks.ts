import { useState, useEffect, useCallback } from 'react';
import { getMyProfile, getMyVerifications } from './api';
import type { Profile, VerificationStatus } from './types';

export function useMyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch {
      setError('프로필을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { profile, loading, error, reload, setProfile };
}

export function useMyVerifications() {
  const [verifications, setVerifications] = useState<VerificationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyVerifications();
      setVerifications(data);
    } catch {
      // silent — verifications are optional context
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { verifications, loading, reload };
}
