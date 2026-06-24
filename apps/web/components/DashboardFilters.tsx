import { useState } from 'react';
import { Button } from '@/components/ui';

interface Props {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

const presets = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: 0 },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function DashboardFilters({ startDate, endDate, onChange }: Props) {
  const [activePreset, setActivePreset] = useState<string | null>(
    presets.find(p => {
      if (p.days === 0 && !startDate && !endDate) return true;
      if (p.days === 0) return false;
      const expected = toDateStr(new Date(Date.now() - p.days * 86400000));
      return expected === startDate && !endDate;
    })?.label || null,
  );

  const handlePreset = (days: number, label: string) => {
    setActivePreset(label);
    if (days === 0) {
      onChange('', '');
    } else {
      const sd = toDateStr(new Date(Date.now() - days * 86400000));
      onChange(sd, '');
    }
  };

  const handleCustom = () => {
    setActivePreset(null);
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      {presets.map(p => (
        <Button
          key={p.label}
          size="sm"
          variant={activePreset === p.label ? 'primary' : 'secondary'}
          onClick={() => handlePreset(p.days, p.label)}
        >
          {p.label}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <label className="text-xs text-surface-500">From</label>
        <input
          type="date"
          value={startDate}
          onChange={e => { setActivePreset(null); onChange(e.target.value, endDate); }}
          className="border border-surface-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          onClick={handleCustom}
        />
        <label className="text-xs text-surface-500">To</label>
        <input
          type="date"
          value={endDate}
          onChange={e => { setActivePreset(null); onChange(startDate, e.target.value); }}
          className="border border-surface-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          onClick={handleCustom}
        />
      </div>
    </div>
  );
}
