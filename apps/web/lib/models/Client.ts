import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  userId: string;
  name: string;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  accessToken: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ClientSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
