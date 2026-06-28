import mongoose, { Schema, Document } from 'mongoose';
import type { CsvMapping, CustomField } from '@/lib/types';

export interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  role: string;
  companyName: string;
  createdBy: string;
  csvMapping: Record<string, string>;
  customFields: Record<string, string>;
  csvProfiles?: { name: string; csvMapping: CsvMapping; customFields: CustomField[] }[];
  stripeCustomerId: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionId: string;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
  totpSecret?: string;
  totpEnabled?: boolean;
  totpBackupCodes?: string[];
  brandingLogo?: string;
  brandingPrimaryColor?: string;
  brandingCompanyName?: string;
  baseCurrency?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin', enum: ['superadmin', 'admin', 'customer', 'client', 'viewer'] },
  companyName: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  csvMapping: { type: Schema.Types.Mixed, default: {} },
  customFields: { type: Schema.Types.Mixed, default: {} },
  csvProfiles: { type: [Schema.Types.Mixed], default: undefined },
  stripeCustomerId: { type: String, default: '' },
  subscriptionTier: { type: String, default: 'free', enum: ['free', 'pro', 'business'] },
  subscriptionStatus: { type: String, default: 'free', enum: ['free', 'active', 'past_due', 'canceled', 'trialing'] },
  subscriptionId: { type: String, default: '' },
  currentPeriodEnd: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  totpSecret: { type: String, default: undefined },
  totpEnabled: { type: Boolean, default: false },
  totpBackupCodes: { type: [String], default: undefined },
  brandingLogo: { type: String, default: '' },
  brandingPrimaryColor: { type: String, default: '#6366f1' },
  brandingCompanyName: { type: String, default: '' },
  baseCurrency: { type: String, default: 'USD' },
  resetToken: { type: String, default: undefined },
  resetTokenExpiry: { type: Date, default: undefined },
});

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
