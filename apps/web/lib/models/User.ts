import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  role: string;
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin', enum: ['admin', 'client', 'viewer'] },
  companyName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
