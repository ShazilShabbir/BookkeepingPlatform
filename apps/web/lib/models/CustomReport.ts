import mongoose, { Schema, Document } from 'mongoose';

export interface IReportSection {
  id: string;
  type: 'profit-loss' | 'balance-sheet' | 'cash-flow' | 'trial-balance' | 'budget-vs-actual' | 'category-breakdown' | 'trend' | 'kpi-summary';
  chartType: 'table' | 'bar' | 'line' | 'pie' | 'area';
  title: string;
  metric?: 'revenue' | 'expenses' | 'profit' | 'count';
  groupBy?: 'month' | 'category' | 'account';
}

export interface IReportFilter {
  datePreset?: '7d' | '30d' | '90d' | '1y' | 'custom';
  startDate?: string;
  endDate?: string;
  accountCodes?: string[];
  accountTypes?: string[];
}

export interface ICustomReport extends Document {
  userId: string;
  name: string;
  sections: IReportSection[];
  filters: IReportFilter;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSectionSchema = new Schema<IReportSection>({
  id: { type: String, required: true },
  type: { type: String, required: true, enum: ['profit-loss', 'balance-sheet', 'cash-flow', 'trial-balance', 'budget-vs-actual', 'category-breakdown', 'trend', 'kpi-summary'] },
  chartType: { type: String, required: true, enum: ['table', 'bar', 'line', 'pie', 'area'] },
  title: { type: String, required: true },
  metric: { type: String, enum: ['revenue', 'expenses', 'profit', 'count'] },
  groupBy: { type: String, enum: ['month', 'category', 'account'] },
}, { _id: false });

const ReportFilterSchema = new Schema<IReportFilter>({
  datePreset: { type: String, enum: ['7d', '30d', '90d', '1y', 'custom'] },
  startDate: String,
  endDate: String,
  accountCodes: [String],
  accountTypes: [String],
}, { _id: false });

const CustomReportSchema = new Schema<ICustomReport>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    sections: { type: [ReportSectionSchema], default: [] },
    filters: { type: ReportFilterSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export default (mongoose.models.CustomReport as mongoose.Model<ICustomReport>) || mongoose.model<ICustomReport>('CustomReport', CustomReportSchema);
