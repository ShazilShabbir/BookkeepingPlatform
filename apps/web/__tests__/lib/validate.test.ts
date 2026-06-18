import { safeParse, signupSchema, passwordSchema, emailSchema, accountSchema, journalEntrySchema, csvMappingSchema, customFieldSchema } from '@/lib/validate';

describe('safeParse', () => {
  it('returns success for valid data', () => {
    const result = safeParse(emailSchema, 'test@example.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });

  it('returns error for invalid data', () => {
    const result = safeParse(emailSchema, 'not-an-email');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid email');
    }
  });
});

describe('passwordSchema', () => {
  it('accepts valid password', () => {
    const result = passwordSchema.safeParse('Abcdef1!');
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = passwordSchema.safeParse('Ab1!');
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = passwordSchema.safeParse('abcdef1!');
    expect(result.success).toBe(false);
  });

  it('rejects password without digit', () => {
    const result = passwordSchema.safeParse('Abcdefgh!');
    expect(result.success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse({ name: 'John', email: 'john@test.com', password: 'StrongP1!' });
    expect(result.success).toBe(true);
  });

  it('accepts signup with companyName', () => {
    const result = signupSchema.safeParse({ name: 'John', email: 'john@test.com', password: 'StrongP1!', companyName: 'Acme' });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = signupSchema.safeParse({ email: 'john@test.com', password: 'StrongP1!' });
    expect(result.success).toBe(false);
  });
});

describe('accountSchema', () => {
  it('accepts valid account', () => {
    const result = accountSchema.safeParse({ code: '1000', name: 'Cash', type: 'asset' });
    expect(result.success).toBe(true);
  });

  it('rejects short code', () => {
    const result = accountSchema.safeParse({ code: '1', name: 'Cash', type: 'asset' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = accountSchema.safeParse({ code: '1000', name: 'Cash', type: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('journalEntrySchema', () => {
  it('accepts valid entry', () => {
    const result = journalEntrySchema.safeParse({
      date: '2024-01-15',
      description: 'Test entry',
      lines: [{ accountCode: '1000', debit: 100 }, { accountCode: '4000', credit: 100 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects entry without lines', () => {
    const result = journalEntrySchema.safeParse({ date: '2024-01-15', lines: [] });
    expect(result.success).toBe(false);
  });
});

describe('csvMappingSchema', () => {
  it('applies defaults for empty object', () => {
    const result = csvMappingSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountMode).toBe('revenue_and_cost');
    }
  });
});

describe('customFieldSchema', () => {
  it('accepts valid custom field', () => {
    const result = customFieldSchema.safeParse({ id: 'cf1', label: 'Invoice #', type: 'text' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = customFieldSchema.safeParse({ id: 'cf1', label: 'Bad', type: 'array' });
    expect(result.success).toBe(false);
  });
});
