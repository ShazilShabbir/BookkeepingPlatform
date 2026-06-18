import ExcelJS from 'exceljs';

interface ExcelImportResult {
  rows: Record<string, string>[];
  sheetName: string;
  totalRows: number;
  totalColumns: number;
  headers: string[];
}

function cleanCellValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).trim();
}

export async function parseExcelBuffer(buffer: ArrayBuffer): Promise<ExcelImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel file contains no worksheets');
  }

  const rows: Record<string, string>[] = [];
  let headers: string[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = (row.values as any[]) || [];
    values.shift();

    if (rowNumber === 1) {
      headers = values.map(v => cleanCellValue(v));
      return;
    }

    const rowData: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      rowData[headers[i]] = cleanCellValue(values[i]);
    }
    if (Object.values(rowData).some(v => v)) {
      rows.push(rowData);
    }
  });

  return {
    rows,
    sheetName: worksheet.name || 'Sheet1',
    totalRows: rows.length,
    totalColumns: headers.length,
    headers,
  };
}
