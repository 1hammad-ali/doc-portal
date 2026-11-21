import { Request, Response, NextFunction } from 'express';
import { SystemRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * requireRole: Guards routes by checking allowed System Roles.
 * SUPER_ADMIN has system-wide override privileges.
 */
export function requireRole(allowedRoles: SystemRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role === SystemRole.SUPER_ADMIN || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      error: `Access Denied: Role '${req.user.role}' lacks sufficient clearance for this operation`,
    });
  };
}

/**
 * requireDepartmentAccess: Enforces cross-department authorization rules.
 * Verifies if user belongs to primary department OR has explicit UserDepartmentAccess entry.
 */
export function requireDepartmentAccess(
  action: 'canView' | 'canCreate' | 'canEdit' | 'canDownmark' | 'canCheckoutPhysical' | 'canExport' | 'canDelete' = 'canCreate'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Super Admin has national access across all ministries and departments
    if (req.user.role === SystemRole.SUPER_ADMIN) {
      next();
      return;
    }

    const deptId = req.params.departmentId || req.body.departmentId || req.query.departmentId as string;

    if (!deptId) {
      next();
      return;
    }

    // Check if it's the user's primary department
    if (req.user.primaryDeptId === deptId) {
      next();
      return;
    }

    // Check multi-department access record
    const access = req.user.deptAccess.find((a) => a.departmentId === deptId);
    if (access && access[action]) {
      next();
      return;
    }

    res.status(403).json({
      error: `Access Denied: You do not hold '${action}' clearance for Department ID: ${deptId}`,
    });
  };
}

/**
 * requireFolderAccess: Evaluates folder-level / confidential file ACLs.
 */
export function requireFolderAccess(action: 'canRead' | 'canWrite' | 'canCheckout' = 'canRead') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role === SystemRole.SUPER_ADMIN) {
      next();
      return;
    }

    const fileId = req.params.fileId || req.params.id || req.body.fileId;
    if (!fileId) {
      next();
      return;
    }

    const file = await prisma.govFile.findUnique({
      where: { id: fileId },
      select: { departmentId: true, isConfidential: true },
    });

    if (!file) {
      res.status(404).json({ error: 'Requested File Jacket not found' });
      return;
    }

    // If file is not confidential and user belongs to same department
    if (!file.isConfidential) {
      if (req.user.primaryDeptId === file.departmentId || req.user.deptAccess.some((a) => a.departmentId === file.departmentId)) {
        next();
        return;
      }
    }

    // For confidential files or cross-department files, verify explicit UserFolderPermission
    const folderPermission = await prisma.userFolderPermission.findUnique({
      where: {
        userId_fileId: {
          userId: req.user.id,
          fileId: fileId,
        },
      },
    });

    if (folderPermission && folderPermission[action]) {
      next();
      return;
    }

    res.status(403).json({
      error: `Security Classification Alert: Explicit '${action}' permission required to access this file jacket`,
    });
  };
}

/**
 * requireAdminDelete: Only SUPER_ADMIN and DEPT_ADMIN can delete records.
 * Mandatory deletion reason is enforced.
 */
export function requireAdminDelete() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const isAuthorized = req.user.role === SystemRole.SUPER_ADMIN || req.user.role === SystemRole.DEPT_ADMIN;
    if (!isAuthorized) {
      res.status(403).json({
        error: 'Sovereign Compliance Rule: Only Super Admins and Department Admins may delete government records',
      });
      return;
    }

    const reason = req.body.reason || req.query.reason;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      res.status(400).json({
        error: 'Mandatory Compliance Requirement: A detailed deletion reason (min 5 chars) must be provided for the forensic audit log',
      });
      return;
    }

    next();
  };
}
