import mongoose, { Schema, Document } from 'mongoose';

export interface IClosedPeriod extends Document {
  userId: string;
  yearMonth: string;
  closedAt: Date;
  closedBy: string;
}

const ClosedPeriodSchema = new Schema<IClosedPeriod>({
  userId: { type: String, required: true, index: true },
  yearMonth: { type: String, required: true },
  closedAt: { type: Date, default: Date.now },
  closedBy: { type: String, required: true },
});

ClosedPeriodSchema.index({ userId: 1, yearMonth: -1 });

export default mongoose.models.ClosedPeriod || mongoose.model<IClosedPeriod>('ClosedPeriod', ClosedPeriodSchema);
