import mongoose, { Document, Schema } from 'mongoose';

export type ExpenseCategory =
  | 'Labour Charges'
  | 'Material Purchase'
  | 'Transportation'
  | 'Equipment Rental'
  | 'Food & Accommodation'
  | 'Other';

export type ExpensePaymentMethod = 'Cash' | 'Bank Transfer' | 'UPI' | 'Other';

export interface IExpense extends Document {
  clientId: mongoose.Types.ObjectId;
  clientSnapshot: {
    clientName: string;
    phone?: string;
    city?: string;
  };
  projectName: string;
  projectLocation?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: Date;
  paymentMethod: ExpensePaymentMethod;
  notes?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
      index: true,
    },
    clientSnapshot: {
      clientName: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      index: true,
    },
    projectLocation: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Labour Charges',
        'Material Purchase',
        'Transportation',
        'Equipment Rental',
        'Food & Accommodation',
        'Other',
      ],
      required: [true, 'Category is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    expenseDate: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Other'],
      required: [true, 'Payment method is required'],
      default: 'Cash',
    },
    notes: {
      type: String,
      trim: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast reporting and project-wise filtering
ExpenseSchema.index({ clientId: 1, projectName: 1 });
ExpenseSchema.index({ expenseDate: -1 });
ExpenseSchema.index({ category: 1, expenseDate: -1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
