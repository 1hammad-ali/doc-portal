import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';
import { minioClient } from '../lib/minio.js';
import { config } from '../config/index.js';

export const shareRouter = Router();

// Helper to extract client IP reliably
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

// ==========================================
// AUTHENTICATED ROUTES (Attached to Letters)
// ==========================================

// POST /api/v1/letters/:id/share - Generate time-bound, password-protected share link
shareRouter.post('/:id/share', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { password, expiresInHours = 24, allowDownload = false, recipientLabel } = req.body;

    if (!password || password.length < 4) {
      res.status(400).json({ error: 'Access password must be at least 4 characters long' });
      return;
    }

    const letter = await prisma.letter.findUnique({
      where: { id: req.params.id },
    });

    if (!letter || letter.deletedAt) {
      res.status(404).json({ error: 'Letter record not found' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(password, 10);
    const hours = Math.max(1, Number(expiresInHours) || 24);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const shareLink = await prisma.secureShareLink.create({
      data: {
        letterId: letter.id,
        token,
        passwordHash,
        recipientLabel: recipientLabel || 'Government External Stakeholder',
        expiresAt,
        allowDownload: Boolean(allowDownload),
        createdById: req.user!.id,
      },
    });

    await logAuditEvent({
      userId: req.user!.id,
      action: 'CREATE_SHARE_LINK',
      entityType: 'LETTER',
      entityId: letter.id,
      req,
      metadata: {
        shareLinkId: shareLink.id,
        recipientLabel,
        expiresAt,
        allowDownload: Boolean(allowDownload),
      },
    });

    res.status(201).json({
      success: true,
      id: shareLink.id,
      token: shareLink.token,
      shareUrl: `/shared/${shareLink.token}`,
      recipientLabel: shareLink.recipientLabel,
      expiresAt: shareLink.expiresAt,
      allowDownload: shareLink.allowDownload,
      createdAt: shareLink.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/letters/:id/shares - List all share links and forensic access logs for letter
shareRouter.get('/:id/shares', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const shareLinks = await prisma.secureShareLink.findMany({
      where: { letterId: req.params.id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, designation: true },
        },
        accessLogs: {
          orderBy: { accessedAt: 'desc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(shareLinks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/letters/:id/shares/:shareId - Revoke access link immediately
shareRouter.delete('/:id/shares/:shareId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: letterId, shareId } = req.params;

    const link = await prisma.secureShareLink.findFirst({
      where: { id: shareId, letterId },
    });

    if (!link) {
      res.status(404).json({ error: 'Share link not found' });
      return;
    }

    const updated = await prisma.secureShareLink.update({
      where: { id: shareId },
      data: { isRevoked: true },
    });

    await logAuditEvent({
      userId: req.user!.id,
      action: 'REVOKE_SHARE_LINK',
      entityType: 'LETTER',
      entityId: letterId,
      req,
      metadata: { shareLinkId: shareId, token: link.token },
    });

    res.json({ success: true, message: 'Share link has been revoked immediately', link: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PUBLIC EXTERNAL SECURE SHARING ROUTES
// Mounted at: /api/v1/shared
// ==========================================

export const publicSharedRouter = Router();

// POST /api/v1/shared/:token/verify - Public password verification & letter metadata
publicSharedRouter.post('/:token/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Agent';

    const shareLink = await prisma.secureShareLink.findUnique({
      where: { token },
      include: {
        letter: {
          include: {
            department: { select: { id: true, code: true, name: true, shortName: true } },
          },
        },
      },
    });

    if (!shareLink) {
      res.status(404).json({ error: 'Invalid or non-existent government share link' });
      return;
    }

    if (shareLink.isRevoked) {
      res.status(403).json({ error: 'Access Denied: This official link has been revoked by the issuing authority' });
      return;
    }

    if (new Date() > new Date(shareLink.expiresAt)) {
      res.status(410).json({ error: 'Link Expired: The time-bound clearance for this document has expired' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'Access password is required' });
      return;
    }

    const isMatch = await bcrypt.compare(password, shareLink.passwordHash);
    if (!isMatch) {
      // Record failed access attempt
      await prisma.shareAccessLog.create({
        data: {
          shareLinkId: shareLink.id,
          action: 'PASSWORD_FAILED',
          ipAddress: clientIp,
          userAgent,
        },
      });

      res.status(401).json({ error: 'Incorrect access password. Attempt has been recorded.' });
      return;
    }

    // Record successful access attempt
    await prisma.shareAccessLog.create({
      data: {
        shareLinkId: shareLink.id,
        action: 'VIEWED',
        ipAddress: clientIp,
        userAgent,
      },
    });

    const letter = shareLink.letter;

    res.json({
      success: true,
      token: shareLink.token,
      recipientLabel: shareLink.recipientLabel,
      expiresAt: shareLink.expiresAt,
      allowDownload: shareLink.allowDownload,
      letter: {
        id: letter.id,
        diaryNumber: letter.diaryNumber,
        barcode: letter.barcode,
        subject: letter.subject,
        briefReason: letter.briefReason,
        senderName: letter.senderName,
        senderOrganization: letter.senderOrganization,
        addressedToName: letter.addressedToName,
        addressedToPost: letter.addressedToPost,
        letterDate: letter.letterDate,
        letterType: letter.letterType,
        priority: letter.priority,
        department: letter.department,
        sha256Checksum: letter.sha256Checksum,
        originalFileName: letter.originalFileName,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/shared/:token/stream - Stream protected document with forensic watermark
publicSharedRouter.get('/:token/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Agent';

    const shareLink = await prisma.secureShareLink.findUnique({
      where: { token },
      include: {
        letter: {
          include: { department: true },
        },
      },
    });

    if (!shareLink || shareLink.isRevoked || new Date() > new Date(shareLink.expiresAt)) {
      res.status(403).json({ error: 'Access unauthorized, expired or revoked' });
      return;
    }

    const letter = shareLink.letter;

    // Load original PDF or create base document
    let pdfDoc: PDFDocument;

    try {
      const stream = await minioClient.getObject(config.minio.bucket, letter.storageKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const originalBuffer = Buffer.concat(chunks);

      if (originalBuffer.length > 4 && originalBuffer.slice(0, 4).toString() === '%PDF') {
        pdfDoc = await PDFDocument.load(originalBuffer, { ignoreEncryption: true });
      } else {
        throw new Error('Not standard PDF bytes');
      }
    } catch {
      // Create document with official letterhead
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      page.drawRectangle({
        x: 0,
        y: 841.89 - 80,
        width: 595.28,
        height: 80,
        color: rgb(11 / 255, 79 / 255, 50 / 255),
      });

      page.drawText('GOVERNMENT OF PAKISTAN — OFFICIAL DISCLOSURE', {
        x: 40,
        y: 841.89 - 35,
        size: 13,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(`CONFIDENTIAL TRANSMISSION TO: ${shareLink.recipientLabel || 'RECIPIENT'}`, {
        x: 40,
        y: 841.89 - 55,
        size: 9,
        font: helvetica,
        color: rgb(197 / 255, 155 / 255, 39 / 255),
      });

      page.drawText(`DIARY NO: ${letter.diaryNumber}  |  BARCODE: ${letter.barcode}`, {
        x: 40,
        y: 841.89 - 110,
        size: 11,
        font: helveticaBold,
        color: rgb(11 / 255, 79 / 255, 50 / 255),
      });

      page.drawText(`SUBJECT: ${letter.subject}`, {
        x: 40,
        y: 841.89 - 140,
        size: 11,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: 515,
        lineHeight: 15,
      });

      page.drawText(`OFFICIAL SUMMARY:\n${letter.briefReason}`, {
        x: 40,
        y: 841.89 - 190,
        size: 9.5,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
        maxWidth: 515,
        lineHeight: 15,
      });
    }

    // Apply diagonal forensic watermark across all pages
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const watermarkText = `CONFIDENTIAL — VIEWED BY IP: ${clientIp} — ${timestamp}`;

    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(watermarkText, {
        x: width * 0.15,
        y: height * 0.45,
        size: 12,
        font: helveticaBold,
        color: rgb(0.8, 0.1, 0.1),
        opacity: 0.18,
        rotate: degrees(35),
      });
    }

    const watermarkedBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Protected_Document.pdf"');
    res.setHeader('Content-Length', watermarkedBytes.length);
    res.send(Buffer.from(watermarkedBytes));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/shared/:token/download - Public download (if permitted)
publicSharedRouter.get('/:token/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown Agent';

    const shareLink = await prisma.secureShareLink.findUnique({
      where: { token },
      include: { letter: true },
    });

    if (!shareLink) {
      res.status(404).json({ error: 'Share link not found' });
      return;
    }

    if (shareLink.isRevoked) {
      res.status(403).json({ error: 'Link has been revoked' });
      return;
    }

    if (new Date() > new Date(shareLink.expiresAt)) {
      res.status(410).json({ error: 'Link has expired' });
      return;
    }

    if (!shareLink.allowDownload) {
      res.status(403).json({
        error: 'Download prohibited: The issuing authority configured this link as View-Only (Anti-Screenshot/Download Restricted).',
      });
      return;
    }

    // Log the download action
    await prisma.shareAccessLog.create({
      data: {
        shareLinkId: shareLink.id,
        action: 'DOWNLOADED',
        ipAddress: clientIp,
        userAgent,
      },
    });

    const letter = shareLink.letter;

    // Fetch from storage or generate
    try {
      const stream = await minioClient.getObject(config.minio.bucket, letter.storageKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const buffer = Buffer.concat(chunks);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${letter.originalFileName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
      return;
    } catch {
      // Fallback: Generate PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('GOVERNMENT OF PAKISTAN — OFFICIAL DOCUMENT', {
        x: 40,
        y: 800,
        size: 14,
        font: helveticaBold,
        color: rgb(11 / 255, 79 / 255, 50 / 255),
      });

      page.drawText(`Diary No: ${letter.diaryNumber} | Barcode: ${letter.barcode}`, {
        x: 40,
        y: 770,
        size: 10,
        font: helveticaBold,
      });

      page.drawText(`Subject: ${letter.subject}`, {
        x: 40,
        y: 740,
        size: 11,
        font: helveticaBold,
        maxWidth: 515,
      });

      page.drawText(`Summary: ${letter.briefReason}`, {
        x: 40,
        y: 700,
        size: 10,
        font: helvetica,
        maxWidth: 515,
      });

      const bytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${letter.originalFileName}"`);
      res.setHeader('Content-Length', bytes.length);
      res.send(Buffer.from(bytes));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
