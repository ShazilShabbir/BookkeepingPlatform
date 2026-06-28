import { memo, useEffect, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import Sparkline from '@/components/Sparkline';

interface KpiCardProps {
  label: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  color: string;
  accent: string;
  icon: React.ReactNode;
  trend?: number;
  trendData?: number[];
  isCurrency?: boolean;
  currency?: string;
  onClick?: () => void;
  index?: number;
}

export default memo(function KpiCard({ label, value = 0, prefix = '', suffix = '', color, accent, icon, trend, trendData, isCurrency = false, currency = 'USD', onClick, index = 0 }: KpiCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) { setDisplayValue(value); return; }
    animated.current = true;
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplayValue(value); clearInterval(timer); }
      else setDisplayValue(current);
    }, duration / steps);
    return () => { clearInterval(timer); animated.current = false; };
  }, [value]);

  const accentColors: Record<string, string> = {
    'bg-emerald-500': '#10b981',
    'bg-red-500': '#ef4444',
    'bg-primary-500': '#6366f1',
    'bg-blue-500': '#3b82f6',
    'bg-amber-500': '#f59e0b',
    'bg-purple-500': '#8b5cf6',
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl border border-surface-200 p-4 sm:p-5 overflow-hidden transition-all duration-200 animate-slide-up ${onClick ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5' : ''}`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
            trend >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
          }`}>
            <svg className={`w-3 h-3 ${trend >= 0 ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-xs text-surface-500 mb-0.5 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-surface-900 truncate">
        {isCurrency ? formatCurrency(displayValue, currency) : `${prefix}${displayValue.toLocaleString(undefined, { minimumFractionDigits: displayValue % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}${suffix}`}
      </p>
      {trendData && trendData.length > 1 && (
        <div className="mt-2 opacity-50">
          <Sparkline data={trendData} color={accentColors[accent] || '#6366f1'} height={28} />
        </div>
      )}
    </div>
  );
});