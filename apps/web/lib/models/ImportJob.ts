import mongoose, { Schema, Document } from 'mongoose';

export interface IImportJob extends Document {
  userId: string;
  originalFileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  filePath?: string;
  mapping?: Record<string, string>;
  csvMapping?: Record<string, any>;
  csvProfileName?: string;
  customFieldMapping?: Record<string, string>;
  aiMappings?: Record<string, any>;
  dedupEnabled?: boolean;
  excludedRows?: number[];
  errors?: { row: number; reason: string }[];
  duplicateRows?: { row: number; description: string; date: string; matchedDescription: string }[];
  importedEntries?: number;
  skippedRows?: number;
  duplicatesSkipped?: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>({
  userId: { type: String, required: true, index: true },
  originalFileName: { type: String, default: '' },
  status: { type: String, default: 'pending', enum: ['pending', 'processing', 'completed', 'failed'] },
  totalRows: { type: Number, default: 0 },
  processedRows: { type: Number, default: 0 },
  filePath: { type: String, default: null },
  mapping: { type: Schema.Types.Mixed, default: null },
  csvMapping: { type: Schema.Types.Mixed, default: null },
  csvProfileName: { type: String, default: null },
  customFieldMapping: { type: Schema.Types.Mixed, default: null },
  aiMappings: { type: Schema.Types.Mixed, default: null },
  dedupEnabled: { type: Boolean, default: true },
  excludedRows: { type: [Number], default: [] },
  errors: { type: [Schema.Types.Mixed], default: [] },
  duplicateRows: { type: [Schema.Types.Mixed], default: [] },
  importedEntries: { type: Number, default: 0 },
  skippedRows: { type: Number, default: 0 },
  duplicatesSkipped: { type: Number, default: 0 },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ImportJobSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ImportJob || mongoose.model<IImportJob>('ImportJob', ImportJobSchema);
