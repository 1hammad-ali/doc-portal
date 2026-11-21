import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';
import { PhysicalCustodyStatus, SystemRole } from '@prisma/client';

export const custodyRouter = Router();

// Handler for Physical Hardcopy Checkout
export const handlePhysicalCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { issuedToUserId, issuedToExternal, issuedToDesignation, purpose, expectedReturnAt } = req.body;

    if (!purpose || !expectedReturnAt) {
      res.status(400).json({ error: 'Purpose and Expected Return Date/Time are mandatory for hardcopy removal' });
      return;
    }

    if (!issuedToUserId && !issuedToExternal) {
      res.status(400).json({ error: 'Recipient Officer Name or User selection is required' });
      return;
    }

    const letter = await prisma.letter.findUnique({ where: { id: req.params.id } });
    if (!letter) {
      res.status(404).json({ error: 'Letter record not found' });
      return;
    }

    let holderName = issuedToExternal || 'Designated Officer';
    let designation = issuedToDesignation || '';

    if (issuedToUserId) {
      const u = await prisma.user.findUnique({ where: { id: issuedToUserId } });
      if (u) {
        holderName = u.fullName;
        if (!designation) designation = u.designation;
      }
    }

    if (!designation || designation.trim().length === 0) {
      res.status(400).json({ error: 'Recipient Officer Designation / Post is mandatory' });
      return;
    }

    const fullHolderTitle = `${holderName} (${designation})`;
    const checkedOutAt = new Date();

    // 1. Update letter flags
    const updatedLetter = await prisma.letter.update({
      where: { id: req.params.id },
      data: {
        isAttachedInPhysicalFile: false,
        physicalCustodyStatus: PhysicalCustodyStatus.ISSUED_OUT_TO_OFFICER,
        physicalHolderName: fullHolderTitle,
        physicalDueReturnDate: new Date(expectedReturnAt),
      },
    });

    // 2. Append PhysicalCustodyLog with exact auto-timestamp and designation
    const log = await prisma.physicalCustodyLog.create({
      data: {
        letterId: req.params.id,
        actionType: 'REMOVED_FROM_FILE',
        issuedToUserId: issuedToUserId || null,
        issuedToExternal: issuedToExternal || null,
        issuedToDesignation: designation,
        purpose,
        checkedOutAt,
        expectedReturnAt: new Date(expectedReturnAt),
        verifiedByClerkId: req.user!.id,
      },
      include: {
        issuedToUser: {
          select: { id: true, fullName: true, designation: true },
        },
      },
    });

    // 3. Write immutable audit log
    await logAuditEvent({
      userId: req.user!.id,
      action: 'CHECKOUT_PHYSICAL',
      entityType: 'LETTER',
      entityId: req.params.id,
      req,
      metadata: { holderName, designation, purpose, expectedReturnAt, checkedOutAt },
    });

    res.json({ success: true, letter: updatedLetter, log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Handler for Physical Hardcopy Checkin
export const handlePhysicalCheckin = async (req: Request, res: Response): Promise<void> => {
  try {
    const letter = await prisma.letter.findUnique({ where: { id: req.params.id } });
    if (!letter) {
      res.status(404).json({ error: 'Letter record not found' });
      return;
    }

    const returnedAt = new Date();

    // Update letter to ATTACHED_IN_FILE
    const updatedLetter = await prisma.letter.update({
      where: { id: req.params.id },
      data: {
        isAttachedInPhysicalFile: true,
        physicalCustodyStatus: PhysicalCustodyStatus.ATTACHED_IN_FILE,
        physicalHolderName: null,
        physicalDueReturnDate: null,
      },
    });

    // Update pending custody logs
    await prisma.physicalCustodyLog.updateMany({
      where: {
        letterId: req.params.id,
        returnedAt: null,
      },
      data: {
        returnedAt,
      },
    });

    await logAuditEvent({
      userId: req.user!.id,
      action: 'CHECKIN_PHYSICAL',
      entityType: 'LETTER',
      entityId: req.params.id,
      req,
      metadata: { returnedByClerk: req.user!.fullName, returnedAt },
    });

    res.json({ success: true, letter: updatedLetter, returnedAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Mount handlers on custodyRouter
custodyRouter.post('/:id/physical-checkout', authenticateToken, handlePhysicalCheckout);
custodyRouter.post('/:id/physical-checkin', authenticateToken, handlePhysicalCheckin);

// GET /api/v1/custody/overdue - Fetch all checked-out physical originals past due date
custodyRouter.get('/overdue', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const overdueLetters = await prisma.letter.findMany({
      where: {
        deletedAt: null,
        isAttachedInPhysicalFile: false,
        physicalDueReturnDate: {
          lt: new Date(),
        },
      },
      include: {
        department: true,
        fileLinks: {
          include: { file: true },
        },
        custodyLogs: {
          where: { returnedAt: null },
          include: { issuedToUser: true },
          orderBy: { checkedOutAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { physicalDueReturnDate: 'asc' },
    });

    res.json(overdueLetters);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/custody/register - Full Physical File Movement Out-Register & Ledger
custodyRouter.get('/register', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { letterId, status, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (letterId && typeof letterId === 'string') {
      where.letterId = letterId;
    }

    if (status === 'OVERDUE') {
      where.returnedAt = null;
      where.expectedReturnAt = { lt: new Date() };
    } else if (status === 'OUT') {
      where.returnedAt = null;
    } else if (status === 'RETURNED') {
      where.returnedAt = { not: null };
    }

    const take = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * take;

    const [total, logs] = await Promise.all([
      prisma.physicalCustodyLog.count({ where }),
      prisma.physicalCustodyLog.findMany({
        where,
        include: {
          issuedToUser: {
            select: { id: true, fullName: true, designation: true, employeeCode: true },
          },
          letter: {
            select: {
              id: true,
              diaryNumber: true,
              barcode: true,
              subject: true,
              letterType: true,
              priority: true,
              isAttachedInPhysicalFile: true,
              department: { select: { code: true, name: true, shortName: true } },
              fileLinks: {
                select: {
                  folioNumber: true,
                  file: { select: { fileNumber: true, title: true, rackLocation: true } },
                },
              },
            },
          },
        },
        orderBy: { checkedOutAt: 'desc' },
        take,
        skip,
      }),
    ]);

    const enrichedLogs = logs.map((log) => {
      let movementStatus: 'RETURNED_IN_FILE' | 'OVERDUE' | 'OUT_TO_OFFICER' = 'RETURNED_IN_FILE';
      if (!log.returnedAt) {
        movementStatus = new Date() > new Date(log.expectedReturnAt) ? 'OVERDUE' : 'OUT_TO_OFFICER';
      }

      const officerName = log.issuedToUser?.fullName || log.issuedToExternal || 'Designated Officer';
      const officerDesignation = log.issuedToDesignation || log.issuedToUser?.designation || 'Officer';

      return {
        ...log,
        movementStatus,
        officerName,
        officerDesignation,
        officerFormatted: `${officerName} (${officerDesignation})`,
      };
    });

    res.json({
      total,
      page: parseInt(page as string, 10),
      totalPages: Math.ceil(total / take),
      logs: enrichedLogs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
