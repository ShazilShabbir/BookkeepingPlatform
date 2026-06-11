import mongoose, { Schema, Document } from 'mongoose';

export interface IReconciliationLine extends Document {
  reconciliationId: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  status: 'unmatched' | 'matched' | 'excluded';
  matchedEntryId: string;
  matchedLineIds: string[];
  confidence: number;
  createdAt: Date;
}

const ReconciliationLineSchema = new Schema<IReconciliationLine>({
  reconciliationId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  description: { type: String, default: '' },
  amount: { type: Number, required: true },
  type: { type: String, required: true, enum: ['debit', 'credit'] },
  status: { type: String, default: 'unmatched', enum: ['unmatched', 'matched', 'excluded'] },
  matchedEntryId: { type: String, default: null },
  matchedLineIds: { type: [String], default: [] },
  confidence: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

ReconciliationLineSchema.index({ reconciliationId: 1, status: 1 });
ReconciliationLineSchema.index({ reconciliationId: 1, matchedEntryId: 1 });

export default mongoose.models.ReconciliationLine || mongoose.model<IReconciliationLine>('ReconciliationLine', ReconciliationLineSchema);
