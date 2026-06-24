export interface ForecastPoint {
  month: string;
  value: number;
  forecast: boolean;
}

/**
 * Simple linear regression (least squares).
 * Given an array of values indexed 0..n-1, returns next `lookahead` projected values.
 */
export function linearRegression(values: number[], lookahead = 3): { slope: number; intercept: number; r2: number; projected: number[] } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0, projected: Array(lookahead).fill(values[0] || 0) };

  const indices = values.map((_, i) => i);
  const sumX = indices.reduce((s, x) => s + x, 0);
  const sumY = values.reduce((s, y) => s + y, 0);
  const sumXY = indices.reduce((s, x, i) => s + x * values[i], 0);
  const sumX2 = indices.reduce((s, x) => s + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  const ssTot = values.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = values.reduce((s, y, i) => s + (y - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  const projected = Array.from({ length: lookahead }, (_, i) => {
    const idx = n + i;
    return Math.round((slope * idx + intercept) * 100) / 100;
  });

  return { slope, intercept, r2, projected };
}

/**
 * Generate month labels starting from a base month.
 */
export function nextMonthLabels(fromMonth: string, count: number): string[] {
  const [y, m] = fromMonth.split('-').map(Number);
  const labels: string[] = [];
  let cy = y, cm = m;
  for (let i = 0; i < count; i++) {
    cm += 1;
    if (cm > 12) { cm = 1; cy += 1; }
    labels.push(`${cy}-${String(cm).padStart(2, '0')}`);
  }
  return labels;
}
