export default function Sparkline({ data, color = '#10b981', height = 24 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const width = data.length * 8;
  const max = Math.max(...data.map(Math.abs), 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${i * 8 + 2},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}
