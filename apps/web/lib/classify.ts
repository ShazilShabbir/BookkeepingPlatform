export interface AccountInfo { code: string; name: string; type: string; }

export const KEYWORD_RULES: { keywords: string[]; code: string }[] = [
  { keywords: ['revenue', 'income', 'sales', 'received', 'sold', 'subscription'], code: '4000' },
  { keywords: ['service', 'consulting', 'fee', 'hourly', 'retainer'], code: '4100' },
  { keywords: ['cogs', 'cost of goods', 'purchase', 'merchandise', 'inventory', 'product cost'], code: '5000' },
  { keywords: ['salary', 'wage', 'payroll', 'labor', 'bonus', 'commission'], code: '5100' },
  { keywords: ['rent', 'lease', 'utility', 'electric', 'water', 'internet', 'phone'], code: '5200' },
  { keywords: ['supplies', 'office', 'stationery', 'software', 'subscription fee'], code: '5300' },
  { keywords: ['marketing', 'ad', 'advertising', 'promotion', 'social media', 'seo', 'ppc'], code: '5400' },
  { keywords: ['travel', 'fuel', 'gasoline', 'mileage', 'hotel', 'lodging', 'transport'], code: '5500' },
  { keywords: ['legal', 'accounting', 'professional', 'consultant', 'notary', 'audit'], code: '5600' },
  { keywords: ['tax', 'license', 'permit', 'registration', 'duty', 'tariff'], code: '5700' },
  { keywords: ['insurance', 'premium', 'policy'], code: '5450' },
  { keywords: ['interest income', 'interest earned', 'bank interest'], code: '4200' },
  { keywords: ['interest expense', 'interest paid', 'finance charge'], code: '5650' },
  { keywords: ['bank fee', 'service charge', 'monthly fee', 'wire fee'], code: '5750' },
  { keywords: ['depreciation', 'amortization'], code: '5850' },
  { keywords: ['dividend', 'distribution'], code: '3200' },
];

export function cleanDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw + 'T00:00:00');
    if (!isNaN(d.getTime())) return raw;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (month > 12 && day <= 12) {
      const d3 = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
      if (!isNaN(d3.getTime())) return d3.toISOString().split('T')[0];
    }
    const d2 = new Date(`${parts[3]}-${parts[1]}-${parts[2]}`);
    if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
  }
  const parts2 = raw.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{2})$/);
  if (parts2) {
    const d4 = new Date(`${parts2[3]}-${monthAbbr(parts2[2])}-${parts2[1]}`);
    if (!isNaN(d4.getTime())) return d4.toISOString().split('T')[0];
  }
  return raw;
}

function monthAbbr(m: string): string {
  const map: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  return map[m.toLowerCase().slice(0, 3)] || '01';
}

export function classifyRow(
  catVal: string, descVal: string, amountVal: number, isCost: boolean,
  mappings: Map<string, string>, accountsByCode: Map<string, AccountInfo>,
  learningMappings?: Record<string, string>,
): AccountInfo {
  if (catVal && catVal !== 'uncategorized' && catVal !== 'cost of goods') {
    const mappedCode = mappings.get(catVal);
    if (mappedCode) {
      const acct = accountsByCode.get(mappedCode);
      if (acct) return acct;
    }
  }

  const text = `${descVal} ${catVal}`.toLowerCase();
  if (learningMappings) {
    for (const [descKey, code] of Object.entries(learningMappings)) {
      if (text.includes(descKey.toLowerCase().slice(0, 80))) {
        const acct = accountsByCode.get(code);
        if (acct) return acct;
      }
    }
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      const acct = accountsByCode.get(rule.code);
      if (acct) return acct;
    }
  }

  const defaultCode = amountVal > 0 ? '5900' : '5800';
  return accountsByCode.get(defaultCode) || { code: defaultCode, name: amountVal > 0 ? 'Uncategorized Income' : 'Other Expenses', type: amountVal > 0 ? 'revenue' : 'expense' };
}

export function accountsMapFromDocs(docs: { data(): Record<string, any> }[]): Map<string, AccountInfo> {
  const map = new Map<string, AccountInfo>();
  for (const d of docs) {
    const a = d.data();
    map.set(a.code, { code: a.code, name: a.name, type: a.type });
  }
  return map;
}
