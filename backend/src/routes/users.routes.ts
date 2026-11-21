import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { logAuditEvent } from '../middleware/audit.js';
import { SystemRole } from '@prisma/client';

export const usersRouter = Router();

// GET /api/v1/users - List users with departments and role filters
usersRouter.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, role, departmentId, isActive } = req.query;

    const where: any = {};

    if (role && typeof role === 'string') {
      where.role = role as SystemRole;
    }

    if (departmentId && typeof departmentId === 'string') {
      where.OR = [
        { primaryDeptId: departmentId },
        { deptAccess: { some: { departmentId } } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (q && typeof q === 'string') {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { employeeCode: { contains: q, mode: 'insensitive' } },
            { designation: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        designation: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        primaryDept: {
          select: { id: true, code: true, name: true, shortName: true },
        },
        deptAccess: {
          include: {
            department: {
              select: { id: true, code: true, name: true, shortName: true },
            },
          },
        },
        folderPermissions: {
          include: {
            file: {
              select: { id: true, fileNumber: true, title: true, category: true, isConfidential: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/users/:id - Single user details with full access matrix
usersRouter.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        designation: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        primaryDept: {
          select: { id: true, code: true, name: true, shortName: true },
        },
        deptAccess: {
          include: {
            department: {
              select: { id: true, code: true, name: true, shortName: true },
            },
          },
        },
        folderPermissions: {
          include: {
            file: {
              select: { id: true, fileNumber: true, title: true, category: true, isConfidential: true },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User record not found' });
      return;
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/users - Create new Government Officer / System User
usersRouter.post(
  '/',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        employeeCode,
        fullName,
        designation,
        email,
        phone,
        password,
        role = SystemRole.DEALING_ASSISTANT,
        primaryDeptId,
        isActive = true,
      } = req.body;

      if (!employeeCode || !fullName || !designation || !email || !primaryDeptId) {
        res.status(400).json({
          error: 'Employee Code, Full Name, Designation, Email, and Primary Department are mandatory',
        });
        return;
      }

      // Check unique constraints
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { employeeCode }],
        },
      });

      if (existing) {
        res.status(409).json({
          error: existing.email === email ? 'User with this Email already exists' : 'Employee Code is already assigned',
        });
        return;
      }

      const defaultPassword = password || 'GovSecurePassword2026!';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          employeeCode,
          fullName,
          designation,
          email,
          phone: phone || null,
          passwordHash,
          role: role as SystemRole,
          primaryDeptId,
          isActive: Boolean(isActive),
          deptAccess: {
            create: {
              departmentId: primaryDeptId,
              canView: true,
              canCreate: true,
              canEdit: true,
              canDownmark: role === SystemRole.EXECUTIVE_OFFICER || role === SystemRole.SUPER_ADMIN || role === SystemRole.DEPT_ADMIN,
              canCheckoutPhysical: role === SystemRole.DOC_CONTROLLER || role === SystemRole.SUPER_ADMIN,
              canExport: true,
              canDelete: role === SystemRole.SUPER_ADMIN,
            },
          },
        },
        include: {
          primaryDept: true,
          deptAccess: { include: { department: true } },
        },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'CREATE_USER',
        entityType: 'USER',
        entityId: newUser.id,
        req,
        metadata: { employeeCode, fullName, email, role, primaryDeptId },
      });

      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/users/:id - Update user profile
usersRouter.put(
  '/:id',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fullName, designation, phone, role, primaryDeptId, employeeCode, isActive } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) {
        res.status(404).json({ error: 'User record not found' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          ...(fullName && { fullName }),
          ...(designation && { designation }),
          ...(phone !== undefined && { phone }),
          ...(role && { role: role as SystemRole }),
          ...(primaryDeptId && { primaryDeptId }),
          ...(employeeCode && { employeeCode }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
        include: {
          primaryDept: true,
          deptAccess: { include: { department: true } },
          folderPermissions: { include: { file: true } },
        },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'UPDATE_USER',
        entityType: 'USER',
        entityId: user.id,
        req,
        metadata: { changes: req.body },
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /api/v1/users/:id/status - Activate / Deactivate user
usersRouter.patch(
  '/:id/status',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { isActive } = req.body;

      if (isActive === undefined) {
        res.status(400).json({ error: 'isActive boolean flag is required' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: Boolean(isActive) },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entityType: 'USER',
        entityId: updated.id,
        req,
        metadata: { isActive },
      });

      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/v1/users/:id/reset-password - Reset User Password
usersRouter.post(
  '/:id/reset-password',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters long' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: req.params.id },
        data: { passwordHash },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'RESET_PASSWORD',
        entityType: 'USER',
        entityId: req.params.id,
        req,
        metadata: { resetBy: req.user!.fullName },
      });

      res.json({ success: true, message: 'Password has been successfully updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/users/:id/access-matrix - Assign Multi-Department Permissions
usersRouter.put(
  '/:id/access-matrix',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { permissions } = req.body; // Array of { departmentId, canView, canCreate, canEdit, canDownmark, canCheckoutPhysical, canExport, canDelete }

      if (!Array.isArray(permissions)) {
        res.status(400).json({ error: 'Permissions must be an array of department permission objects' });
        return;
      }

      const userId = req.params.id;

      // Upsert each permission
      for (const p of permissions) {
        await prisma.userDepartmentAccess.upsert({
          where: {
            userId_departmentId: {
              userId,
              departmentId: p.departmentId,
            },
          },
          update: {
            canView: p.canView !== undefined ? Boolean(p.canView) : true,
            canCreate: p.canCreate !== undefined ? Boolean(p.canCreate) : false,
            canEdit: p.canEdit !== undefined ? Boolean(p.canEdit) : false,
            canDownmark: p.canDownmark !== undefined ? Boolean(p.canDownmark) : false,
            canCheckoutPhysical: p.canCheckoutPhysical !== undefined ? Boolean(p.canCheckoutPhysical) : false,
            canExport: p.canExport !== undefined ? Boolean(p.canExport) : true,
            canDelete: p.canDelete !== undefined ? Boolean(p.canDelete) : false,
          },
          create: {
            userId,
            departmentId: p.departmentId,
            canView: p.canView !== undefined ? Boolean(p.canView) : true,
            canCreate: p.canCreate !== undefined ? Boolean(p.canCreate) : false,
            canEdit: p.canEdit !== undefined ? Boolean(p.canEdit) : false,
            canDownmark: p.canDownmark !== undefined ? Boolean(p.canDownmark) : false,
            canCheckoutPhysical: p.canCheckoutPhysical !== undefined ? Boolean(p.canCheckoutPhysical) : false,
            canExport: p.canExport !== undefined ? Boolean(p.canExport) : true,
            canDelete: p.canDelete !== undefined ? Boolean(p.canDelete) : false,
          },
        });
      }

      await logAuditEvent({
        userId: req.user!.id,
        action: 'UPDATE_ACCESS_MATRIX',
        entityType: 'USER',
        entityId: userId,
        req,
        metadata: { permissionsCount: permissions.length },
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          deptAccess: { include: { department: true } },
          folderPermissions: { include: { file: true } },
        },
      });

      res.json(updatedUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/users/:id/folder-permissions - Assign Folder/File Level Overrides
usersRouter.put(
  '/:id/folder-permissions',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId, canRead = true, canWrite = false, canCheckout = false } = req.body;

      if (!fileId) {
        res.status(400).json({ error: 'fileId is required' });
        return;
      }

      const userId = req.params.id;

      const perm = await prisma.userFolderPermission.upsert({
        where: {
          userId_fileId: {
            userId,
            fileId,
          },
        },
        update: {
          canRead: Boolean(canRead),
          canWrite: Boolean(canWrite),
          canCheckout: Boolean(canCheckout),
        },
        create: {
          userId,
          fileId,
          canRead: Boolean(canRead),
          canWrite: Boolean(canWrite),
          canCheckout: Boolean(canCheckout),
        },
        include: {
          file: true,
        },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'SET_FOLDER_PERMISSION',
        entityType: 'USER',
        entityId: userId,
        req,
        metadata: { fileId, fileNumber: perm.file.fileNumber, canRead, canWrite, canCheckout },
      });

      res.json(perm);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/v1/users/:id/folder-permissions/:fileId - Revoke Folder/File Override
usersRouter.delete(
  '/:id/folder-permissions/:fileId',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: userId, fileId } = req.params;

      await prisma.userFolderPermission.deleteMany({
        where: { userId, fileId },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'REVOKE_FOLDER_PERMISSION',
        entityType: 'USER',
        entityId: userId,
        req,
        metadata: { fileId },
      });

      res.json({ success: true, message: 'Folder permission override revoked' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/users/:id/permissions - Unified Granular Permission Matrix Manager
usersRouter.put(
  '/:id/permissions',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const {
        deptAccess,
        folderPermissions,
        removeDeptIds,
        removeFileIds,
      } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'User record not found' });
        return;
      }

      // 1. Remove explicit depts if requested
      if (Array.isArray(removeDeptIds) && removeDeptIds.length > 0) {
        await prisma.userDepartmentAccess.deleteMany({
          where: {
            userId,
            departmentId: { in: removeDeptIds },
          },
        });
      }

      // 2. Upsert department permissions
      if (Array.isArray(deptAccess)) {
        for (const da of deptAccess) {
          if (!da.departmentId) continue;
          await prisma.userDepartmentAccess.upsert({
            where: {
              userId_departmentId: {
                userId,
                departmentId: da.departmentId,
              },
            },
            update: {
              canView: da.canView !== undefined ? Boolean(da.canView) : true,
              canCreate: da.canCreate !== undefined ? Boolean(da.canCreate) : false,
              canEdit: da.canEdit !== undefined ? Boolean(da.canEdit) : false,
              canDownmark: da.canDownmark !== undefined ? Boolean(da.canDownmark) : false,
              canCheckoutPhysical: da.canCheckoutPhysical !== undefined ? Boolean(da.canCheckoutPhysical) : false,
              canExport: da.canExport !== undefined ? Boolean(da.canExport) : true,
              canDelete: da.canDelete !== undefined ? Boolean(da.canDelete) : false,
            },
            create: {
              userId,
              departmentId: da.departmentId,
              canView: da.canView !== undefined ? Boolean(da.canView) : true,
              canCreate: da.canCreate !== undefined ? Boolean(da.canCreate) : false,
              canEdit: da.canEdit !== undefined ? Boolean(da.canEdit) : false,
              canDownmark: da.canDownmark !== undefined ? Boolean(da.canDownmark) : false,
              canCheckoutPhysical: da.canCheckoutPhysical !== undefined ? Boolean(da.canCheckoutPhysical) : false,
              canExport: da.canExport !== undefined ? Boolean(da.canExport) : true,
              canDelete: da.canDelete !== undefined ? Boolean(da.canDelete) : false,
            },
          });
        }
      }

      // 3. Remove explicit folder overrides if requested
      if (Array.isArray(removeFileIds) && removeFileIds.length > 0) {
        await prisma.userFolderPermission.deleteMany({
          where: {
            userId,
            fileId: { in: removeFileIds },
          },
        });
      }

      // 4. Upsert folder permissions
      if (Array.isArray(folderPermissions)) {
        for (const fp of folderPermissions) {
          if (!fp.fileId) continue;
          await prisma.userFolderPermission.upsert({
            where: {
              userId_fileId: {
                userId,
                fileId: fp.fileId,
              },
            },
            update: {
              canRead: fp.canRead !== undefined ? Boolean(fp.canRead) : true,
              canWrite: fp.canWrite !== undefined ? Boolean(fp.canWrite) : false,
              canCheckout: fp.canCheckout !== undefined ? Boolean(fp.canCheckout) : false,
            },
            create: {
              userId,
              fileId: fp.fileId,
              canRead: fp.canRead !== undefined ? Boolean(fp.canRead) : true,
              canWrite: fp.canWrite !== undefined ? Boolean(fp.canWrite) : false,
              canCheckout: fp.canCheckout !== undefined ? Boolean(fp.canCheckout) : false,
            },
          });
        }
      }

      await logAuditEvent({
        userId: req.user!.id,
        action: 'UPDATE_USER_PERMISSIONS',
        entityType: 'USER',
        entityId: userId,
        req,
        metadata: {
          deptAccessCount: deptAccess?.length,
          folderPermissionsCount: folderPermissions?.length,
          removeDeptIds,
          removeFileIds,
        },
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          primaryDept: true,
          deptAccess: { include: { department: true } },
          folderPermissions: { include: { file: true } },
        },
      });

      res.json(updatedUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/v1/users/:id/access-matrix/:deptId - Revoke Department Access
usersRouter.delete(
  '/:id/access-matrix/:deptId',
  authenticateToken,
  requireRole([SystemRole.SUPER_ADMIN, SystemRole.DEPT_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: userId, deptId } = req.params;

      await prisma.userDepartmentAccess.deleteMany({
        where: { userId, departmentId: deptId },
      });

      await logAuditEvent({
        userId: req.user!.id,
        action: 'REVOKE_DEPT_ACCESS',
        entityType: 'USER',
        entityId: userId,
        req,
        metadata: { departmentId: deptId },
      });

      res.json({ success: true, message: 'Department access successfully revoked' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
