import { memo, useEffect, useState } from 'react';
import { Card, ChartSkeleton } from '@/components/ui';

interface Insight {
  type: string;
  label: string;
  detail: string;
  value: number;
  icon: string;
}

const iconMap: Record<string, React.ReactNode> = {
  trending_up: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
  show_chart: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  trending_down: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 015.306 6.324l.537 1.439m0 0l-5.94-2.28m5.94 2.28l2.28-5.941" /></svg>,
  emoji_events: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m0 0a6.022 6.022 0 01-2.77-.896" /></svg>,
  warning: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  bar_chart: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  bolt: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
};

const colorMap: Record<string, string> = {
  trending_up: 'text-emerald-600 bg-emerald-50',
  show_chart: 'text-blue-600 bg-blue-50',
  trending_down: 'text-red-600 bg-red-50',
  emoji_events: 'text-amber-600 bg-amber-50',
  warning: 'text-orange-600 bg-orange-50',
  bar_chart: 'text-purple-600 bg-purple-50',
  bolt: 'text-yellow-600 bg-yellow-50',
};

export default memo(function InsightsPanel({ userId, startDate, endDate }: { userId: string; startDate?: string; endDate?: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ userId });
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const res = await fetch('/api/dashboard/insights?' + params.toString());
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load');
        if (json.data?.hasData) setInsights(json.data.insights);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally { setLoading(false); }
    };
    fetchInsights();
  }, [userId, startDate, endDate]);

  if (error) return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-surface-900 mb-4">Insights</h3>
      <div className="flex flex-col items-center justify-center py-6 text-surface-400">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    </Card>
  );

  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-surface-900 mb-4">Insights</h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-surface-100 rounded animate-pulse" />)}
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-400">
          <p className="text-sm">Not enough data for insights</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-50 border border-surface-100">
              <div className={`p-1.5 rounded-lg flex-shrink-0 ${colorMap[insight.icon] || 'text-surface-500 bg-surface-100'}`}>
                {iconMap[insight.icon] || iconMap.bar_chart}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-900">{insight.label}</p>
                <p className="text-xs text-surface-500 mt-0.5">{insight.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});
