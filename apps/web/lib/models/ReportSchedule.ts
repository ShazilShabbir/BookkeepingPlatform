import mongoose, { Schema, Document } from 'mongoose';

export interface IReportSchedule extends Document {
  userId: string;
  clientId: string;
  frequency: 'weekly' | 'monthly';
  reportType: string;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportScheduleSchema = new Schema<IReportSchedule>({
  userId: { type: String, required: true, index: true },
  clientId: { type: String, required: true },
  frequency: { type: String, required: true, enum: ['weekly', 'monthly'] },
  reportType: { type: String, default: 'financial' },
  nextRunAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ReportScheduleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ReportSchedule || mongoose.model<IReportSchedule>('ReportSchedule', ReportScheduleSchema);
