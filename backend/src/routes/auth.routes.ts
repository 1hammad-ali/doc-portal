import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Official Email and Password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        primaryDept: true,
        deptAccess: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid government credentials or account inactive' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid government credentials' });
      return;
    }

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
        deptId: user.primaryDeptId,
      },
      config.jwt.accessSecret,
      { expiresIn: '7d' }
    );

    // Forensic audit log
    await logAuditEvent({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      req,
      metadata: { employeeCode: user.employeeCode, designation: user.designation },
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        designation: user.designation,
        email: user.email,
        role: user.role,
        primaryDept: user.primaryDept,
        deptAccess: user.deptAccess,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server authentication error' });
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        primaryDept: true,
        deptAccess: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        designation: user.designation,
        email: user.email,
        phone: user.phone,
        role: user.role,
        primaryDept: user.primaryDept,
        deptAccess: user.deptAccess,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/logout - Terminate session & log audit event
authRouter.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await logAuditEvent({
        userId: req.user.id,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: req.user.id,
        req,
        metadata: { email: req.user.email, employeeCode: req.user.employeeCode },
      });
    }

    res.json({
      success: true,
      message: 'Government session securely terminated and audit logged',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Logout error' });
  }
});

// PATCH /api/v1/auth/profile - Update personal profile details
authRouter.patch('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, phone, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      include: {
        primaryDept: true,
        deptAccess: { include: { department: true } },
      },
    });

    await logAuditEvent({
      userId: req.user!.id,
      action: 'UPDATE_PROFILE',
      entityType: 'USER',
      entityId: req.user!.id,
      req,
      metadata: { fullName, phone },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        employeeCode: updated.employeeCode,
        fullName: updated.fullName,
        designation: updated.designation,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        primaryDept: updated.primaryDept,
        deptAccess: updated.deptAccess,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/auth/change-password - Change personal password
authRouter.patch('/change-password', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User record not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password verification failed' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await logAuditEvent({
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entityType: 'USER',
      entityId: user.id,
      req,
      metadata: { reason: 'User self password reset' },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
