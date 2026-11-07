import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  entityType: 'Invoice' | 'Payment' | 'Client' | 'Settings' | 'Auth';
  entityId?: string;
  userId?: string;
  userName?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, enum: ['Invoice', 'Payment', 'Client', 'Settings', 'Auth'], index: true },
    entityId: { type: String },
    userId: { type: String },
    userName: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

