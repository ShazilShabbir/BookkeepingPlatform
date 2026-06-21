import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  accountCode?: string;
}

export interface IInvoice extends Document {
  userId: string;
  invoiceNumber: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  clientCompanyName?: string;
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  currency: string;
  notes?: string;
  terms?: string;
  stripePaymentIntentId?: string;
  stripePaymentLink?: string;
  paidAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  accountCode: String,
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  userId: { type: String, required: true, index: true },
  invoiceNumber: { type: String, required: true },
  clientId: { type: String, index: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  clientAddress: String,
  clientCompanyName: String,
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
    index: true,
  },
  lineItems: { type: [InvoiceLineItemSchema], required: true, validate: [itemsMin, 'At least one line item is required'] },
  subtotal: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  taxAmount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'USD' },
  notes: String,
  terms: String,
  stripePaymentIntentId: String,
  stripePaymentLink: String,
  paidAt: Date,
  sentAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

function itemsMin(val: IInvoiceLineItem[]) {
  return val.length > 0;
}

InvoiceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

InvoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ userId: 1, status: 1 });

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
