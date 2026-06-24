const COLORS = {
  primary: '#4f46e5',
  primaryLight: '#eef2ff',
  green: '#10b981',
  greenLight: '#f0fdf4',
  red: '#ef4444',
  redLight: '#fef2f2',
  surface: '#f8fafc',
  border: '#e5e7eb',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
};

function fmt(n: number) {
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tableRow(label: string, value: string, bold = false, color?: string) {
  const r: any = [{ text: label, style: bold ? 'boldCell' : 'cell', border: [false, false, false, true] }];
  r.push({ text: value, style: bold ? 'boldCell' : 'cell', alignment: 'right', border: [false, false, false, true], color: color || undefined });
  return r;
}

function accountRow(code: string, name: string, amount: string) {
  return [
    { text: code || '', style: 'codeCell', border: [false, false, false, true] },
    { text: name, style: 'cell', border: [false, false, false, true] },
    { text: amount, style: 'cell', alignment: 'right', border: [false, false, false, true] },
  ];
}

function sectionTable(section: { title: string; type: string; total: number; accounts: any[] }, type: 'rev' | 'exp' | 'asset' | 'liability' | 'equity') {
  const isNeg = type === 'exp';
  const totalColor = isNeg ? COLORS.red : COLORS.green;
  const totalBg = isNeg ? COLORS.redLight : COLORS.greenLight;
  const body = section.accounts.map((a: any) => accountRow(
    a.accountCode === 'net-income' ? '' : a.accountCode,
    a.accountName,
    fmt(a.balance),
  ));
  body.push([
    { text: '', style: 'boldCell', border: [false, false, false, false] },
    { text: `Total ${section.title}`, style: 'boldCell', border: [false, false, false, false], color: totalColor } as any,
    { text: fmt(section.total), style: 'boldCell', alignment: 'right', border: [false, false, false, false], color: totalColor, fillColor: totalBg } as any,
  ]);
  return {
    table: {
      headerRows: 1,
      widths: [48, '*', 'auto'],
      body: [
        [
          { text: 'Code', style: 'tableHeader' },
          { text: 'Account', style: 'tableHeader' },
          { text: 'Amount', style: 'tableHeader', alignment: 'right' },
        ],
        ...body,
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => COLORS.border,
    },
    margin: [0, 0, 0, 12],
  };
}

interface ReportInput {
  kpis: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number; entryCount: number; cashBalance: number };
  profitLoss: { sections: any[]; netIncome: number; netIncomeRatio: number };
  balanceSheet: { sections: any[]; totalAssets: number; totalLiabilities: number; totalEquity: number };
  cashFlow?: { sections: any[]; totalChange: number } | null;
  trialBalance?: { rows: any[]; totals: { totalDebits: number; totalCredits: number; difference: number; balanced: boolean } } | null;
  dateRange: { startDate?: string | null; endDate?: string | null };
}

export function buildReportDocDefinition(input: ReportInput, ownerName: string) {
  const { kpis, profitLoss, balanceSheet, cashFlow, trialBalance, dateRange } = input;
  const dateLabel = dateRange.startDate && dateRange.endDate ? `${dateRange.startDate} – ${dateRange.endDate}` : 'All Time';

  const content: any[] = [];

  content.push(
    { text: 'Financial Report', style: 'reportTitle', alignment: 'center', margin: [0, 0, 0, 4] },
    { text: ownerName, style: 'ownerName', alignment: 'center', margin: [0, 0, 0, 2] },
    { text: dateLabel, style: 'dateLabel', alignment: 'center', margin: [0, 0, 0, 24] },
  );

  content.push({ text: 'Summary', style: 'sectionTitle', margin: [0, 0, 0, 12] });
  content.push({
    layout: 'noBorders',
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        [
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
        ],
        [
          { text: 'Revenue', style: 'kpiLabel', alignment: 'center', fillColor: COLORS.greenLight, border: [false, false, false, false] },
          { text: 'Expenses', style: 'kpiLabel', alignment: 'center', fillColor: COLORS.redLight, border: [false, false, false, false] },
          { text: 'Net Profit', style: 'kpiLabel', alignment: 'center', fillColor: kpis.netProfit >= 0 ? COLORS.greenLight : COLORS.redLight, border: [false, false, false, false] },
          { text: 'Margin', style: 'kpiLabel', alignment: 'center', fillColor: COLORS.primaryLight, border: [false, false, false, false] },
        ],
        [
          { text: fmt(kpis.totalRevenue), style: 'kpiValue', alignment: 'center', color: COLORS.green, fillColor: COLORS.greenLight, border: [false, false, false, false] },
          { text: fmt(kpis.totalExpenses), style: 'kpiValue', alignment: 'center', color: COLORS.red, fillColor: COLORS.redLight, border: [false, false, false, false] },
          { text: fmt(kpis.netProfit), style: 'kpiValue', alignment: 'center', color: kpis.netProfit >= 0 ? COLORS.green : COLORS.red, fillColor: kpis.netProfit >= 0 ? COLORS.greenLight : COLORS.redLight, border: [false, false, false, false] },
          { text: `${kpis.profitMargin.toFixed(1)}%`, style: 'kpiValue', alignment: 'center', color: COLORS.primary, fillColor: COLORS.primaryLight, border: [false, false, false, false] },
        ],
      ],
    },
    margin: [0, 0, 0, 24],
  });

  content.push(
    { text: 'Profit & Loss', style: 'sectionTitle', margin: [0, 0, 0, 12] },
  );
  for (const section of profitLoss.sections) {
    const t = section.type === 'revenue' ? 'rev' : 'exp';
    content.push(sectionTable(section, t));
  }
  content.push({
    columns: [
      { text: '', width: '*', border: [false, false, false, false] },
      { width: 'auto', stack: [
        { text: `Net Income: ${fmt(profitLoss.netIncome)}`, style: 'totalLabel', color: profitLoss.netIncome >= 0 ? COLORS.green : COLORS.red, margin: [0, 4, 0, 4] },
        { text: `Profit Margin: ${profitLoss.netIncomeRatio.toFixed(1)}%`, style: 'totalLabel', margin: [0, 0, 0, 16] },
      ]},
    ],
  });

  content.push(
    { text: 'Balance Sheet', style: 'sectionTitle', margin: [0, 0, 0, 12] },
  );
  for (const section of balanceSheet.sections) {
    const t = section.type as 'asset' | 'liability' | 'equity';
    content.push(sectionTable(section, t));
  }
  content.push({
    layout: 'noBorders',
    table: {
      widths: ['*', '*', '*'],
      body: [[
        { text: `Assets: ${fmt(balanceSheet.totalAssets)}`, style: 'balanceSummary', alignment: 'center', color: COLORS.primary, fillColor: COLORS.primaryLight, border: [false, false, false, false] },
        { text: `Liabilities: ${fmt(balanceSheet.totalLiabilities)}`, style: 'balanceSummary', alignment: 'center', color: COLORS.textSecondary, fillColor: COLORS.surface, border: [false, false, false, false] },
        { text: `Equity: ${fmt(balanceSheet.totalEquity)}`, style: 'balanceSummary', alignment: 'center', color: COLORS.green, fillColor: COLORS.greenLight, border: [false, false, false, false] },
      ]],
    },
    margin: [0, 0, 0, 16],
  });

  if (cashFlow && cashFlow.sections.length > 0) {
    content.push(
      { text: 'Cash Flow Statement', style: 'sectionTitle', margin: [0, 0, 0, 12] },
    );
    for (const section of cashFlow.sections) {
      if (section.items.length === 0) continue;
      const cfBody = section.items.map((item: any) => [
        { text: item.accountCode, style: 'codeCell', border: [false, false, false, true] },
        { text: item.accountName, style: 'cell', border: [false, false, false, true] },
        { text: fmt(item.amount), style: 'cell', alignment: 'right', border: [false, false, false, true], color: item.amount >= 0 ? COLORS.green : COLORS.red },
      ]);
      content.push({
        table: {
          headerRows: 1,
          widths: [48, '*', 'auto'],
          body: [
            [{ text: section.title, style: 'subSectionTitle', colSpan: 3, alignment: 'left', border: [false, false, false, false] }, {}, {}],
            ...cfBody,
            [
              { text: '', style: 'boldCell', border: [false, false, false, false] },
              { text: 'Total', style: 'boldCell', border: [false, false, false, false] },
              { text: fmt(section.total), style: 'boldCell', alignment: 'right', border: [false, false, false, false], color: section.total >= 0 ? COLORS.green : COLORS.red },
            ],
          ],
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => COLORS.border },
        margin: [0, 0, 0, 12],
      });
    }
    content.push({
      columns: [
        { text: '', width: '*' },
        { width: 'auto', stack: [
          { text: `Net Change in Cash: ${fmt(cashFlow.totalChange)}`, style: 'totalLabel', color: cashFlow.totalChange >= 0 ? COLORS.green : COLORS.red, margin: [0, 4, 0, 16] },
        ]},
      ],
    });
  }

  if (trialBalance && trialBalance.rows.length > 0) {
    content.push(
      { text: 'Trial Balance', style: 'sectionTitle', margin: [0, 0, 0, 12] },
    );
    const tbBody = trialBalance.rows.map((row: any) => [
      { text: row.accountCode, style: 'codeCell', border: [false, false, false, true] },
      { text: row.accountName, style: 'cell', border: [false, false, false, true] },
      { text: row.accountType, style: 'cell', border: [false, false, false, true], color: COLORS.textSecondary },
      { text: row.totalDebits.toFixed(2), style: 'cell', alignment: 'right', border: [false, false, false, true] },
      { text: row.totalCredits.toFixed(2), style: 'cell', alignment: 'right', border: [false, false, false, true] },
    ]);
    content.push({
      table: {
        headerRows: 1,
        widths: [48, '*', 60, 'auto', 'auto'],
        body: [
          [
            { text: 'Code', style: 'tableHeader' },
            { text: 'Account', style: 'tableHeader' },
            { text: 'Type', style: 'tableHeader' },
            { text: 'Debits', style: 'tableHeader', alignment: 'right' },
            { text: 'Credits', style: 'tableHeader', alignment: 'right' },
          ],
          ...tbBody,
          [
            { text: '', style: 'boldCell', border: [false, false, false, false] },
            { text: 'TOTAL', style: 'boldCell', border: [false, false, false, false] },
            { text: '', style: 'boldCell', border: [false, false, false, false] },
            { text: trialBalance.totals.totalDebits.toFixed(2), style: 'boldCell', alignment: 'right', border: [false, false, false, false] },
            { text: trialBalance.totals.totalCredits.toFixed(2), style: 'boldCell', alignment: 'right', border: [false, false, false, false] },
          ],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => COLORS.border },
      margin: [0, 0, 0, 8],
    });
    content.push({
      text: trialBalance.totals.balanced ? '✓ Trial Balance is balanced' : '⚠ Trial Balance is out of balance',
      style: 'smallText',
      color: trialBalance.totals.balanced ? COLORS.green : COLORS.red,
      alignment: 'center',
      margin: [0, 0, 0, 16],
    });
  }

  content.push({ text: '', margin: [0, 8, 0, 0] });
  content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 496, y2: 0, lineWidth: 1, lineColor: COLORS.border }], margin: [0, 0, 0, 8] });
  content.push({ text: 'Generated by BookKeep', style: 'footer', alignment: 'center' });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    content,
    styles: {
      reportTitle: { fontSize: 24, bold: true, color: COLORS.primary },
      ownerName: { fontSize: 14, color: COLORS.textSecondary },
      dateLabel: { fontSize: 11, color: COLORS.textMuted },
      sectionTitle: { fontSize: 16, bold: true, color: COLORS.text },
      subSectionTitle: { fontSize: 11, bold: true, color: COLORS.primary, margin: [0, 8, 0, 4] },
      tableHeader: { fontSize: 9, bold: true, color: COLORS.textMuted, fillColor: COLORS.surface, margin: [4, 6, 4, 6] },
      cell: { fontSize: 10, color: COLORS.text, margin: [4, 4, 4, 4] },
      boldCell: { fontSize: 10, bold: true, color: COLORS.text, margin: [4, 4, 4, 4] },
      codeCell: { fontSize: 9, color: COLORS.textMuted, margin: [4, 4, 4, 4] },
      kpiLabel: { fontSize: 8, bold: true, color: COLORS.textSecondary, margin: [4, 8, 4, 2] },
      kpiValue: { fontSize: 14, bold: true, margin: [4, 2, 4, 8] },
      totalLabel: { fontSize: 12, bold: true, color: COLORS.text },
      balanceSummary: { fontSize: 10, bold: true, margin: [8, 8, 8, 8] },
      footer: { fontSize: 9, color: COLORS.textMuted },
      smallText: { fontSize: 10, color: COLORS.textSecondary },
    },
  };

  return docDefinition;
}
