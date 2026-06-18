import type { NextApiRequest, NextApiResponse } from 'next';

interface PdfImportResult {
  rows: Record<string, string>[];
  totalRows: number;
  totalColumns: number;
  headers: string[];
  rawText: string;
}

function extractTableRows(text: string): Record<string, string>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const rows: Record<string, string>[] = [];
  let headers: string[] = [];

  const isLikelyTable = (line: string): boolean => {
    const separators = ['\t', '  ', ' | ', '|'];
    return separators.some(s => line.includes(s));
  };

  for (const line of lines) {
    if (isLikelyTable(line)) {
      const parts = line.split(/\t+|  +|\s*\|\s*/).map(p => p.trim()).filter(Boolean);
      if (headers.length === 0 && parts.length >= 2) {
        headers = parts;
      } else if (headers.length > 0 && parts.length === headers.length) {
        const row: Record<string, string> = {};
        for (let i = 0; i < headers.length; i++) {
          row[headers[i]] = parts[i];
        }
        rows.push(row);
      } else if (headers.length > 0 && parts.length > 0) {
        const row: Record<string, string> = {};
        for (let i = 0; i < Math.min(parts.length, headers.length); i++) {
          row[headers[i]] = parts[i];
        }
        rows.push(row);
      }
    }
  }

  if (rows.length === 0 && lines.length >= 2) {
    headers = ['content'];
    for (const line of lines.slice(1)) {
      rows.push({ content: line });
    }
  }

  return rows;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<PdfImportResult> {
  let pdfParse: any;
  try {
    pdfParse = require('pdf-parse');
  } catch {
    throw new Error('pdf-parse package is not installed. Run: npm install pdf-parse');
  }

  const data = await pdfParse(buffer);
  const rawText = data.text || '';
  const rows = extractTableRows(rawText);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : ['content'];

  return {
    rows,
    totalRows: rows.length,
    totalColumns: headers.length,
    headers,
    rawText,
  };
}

export async function handlePdfUpload(req: NextApiRequest, res: NextApiResponse) {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const result = await parsePdfBuffer(buffer);
    return res.status(200).json({ success: true, data: result });
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e.message || 'PDF parsing failed' });
  }
}
