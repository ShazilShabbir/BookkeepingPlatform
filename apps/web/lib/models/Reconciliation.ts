import mongoose, { Schema, Document } from 'mongoose';

export interface IReconciliation extends Document {
  userId: string;
  accountCode: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'in_progress' | 'completed';
  startingBalance: number;
  statementBalance: number;
  ledgerBalance: number;
  difference: number;
  matchedCount: number;
  unmatchedCount: number;
  totalStatementLines: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReconciliationSchema = new Schema<IReconciliation>({
  userId: { type: String, required: true, index: true },
  accountCode: { type: String, required: true },
  periodStart: { type: String, required: true },
  periodEnd: { type: String, required: true },
  status: { type: String, default: 'draft', enum: ['draft', 'in_progress', 'completed'] },
  startingBalance: { type: Number, default: 0 },
  statementBalance: { type: Number, default: 0 },
  ledgerBalance: { type: Number, default: 0 },
  difference: { type: Number, default: 0 },
  matchedCount: { type: Number, default: 0 },
  unmatchedCount: { type: Number, default: 0 },
  totalStatementLines: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ReconciliationSchema.index({ userId: 1, accountCode: 1 });
ReconciliationSchema.index({ userId: 1, status: 1 });

ReconciliationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Reconciliation || mongoose.model<IReconciliation>('Reconciliation', ReconciliationSchema);
