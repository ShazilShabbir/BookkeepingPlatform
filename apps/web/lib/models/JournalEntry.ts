import mongoose, { Schema, Document } from 'mongoose';

export interface IJournalEntry extends Document {
  userId: string;
  date: string;
  description: string;
  jobId: string;
  reconciled: boolean;
  reconciledAt: string;
  customFieldValues?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntrySchema = new Schema<IJournalEntry>({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  description: { type: String, default: '' },
  jobId: { type: String, default: null },
  reconciled: { type: Boolean, default: false },
  reconciledAt: { type: String, default: null },
  customFieldValues: { type: Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

JournalEntrySchema.index({ userId: 1, date: -1 });
JournalEntrySchema.index({ userId: 1, jobId: 1 });
JournalEntrySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.JournalEntry || mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);
