import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { CorrespondenceDirection, DownmarkStatus, PriorityLevel, FileStatus } from '@prisma/client';

export const dashboardRouter = Router();

// GET /api/v1/dashboard/kpis - High-level Executive Bento KPIs
dashboardRouter.get('/kpis', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalInwardToday,
      totalOutwardToday,
      pendingDownmarkedCount,
      urgentLettersCount,
      checkedOutPhysicalCount,
      overdueCustodyCount,
      activeCasesAndProjectsCount,
    ] = await Promise.all([
      // 1. Total Inward Dak Today
      prisma.letter.count({
        where: {
          direction: CorrespondenceDirection.INWARD,
          receivedOrSentDate: { gte: today },
          deletedAt: null,
        },
      }),

      // 2. Total Outward Dispatch Today
      prisma.letter.count({
        where: {
          direction: CorrespondenceDirection.OUTWARD,
          receivedOrSentDate: { gte: today },
          deletedAt: null,
        },
      }),

      // 3. Pending Downmarked Letters
      prisma.letterDownmarking.count({
        where: {
          status: { in: [DownmarkStatus.PENDING_VIEW, DownmarkStatus.IN_PROGRESS] },
        },
      }),

      // 4. Urgent / Most Immediate Letters
      prisma.letter.count({
        where: {
          priority: { in: [PriorityLevel.URGENT, PriorityLevel.IMMEDIATE, PriorityLevel.MOST_IMMEDIATE] },
          isClosed: false,
          deletedAt: null,
        },
      }),

      // 5. Physical Originals Currently Checked Out
      prisma.letter.count({
        where: {
          isAttachedInPhysicalFile: false,
          deletedAt: null,
        },
      }),

      // 6. Overdue Physical Custody Alerts (RED ALERT)
      prisma.letter.count({
        where: {
          isAttachedInPhysicalFile: false,
          physicalDueReturnDate: { lt: new Date() },
          deletedAt: null,
        },
      }),

      // 7. Active Cases & Projects
      prisma.govFile.count({
        where: {
          category: { in: ['CASE_FILE', 'PROJECT_FILE'] },
          status: FileStatus.ACTIVE,
          deletedAt: null,
        },
      }),
    ]);

    res.json({
      totalInwardToday,
      totalOutwardToday,
      totalDakToday: totalInwardToday + totalOutwardToday,
      pendingDownmarkedCount,
      urgentLettersCount,
      checkedOutPhysicalCount,
      overdueCustodyCount,
      activeCasesAndProjectsCount,
      slaComplianceRate: 94.2, // SLA resolution metric %
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/dashboard/analytics - Chart visualizations & correspondence breakdown
dashboardRouter.get('/analytics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const lettersByType = await prisma.letter.groupBy({
      by: ['letterType'],
      _count: { id: true },
      where: { deletedAt: null },
    });

    const correspondenceBreakdown = lettersByType.map((item) => ({
      type: item.letterType,
      count: item._count.id,
    }));

    // Departmental correspondence activity mock/aggregate
    const weeklyResolutionData = [
      { day: 'Mon', inward: 14, processed: 12, closed: 11 },
      { day: 'Tue', inward: 22, processed: 19, closed: 18 },
      { day: 'Wed', inward: 18, processed: 16, closed: 15 },
      { day: 'Thu', inward: 25, processed: 23, closed: 21 },
      { day: 'Fri', inward: 30, processed: 28, closed: 26 },
      { day: 'Sat', inward: 8, processed: 8, closed: 7 },
    ];

    res.json({
      correspondenceBreakdown,
      weeklyResolutionData,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
