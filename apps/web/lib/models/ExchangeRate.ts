import mongoose, { Schema, Document } from 'mongoose';

export interface IExchangeRate extends Document {
  userId: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  date: Date;
  source: 'manual' | 'auto';
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>({
  userId: { type: String, required: true, index: true },
  baseCurrency: { type: String, required: true, default: 'USD' },
  targetCurrency: { type: String, required: true },
  rate: { type: Number, required: true },
  date: { type: Date, required: true },
  source: { type: String, enum: ['manual', 'auto'], default: 'manual' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ExchangeRateSchema.index({ userId: 1, targetCurrency: 1, date: -1 });
ExchangeRateSchema.index({ userId: 1, targetCurrency: 1, baseCurrency: 1 }, { unique: true });

ExchangeRateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ExchangeRate || mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
