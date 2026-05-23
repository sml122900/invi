import { useState, useEffect, useCallback } from 'react';
import { getMyIdealType, getMyOrgMatchSettings } from './api';
import type { IdealType, OrgMatchSettings } from './types';

export function useMyIdealType() {
  const [idealType, setIdealType] = useState<IdealType | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setIdealType(await getMyIdealType());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { idealType, loading, reload };
}

export function useMyOrgMatchSettings() {
  const [settings, setSettings] = useState<OrgMatchSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await getMyOrgMatchSettings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { settings, loading, reload, setSettings };
}
