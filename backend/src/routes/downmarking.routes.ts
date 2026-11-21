import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';
import { DownmarkStatus } from '@prisma/client';

export const downmarkingRouter = Router();

// POST /api/v1/letters/:id/downmark - Forward/mark letter down the hierarchy
downmarkingRouter.post('/:id/downmark', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { markedToId, instructions, deadline } = req.body;

    if (!markedToId || !instructions) {
      res.status(400).json({ error: 'Subordinate Officer (markedToId) and Official Instructions are mandatory' });
      return;
    }

    const letter = await prisma.letter.findUnique({
      where: { id: req.params.id },
      include: { downmarkings: true },
    });

    if (!letter) {
      res.status(404).json({ error: 'Letter record not found' });
      return;
    }

    const nextSequence = letter.downmarkings.length + 1;

    const downmarking = await prisma.letterDownmarking.create({
      data: {
        letterId: req.params.id,
        sequenceOrder: nextSequence,
        markedById: req.user!.id,
        markedToId,
        instructions,
        deadline: deadline ? new Date(deadline) : null,
        status: DownmarkStatus.PENDING_VIEW,
      },
      include: {
        markedBy: { select: { id: true, fullName: true, designation: true } },
        markedTo: { select: { id: true, fullName: true, designation: true } },
      },
    });

    await logAuditEvent({
      userId: req.user!.id,
      action: 'DOWNMARK',
      entityType: 'LETTER',
      entityId: req.params.id,
      req,
      metadata: {
        sequenceOrder: nextSequence,
        markedToId,
        instructions,
        deadline,
      },
    });

    res.status(201).json(downmarking);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/downmarkings/:id/respond - Subordinate updates status or closes task
downmarkingRouter.patch('/:id/respond', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, closingRemarks } = req.body;

    const existing = await prisma.letterDownmarking.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Down-mark task not found' });
      return;
    }

    const isClosure = status === DownmarkStatus.COMPLETED_CLOSED;

    const updated = await prisma.letterDownmarking.update({
      where: { id: req.params.id },
      data: {
        status: status as DownmarkStatus,
        closingRemarks: closingRemarks || existing.closingRemarks,
        viewedAt: existing.viewedAt || new Date(),
        completedAt: isClosure ? new Date() : existing.completedAt,
      },
      include: {
        markedTo: true,
        letter: true,
      },
    });

    // If completed, check if letter itself should be marked closed
    if (isClosure) {
      await prisma.letter.update({
        where: { id: updated.letterId },
        data: { isClosed: true },
      });
    }

    await logAuditEvent({
      userId: req.user!.id,
      action: isClosure ? 'CLOSE_DOWNMARK' : 'UPDATE_DOWNMARK',
      entityType: 'LETTER',
      entityId: updated.letterId,
      req,
      metadata: { status, closingRemarks },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
