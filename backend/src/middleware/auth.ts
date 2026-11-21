import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { SystemRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  email: string;
  role: SystemRole;
  primaryDeptId: string;
  deptAccess: {
    departmentId: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDownmark: boolean;
    canCheckoutPhysical: boolean;
    canExport: boolean;
    canDelete: boolean;
  }[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Access token missing or invalid format' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        deptAccess: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(403).json({ error: 'User account disabled or not found' });
      return;
    }

    req.user = {
      id: user.id,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      designation: user.designation,
      email: user.email,
      role: user.role,
      primaryDeptId: user.primaryDeptId,
      deptAccess: user.deptAccess.map((a) => ({
        departmentId: a.departmentId,
        canView: a.canView,
        canCreate: a.canCreate,
        canEdit: a.canEdit,
        canDownmark: a.canDownmark,
        canCheckoutPhysical: a.canCheckoutPhysical,
        canExport: a.canExport,
        canDelete: a.canDelete,
      })),
    };

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session token' });
  }
}
