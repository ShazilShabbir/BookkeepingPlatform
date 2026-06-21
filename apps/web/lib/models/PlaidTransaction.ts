// Plaid removed — Pakistani developers cannot register for Plaid
import mongoose, { Schema, Document } from 'mongoose';
export interface IPlaidTransaction extends Document { userId: string; }
const PlaidTransactionSchema = new Schema<IPlaidTransaction>({ userId: { type: String } });
export default mongoose.models.PlaidTransaction || mongoose.model<IPlaidTransaction>('PlaidTransaction', PlaidTransactionSchema);
