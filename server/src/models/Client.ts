import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  clientName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  billingAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    clientName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    billingAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    gstin: { type: String, trim: true, uppercase: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ClientSchema.index({ clientName: 'text', phone: 'text', gstin: 'text' });

export const Client = mongoose.model<IClient>('Client', ClientSchema);

