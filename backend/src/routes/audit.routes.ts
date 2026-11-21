import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { SystemRole } from '@prisma/client';

export const auditRouter = Router();

// GET /api/v1/audit-logs - Query immutable forensic access & administrative action trail
auditRouter.get(
  '/',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN, SystemRole.AUDITOR]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        page = '1',
        limit = '50',
      } = req.query;

      const where: any = {};

      if (userId) where.userId = userId as string;
      if (action) where.action = action as string;
      if (entityType) where.entityType = entityType as string;
      if (entityId) where.entityId = entityId as string;

      const take = parseInt(limit as string, 10);
      const skip = (parseInt(page as string, 10) - 1) * take;

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
                designation: true,
                role: true,
                primaryDept: { select: { shortName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
      ]);

      res.json({
        total,
        page: parseInt(page as string, 10),
        totalPages: Math.ceil(total / take),
        logs,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
