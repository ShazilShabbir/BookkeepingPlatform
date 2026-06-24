import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { Feature } from './tiers';

export function useFeatureGate(userId: string, feature: Feature) {
  const { data: session } = useSession();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!userId || !session?.user) { setAllowed(false); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/user/feature-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature }),
      });
      const json = await res.json();
      setAllowed(json.allowed === true);
    } catch {
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  }, [userId, feature, session]);

  useEffect(() => { check(); }, [check]);

  return { allowed, loading, recheck: check };
}
