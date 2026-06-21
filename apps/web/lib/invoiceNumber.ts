import dbConnect from '@/lib/mongoose';
import Invoice from '@/lib/models/Invoice';

export async function generateInvoiceNumber(userId: string): Promise<string> {
  await dbConnect();
  const year = new Date().getFullYear();
  const last = await Invoice.findOne({ userId, invoiceNumber: new RegExp(`^INV-${year}-`) })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber')
    .lean();
  let seq = 1;
  if (last) {
    const parts = (last as any).invoiceNumber.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
}
