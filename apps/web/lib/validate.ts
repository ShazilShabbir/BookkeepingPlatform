import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email format').max(255);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema,
  password: passwordSchema,
  companyName: z.string().max(200).optional(),
});

export const accountSchema = z.object({
  code: z.string().min(1).max(20).regex(/^\d{2,6}$/, 'Account code must be 2-6 digits'),
  name: z.string().min(1).max(100),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  normalBalance: z.enum(['debit', 'credit']).optional(),
  parentCode: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
});

export const journalEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
  lines: z.array(z.object({
    accountCode: z.string().min(1).max(20),
    debit: z.number().min(0).optional(),
    credit: z.number().min(0).optional(),
  })).min(1),
});

export const amountModeSchema = z.enum(['single_with_sign', 'revenue_and_cost', 'debit_credit']);

export const csvMappingSchema = z.object({
  dateColumn: z.string().optional().default(''),
  amountColumn: z.string().optional().default(''),
  amountColumn2: z.string().optional().default(''),
  descriptionColumn: z.string().optional().default(''),
  categoryColumn: z.string().optional().default(''),
  amountMode: amountModeSchema.optional().default('revenue_and_cost'),
});

export const customFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'boolean']),
  required: z.boolean().optional().default(false),
  csvColumn: z.string().nullable().optional().default(null),
});

export const customFieldsArraySchema = z.array(customFieldSchema);

export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.errors[0];
  return { success: false, error: `${first.path.join('.')}: ${first.message}` };
}
