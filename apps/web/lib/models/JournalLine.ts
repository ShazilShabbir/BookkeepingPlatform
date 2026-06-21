import mongoose, { Schema, Document } from 'mongoose';

export interface IJournalLine extends Document {
  journalEntryId: string;
  userId: string;
  accountCode: string;
  description?: string;
  debit: number;
  credit: number;
  exchangeRate?: number;
  rawData?: Record<string, any>;
}

const JournalLineSchema = new Schema<IJournalLine>({
  journalEntryId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  accountCode: { type: String, required: true },
  description: { type: String, default: '' },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  exchangeRate: { type: Number, default: null },
  rawData: { type: Schema.Types.Mixed, default: null },
});

JournalLineSchema.index({ journalEntryId: 1, accountCode: 1 });
JournalLineSchema.index({ accountCode: 1, userId: 1, journalEntryId: 1 });

export default mongoose.models.JournalLine || mongoose.model<IJournalLine>('JournalLine', JournalLineSchema);
