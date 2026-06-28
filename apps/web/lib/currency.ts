import dbConnect from '@/lib/mongoose';
import ExchangeRate from '@/lib/models/ExchangeRate';

const rateCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

function cacheKey(userId: string, from: string, to: string): string {
  return `${userId}:${from}:${to}`;
}

export async function getLatestRate(userId: string, fromCurrency: string, toCurrency: string): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const key = cacheKey(userId, fromCurrency, toCurrency);
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.rate;

  await dbConnect();

  const rate = await ExchangeRate.findOne({ userId, targetCurrency: toCurrency, baseCurrency: fromCurrency })
    .sort({ date: -1 })
    .lean();

  if (rate) {
    rateCache.set(key, { rate: (rate as any).rate, timestamp: Date.now() });
    return (rate as any).rate;
  }

  const inverse = await ExchangeRate.findOne({ userId, targetCurrency: fromCurrency, baseCurrency: toCurrency })
    .sort({ date: -1 })
    .lean();

  if (inverse && (inverse as any).rate > 0) {
    const converted = 1 / (inverse as any).rate;
    rateCache.set(key, { rate: converted, timestamp: Date.now() });
    return converted;
  }

  return null;
}

export async function convertAmount(
  userId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  const rate = await getLatestRate(userId, fromCurrency, toCurrency);
  if (rate === null) return amount;
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Convert journal line debit/credit amounts from account currencies to baseCurrency.
 * Returns a new array of lines with converted debit/credit values.
 * Lines whose account currency matches baseCurrency are returned unchanged.
 */
export async function convertJournalLines(
  userId: string,
  lines: any[],
  accountMap: Map<string, { currency?: string }>,
  baseCurrency: string,
): Promise<any[]> {
  const results: any[] = [];
  for (const line of lines) {
    const info = accountMap.get(line.accountCode);
    const fromCurrency = info?.currency || 'USD';
    if (fromCurrency === baseCurrency) {
      results.push(line);
    } else {
      const convertedDebit = line.debit ? await convertAmount(userId, line.debit, fromCurrency, baseCurrency) : 0;
      const convertedCredit = line.credit ? await convertAmount(userId, line.credit, fromCurrency, baseCurrency) : 0;
      results.push({ ...line, debit: convertedDebit, credit: convertedCredit });
    }
  }
  return results;
}

export function clearRateCache(): void {
  rateCache.clear();
}
