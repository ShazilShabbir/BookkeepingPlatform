import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryMapping extends Document {
  userId: string;
  keyword: string;
  accountCode: string;
  createdAt: Date;
}

const CategoryMappingSchema = new Schema<ICategoryMapping>({
  userId: { type: String, required: true, index: true },
  keyword: { type: String, required: true },
  accountCode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.CategoryMapping || mongoose.model<ICategoryMapping>('CategoryMapping', CategoryMappingSchema);
