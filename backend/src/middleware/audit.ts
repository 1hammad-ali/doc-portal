import { Request } from 'express';
import { prisma } from '../lib/prisma.js';

interface AuditLogParams {
  userId: string;
  action: string;
  entityType: 'LETTER' | 'FILE' | 'USER' | 'DEPARTMENT' | 'SYSTEM' | 'CUSTODY';
  entityId: string;
  req?: Request;
  metadata?: Record<string, any>;
}

export async function logAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  req,
  metadata = {},
}: AuditLogParams): Promise<void> {
  try {
    const ipAddress = req
      ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
      : '127.0.0.1';
    const userAgent = req ? req.headers['user-agent'] || 'GovEDMS Client' : 'GovEDMS Internal';

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        userAgent,
        metadata,
      },
    });
  } catch (err) {
    console.error('❌ Failed to write immutable AuditLog entry:', err);
  }
}
