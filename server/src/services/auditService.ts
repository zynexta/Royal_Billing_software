import { AuditLog } from '../models/AuditLog.js';

export async function logAudit(params: {
  action: string;
  entityType: 'Invoice' | 'Payment' | 'Client' | 'Settings' | 'Auth' | 'Quotation';
  entityId?: string;
  userId?: string;
  userName?: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    await AuditLog.create({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      userName: params.userName || 'System',
      details: params.details || {},
    });
  } catch (err) {
    console.error('Audit log creation error:', err);
  }
}

