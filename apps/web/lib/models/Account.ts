import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  userId: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
  currency: string;
  parentCode?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>({
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['asset', 'liability', 'equity', 'revenue', 'expense'] },
  normalBalance: { type: String, required: true, enum: ['debit', 'credit'], default: 'debit' },
  currency: { type: String, default: 'USD' },
  parentCode: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

AccountSchema.index({ userId: 1, code: 1 }, { unique: true });
AccountSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
