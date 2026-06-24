import { AccountInfo, KEYWORD_RULES } from './classify';

export interface SuggestedAccount {
  code: string;
  name: string;
  type: string;
}

const MODEL = 'openrouter/free';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ColumnDetection {
  dateColumn: string;
  descriptionColumn: string;
  debitColumn: string | null;
  creditColumn: string | null;
  amountColumn: string | null;
  balanceColumn: string | null;
}

interface TransactionClassification {
  index: number;
  accountCode: string;
  accountName: string;
  confidence: number;
  reasoning: string;
}

interface ClassifyInput {
  date: string;
  description: string;
  amount: number;
  isDebit: boolean;
}

async function callAI(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const doFetch = async (useJsonMode: boolean): Promise<string | null> => {
    const body: Record<string, unknown> = {
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a bookkeeping assistant. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    };
    if (useJsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`OpenRouter error ${res.status}: ${errText.slice(0, 300)}`);
      if (useJsonMode && (res.status === 400 || res.status === 422)) {
        return '__JSON_MODE_FAILED__';
      }
      return null;
    }

    const json = await res.json();
    return json?.choices?.[0]?.message?.content || null;
  };

  try {
    const result = await doFetch(true);
    if (result === '__JSON_MODE_FAILED__') {
      return await doFetch(false);
    }
    return result;
  } catch (err) {
    console.error('OpenRouter fetch failed:', err);
    return null;
  }
}

export async function detectColumns(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<ColumnDetection | null> {
  const sampleText = sampleRows.slice(0, 3).map(r =>
    headers.map(h => `${h}: ${r[h] || ''}`).join(', ')
  ).join('\n');

  const prompt = `You are a CSV column detector for a bank statement import tool.

CSV Headers: ${headers.join(', ')}

Sample rows:
${sampleText}

Identify which CSV column contains each type of data. Consider all possible column naming conventions from any bank in any country.

Return ONLY valid JSON with these fields:
{
  "dateColumn": "exact column name for transaction date",
  "descriptionColumn": "exact column name for transaction description",
  "debitColumn": "exact column name for debit/withdrawal amount OR null if not present",
  "creditColumn": "exact column name for credit/deposit amount OR null if not present",
  "amountColumn": "exact column name for a single amount column (debits positive, credits negative) OR null if separate debit/credit columns exist",
  "balanceColumn": "exact column name for running balance OR null if not present"
}

Guidelines:
- If there are separate debit and credit columns, set amountColumn to null and fill debitColumn and creditColumn.
- If there is a single amount column (positive = credit/deposit, negative = debit/withdrawal), fill amountColumn and set debitColumn and creditColumn to null.
- Look for common names: Date, ValueDate, Posted, TransactionDate, Narration, Description, Particulars, Debit, Withdrawal, Payment, Credit, Deposit, Amount, Balance, Cheque`;

  const text = await callAI(prompt);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return {
      dateColumn: parsed.dateColumn || headers[0],
      descriptionColumn: parsed.descriptionColumn || headers[1] || headers[0],
      debitColumn: parsed.debitColumn || null,
      creditColumn: parsed.creditColumn || null,
      amountColumn: parsed.amountColumn || null,
      balanceColumn: parsed.balanceColumn || null,
    };
  } catch {
    return null;
  }
}

export async function classifyTransactions(
  transactions: ClassifyInput[],
  accounts: AccountInfo[],
): Promise<TransactionClassification[] | null> {
  if (transactions.length === 0) return [];

  const accountList = accounts.map(a => `${a.code} ${a.name} (${a.type})`).join('\n');

  const txnText = transactions.map((t, i) =>
    `${i}. "${t.description}" | ${t.isDebit ? '-' : '+'}$${Math.abs(t.amount).toFixed(2)} (${t.isDebit ? 'debit/withdrawal' : 'credit/deposit'})`
  ).join('\n');

  const keywordHints = KEYWORD_RULES.map(r =>
    `- Keywords ${r.keywords.join(', ')} → ${r.code}`
  ).join('\n');

  const prompt = `You are a bookkeeping AI that classifies bank transactions into the correct chart of accounts.

Available accounts (code name type):
${accountList}

Keyword reference hints (use as fallback if description is clear):
${keywordHints}

For each transaction below, select the BEST matching account. Consider:
- The description text for context (e.g., "HOTEL" → Travel & Meals, "INTEREST" → Interest income, "SALARY" → Salaries)
- Whether it's a debit (money leaving, typically an expense or asset) or credit (money coming in, typically revenue or liability)
- Common sense about what the transaction represents

Transactions to classify:
${txnText}

Return ONLY a JSON array with one object per transaction:
[{ "index": 0, "accountCode": "5500", "accountName": "Travel & Meals", "confidence": 0.95, "reasoning": "Hotel purchase" }]

Rules:
- index must match the transaction number above
- accountCode must be from the available accounts list
- confidence between 0 and 1 (1 = certain)
- reasoning: brief 1-2 word explanation`;

  const text = await callAI(prompt);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : (parsed.classifications || parsed.transactions || parsed.results || []);
    if (!Array.isArray(arr)) return null;
    return arr.map((item: any) => ({
      index: item.index,
      accountCode: item.accountCode || '5900',
      accountName: item.accountName || 'Uncategorized Expense',
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      reasoning: item.reasoning || '',
    }));
  } catch {
    return null;
  }
}

export async function suggestAccounts(
  descriptions: string[],
  existingAccounts: AccountInfo[],
): Promise<SuggestedAccount[] | null> {
  const unique = [...new Set(descriptions.map(d => d.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const existingList = existingAccounts.map(a => `${a.code} ${a.name} (${a.type})`).join('\n');
  const sampleDescs = unique.slice(0, 50).join('\n');

  const prompt = `You are a bookkeeping assistant that suggests new chart of accounts based on transaction descriptions.

Existing accounts:
${existingList}

Transaction descriptions from a bank statement:
${sampleDescs}

Analyze these descriptions and suggest 3-8 NEW accounts that would help categorize them. Do NOT suggest accounts that already exist in the list above. Focus on patterns that appear in the descriptions.

For each new account, determine:
- A 4-digit code in the correct range (Expense: 5000-5999, Revenue: 4000-4999, Asset: 1000-1999, Liability: 2000-2999, Equity: 3000-3999)
- Pick codes that DON'T conflict with existing codes above
- A clear short name
- The type (expense, revenue, asset, liability, or equity)

Return ONLY valid JSON with a "accounts" array:
{ "accounts": [{ "code": "5310", "name": "Software Subscriptions", "type": "expense" }] }`;

  const text = await callAI(prompt);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    const arr = parsed.accounts || parsed.suggestions || parsed;
    if (!Array.isArray(arr)) return null;
    return arr
      .filter((a: any) => a.code && a.name && a.type)
      .map((a: any) => ({
        code: String(a.code).padStart(4, '0'),
        name: a.name,
        type: a.type.toLowerCase(),
      }));
  } catch {
    return null;
  }
}
