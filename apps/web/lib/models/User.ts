import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  role: string;
  companyName: string;
  createdBy: string;
  csvMapping: Record<string, string>;
  customFields: Record<string, string>;
  stripeCustomerId: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionId: string;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin', enum: ['admin', 'customer', 'client', 'viewer'] },
  companyName: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  csvMapping: { type: Schema.Types.Mixed, default: {} },
  customFields: { type: Schema.Types.Mixed, default: {} },
  stripeCustomerId: { type: String, default: '' },
  subscriptionTier: { type: String, default: 'free', enum: ['free', 'pro', 'business'] },
  subscriptionStatus: { type: String, default: 'free', enum: ['free', 'active', 'past_due', 'canceled', 'trialing'] },
  subscriptionId: { type: String, default: '' },
  currentPeriodEnd: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
