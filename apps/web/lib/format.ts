const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', CHF: 'CHF',
  CNY: '¥', INR: '₹', BRL: 'R$', MXN: 'MX$', KRW: '₩', SEK: 'kr', NOK: 'kr',
  DKK: 'kr', NZD: 'NZ$', SGD: 'S$', HKD: 'HK$', TRY: '₺', ZAR: 'R',
};

const localeMap: Record<string, string> = {
  USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP', CAD: 'en-CA',
  AUD: 'en-AU', CHF: 'de-CH', CNY: 'zh-CN', INR: 'en-IN', BRL: 'pt-BR',
  MXN: 'es-MX', KRW: 'ko-KR', SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK',
  NZD: 'en-NZ', SGD: 'en-SG', HKD: 'zh-HK', TRY: 'tr-TR', ZAR: 'en-ZA',
};

export function formatCurrency(amount: number, currency = 'USD'): string {
  const ccy = currency.toUpperCase();
  const locale = localeMap[ccy] || 'en-US';
  try {
    return amount.toLocaleString(locale, { style: 'currency', currency: ccy });
  } catch {
    const sym = currencySymbols[ccy] || ccy;
    return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function formatCurrencyCompact(amount: number, currency = 'USD'): string {
  const ccy = currency.toUpperCase();
  const sym = currencySymbols[ccy] || ccy;
  if (Math.abs(amount) >= 1_000_000) {
    return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${sym}${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount, ccy);
}

export function getCurrencySymbol(currency = 'USD'): string {
  return currencySymbols[currency.toUpperCase()] || currency.toUpperCase();
}

export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
];
