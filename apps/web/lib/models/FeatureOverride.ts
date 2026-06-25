import mongoose, { Schema, Document } from 'mongoose';

export interface IFeatureOverride extends Document {
  feature: string;
  override: 'enabled' | 'disabled' | 'default';
  updatedBy: string;
  updatedAt: Date;
}

const FeatureOverrideSchema = new Schema<IFeatureOverride>({
  feature: { type: String, required: true, unique: true },
  override: { type: String, enum: ['enabled', 'disabled', 'default'], default: 'default' },
  updatedBy: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

FeatureOverrideSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.FeatureOverride || mongoose.model<IFeatureOverride>('FeatureOverride', FeatureOverrideSchema);
