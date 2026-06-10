import mongoose, { Schema, Document } from 'mongoose';

export interface IImportJob extends Document {
  userId: string;
  originalFileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  aiMappings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>({
  userId: { type: String, required: true, index: true },
  originalFileName: { type: String, default: '' },
  status: { type: String, default: 'pending', enum: ['pending', 'processing', 'completed', 'failed'] },
  totalRows: { type: Number, default: 0 },
  processedRows: { type: Number, default: 0 },
  aiMappings: { type: Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ImportJobSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ImportJob || mongoose.model<IImportJob>('ImportJob', ImportJobSchema);
