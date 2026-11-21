import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { SystemRole } from '@prisma/client';
import { logAuditEvent } from '../middleware/audit.js';

export const departmentsRouter = Router();

// GET /api/v1/departments - Get hierarchical tree of departments
departmentsRouter.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: true,
          },
        },
        _count: {
          select: {
            files: true,
            letters: true,
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Return root departments with nested children
    const rootDepartments = departments.filter((d) => d.parentId === null);
    res.json({ departments: rootDepartments, all: departments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/departments - Create new department / wing (Admin only)
departmentsRouter.post(
  '/',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, name, shortName, parentId } = req.body;

      if (!code || !name || !shortName) {
        res.status(400).json({ error: 'Code, Name, and Short Name are required' });
        return;
      }

      const existing = await prisma.department.findUnique({ where: { code } });
      if (existing) {
        res.status(409).json({ error: `Department code '${code}' is already registered` });
        return;
      }

      const dept = await prisma.department.create({
        data: {
          code,
          name,
          shortName,
          parentId: parentId || null,
        },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'CREATE_DEPARTMENT',
        entityType: 'DEPARTMENT',
        entityId: dept.id,
        req,
        metadata: { code, name },
      });

      res.status(201).json(dept);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/v1/departments/:id/users - Get officers belonging to a department
departmentsRouter.get('/:id/users', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { primaryDeptId: req.params.id },
          { deptAccess: { some: { departmentId: req.params.id } } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        designation: true,
        email: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
