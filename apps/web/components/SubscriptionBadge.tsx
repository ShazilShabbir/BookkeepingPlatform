import { useEffect, useState } from 'react';
import clsx from 'clsx';

export default function SubscriptionBadge() {
  const [data, setData] = useState<{ tier: string; label: string; status: string } | null>(null);

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const { tier, status } = data;

  if (tier === 'free') {
    return (
      <a href="/pricing" className="text-xs font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2">
        Free Plan — Upgrade
      </a>
    );
  }

  if (status === 'past_due') {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        Past Due
      </span>
    );
  }

  return (
    <span className={clsx(
      'text-xs font-semibold px-2 py-0.5 rounded-full',
      tier === 'pro' && 'bg-primary-100 text-primary-700',
      tier === 'business' && 'bg-amber-100 text-amber-800',
    )}>
      {data.label}
    </span>
  );
}
