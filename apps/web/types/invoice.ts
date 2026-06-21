export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  accountCode?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceData {
  _id: string;
  userId: string;
  invoiceNumber: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  clientCompanyName?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
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
  paidAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}
