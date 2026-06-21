import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Invoice from '@/lib/models/Invoice';
import { requireAuth } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);

  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id is required' });

  await dbConnect();
  const invoice = await Invoice.findOne({ _id: id, userId: uid }).lean();
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const pdfmake = await import('pdfmake/build/pdfmake');
  const vfsFonts = await import('pdfmake/build/vfs_fonts');
  (pdfmake as any).vfs = (vfsFonts as any).default.vfs;

  const dueDate = new Date((invoice as any).dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const issueDate = new Date((invoice as any).issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    content: [
      { text: 'INVOICE', style: 'header', alignment: 'right', margin: [0, 0, 0, 8] },
      { text: (invoice as any).invoiceNumber, style: 'subheader', alignment: 'right', margin: [0, 0, 0, 24] },
      { columns: [
        [
          { text: 'FROM', style: 'label', margin: [0, 0, 0, 4] },
          { text: 'BookKeep', style: 'boldText' },
          { text: 'Sales Analytics Made Simple', style: 'smallText', margin: [0, 2, 0, 16] },
        ],
        [
          { text: 'TO', style: 'label', margin: [0, 0, 0, 4] },
          { text: (invoice as any).clientName, style: 'boldText' },
          { text: (invoice as any).clientEmail, style: 'smallText' },
          { text: (invoice as any).clientAddress || '', style: 'smallText' },
        ],
      ]},
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 496, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 16, 0, 16] },
      { columns: [
        { text: `Issue Date: ${issueDate}`, style: 'smallText' },
        { text: `Due Date: ${dueDate}`, style: 'smallText', alignment: 'right' },
      ], margin: [0, 0, 0, 16] },
      { text: '', margin: [0, 0, 0, 0] }, // spacer
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Description', style: 'tableHeader' },
              { text: 'Qty', style: 'tableHeader', alignment: 'right' },
              { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
              { text: 'Amount', style: 'tableHeader', alignment: 'right' },
            ],
            ...(invoice as any).lineItems.map((li: any) => [
              { text: li.description, style: 'tableCell' },
              { text: String(li.quantity), style: 'tableCell', alignment: 'right' },
              { text: `$${li.unitPrice.toFixed(2)}`, style: 'tableCell', alignment: 'right' },
              { text: `$${li.amount.toFixed(2)}`, style: 'tableCell', alignment: 'right' },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number) => i <= 1 ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
        },
      },
      { text: '', margin: [0, 8, 0, 8] },
      { columns: [
        { text: '', width: '*', alignment: 'left' },
        {
          width: 'auto',
          stack: [
            ...((invoice as any).taxRate > 0 ? [
              { text: `Subtotal: $${(invoice as any).subtotal.toFixed(2)}`, style: 'smallText', alignment: 'right', margin: [0, 0, 0, 4] },
              { text: `Tax (${(invoice as any).taxRate}%): $${(invoice as any).taxAmount.toFixed(2)}`, style: 'smallText', alignment: 'right', margin: [0, 0, 0, 4] },
            ] : []),
            { text: `Total: $${(invoice as any).total.toFixed(2)}`, style: 'totalText', alignment: 'right' },
          ],
        },
      ]},
      ...((invoice as any).notes ? [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 496, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 16, 0, 8] },
        { text: 'Notes', style: 'label', margin: [0, 0, 0, 4] },
        { text: (invoice as any).notes, style: 'smallText' },
      ] : []),
    ],
    styles: {
      header: { fontSize: 28, bold: true, color: '#4f46e5' },
      subheader: { fontSize: 16, color: '#6b7280' },
      label: { fontSize: 10, bold: true, color: '#9ca3af', letterSpacing: 1 },
      boldText: { fontSize: 12, bold: true, color: '#111827' },
      smallText: { fontSize: 10, color: '#6b7280' },
      tableHeader: { fontSize: 10, bold: true, color: '#6b7280', fillColor: '#f9fafb', margin: [8, 8, 8, 8] },
      tableCell: { fontSize: 11, color: '#374151', margin: [8, 6, 8, 6] },
      totalText: { fontSize: 16, bold: true, color: '#111827' },
    },
  };

  try {
    const pdfDoc = (pdfmake as any).createPdf(docDefinition);
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buf: Buffer) => resolve(buf));
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${(invoice as any).invoiceNumber}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (e: any) {
    console.error('PDF generation error:', e?.message || e);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
