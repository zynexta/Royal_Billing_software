import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethod } from '../types/index.js';

export interface IPayment extends Document {
  invoiceId?: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  status: 'Completed' | 'Reversed';
  reversedAt?: Date;
  reversalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    amount: { type: Number, required: true, min: [0.01, 'Payment amount must be greater than zero'] },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'],
      required: true,
      default: 'Bank Transfer',
    },
    transactionReference: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Completed', 'Reversed'],
      default: 'Completed',
      index: true,
    },
    reversedAt: { type: Date },
    reversalReason: { type: String },
  },
  { timestamps: true }
);

PaymentSchema.index({ paymentDate: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

