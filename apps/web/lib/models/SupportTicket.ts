import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketMessage {
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  userId: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messages: ITicketMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketMessageSchema = new Schema<ITicketMessage>({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const SupportTicketSchema = new Schema<ISupportTicket>({
  userId: { type: String, required: true, index: true },
  subject: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  messages: { type: [TicketMessageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SupportTicketSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

SupportTicketSchema.index({ userId: 1, status: 1 });

export default mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
