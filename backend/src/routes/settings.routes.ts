import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { logAuditEvent } from '../middleware/audit.js';
import { SystemRole } from '@prisma/client';

export const settingsRouter = Router();

// GET /api/v1/admin/settings - Retrieve portal settings and branding
settingsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 'default',
          portalTitle: 'GovEDMS — National Document & e-File Management System',
          watermarkText: 'GOVERNMENT OF PAKISTAN — CONFIDENTIAL',
        },
      });
    }

    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/admin/settings - Update portal branding & settings (Super Admin Only)
settingsRouter.put(
  '/',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { portalTitle, logoUrl, logoBase64, watermarkText } = req.body;

      const updated = await prisma.systemSettings.upsert({
        where: { id: 'default' },
        update: {
          ...(portalTitle && { portalTitle }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(logoBase64 !== undefined && { logoBase64 }),
          ...(watermarkText && { watermarkText }),
        },
        create: {
          id: 'default',
          portalTitle: portalTitle || 'GovEDMS — National Document & e-File Management System',
          logoUrl: logoUrl || null,
          logoBase64: logoBase64 || null,
          watermarkText: watermarkText || 'GOVERNMENT OF PAKISTAN — CONFIDENTIAL',
        },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entityType: 'DEPARTMENT',
        entityId: 'SYSTEM',
        req,
        metadata: { portalTitle, watermarkText, hasLogo: Boolean(logoBase64 || logoUrl) },
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/v1/admin/settings/logo - Upload or update portal logo emblem
settingsRouter.post(
  '/logo',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { logoBase64, portalTitle, watermarkText } = req.body;

      if (!logoBase64) {
        res.status(400).json({ error: 'logoBase64 data is required' });
        return;
      }

      const updated = await prisma.systemSettings.upsert({
        where: { id: 'default' },
        update: {
          logoBase64,
          ...(portalTitle && { portalTitle }),
          ...(watermarkText && { watermarkText }),
        },
        create: {
          id: 'default',
          logoBase64,
          portalTitle: portalTitle || 'GovEDMS — National Document & e-File Management System',
          watermarkText: watermarkText || 'GOVERNMENT OF PAKISTAN — CONFIDENTIAL',
        },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'UPDATE_LOGO',
        entityType: 'DEPARTMENT',
        entityId: 'SYSTEM',
        req,
        metadata: { length: logoBase64.length },
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
