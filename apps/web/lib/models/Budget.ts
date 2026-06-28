import mongoose, { Schema, Document } from 'mongoose';

export interface IBudget extends Document {
  userId: string;
  accountCode: string;
  month: string;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: String, required: true, index: true },
    accountCode: { type: String, required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
  },
  { timestamps: true },
);

BudgetSchema.index({ userId: 1, accountCode: 1, month: 1 }, { unique: true });

export default (mongoose.models.Budget as mongoose.Model<IBudget>) || mongoose.model<IBudget>('Budget', BudgetSchema);
