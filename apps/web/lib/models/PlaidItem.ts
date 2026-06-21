// Plaid removed — Pakistani developers cannot register for Plaid
import mongoose, { Schema, Document } from 'mongoose';
export interface IPlaidItem extends Document { userId: string; }
const PlaidItemSchema = new Schema<IPlaidItem>({ userId: { type: String } });
export default mongoose.models.PlaidItem || mongoose.model<IPlaidItem>('PlaidItem', PlaidItemSchema);
