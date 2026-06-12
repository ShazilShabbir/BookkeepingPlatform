import mongoose, { Schema, Document } from 'mongoose';

export interface ITrashItem extends Document {
  userId: string;
  resource: string;
  resourceId: string;
  label: string;
  snapshot: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
}

const TrashItemSchema = new Schema<ITrashItem>({
  userId: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  resourceId: { type: String, required: true },
  label: { type: String, default: '' },
  snapshot: { type: Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

TrashItemSchema.index({ userId: 1, createdAt: -1 });
TrashItemSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.TrashItem || mongoose.model<ITrashItem>('TrashItem', TrashItemSchema);
