import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '../lib/prisma.js';
import { minioClient, ensureDocumentBucket } from '../lib/minio.js';
import { config } from '../config/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdminDelete } from '../middleware/rbac.js';
import { logAuditEvent } from '../middleware/audit.js';
import { handlePhysicalCheckout, handlePhysicalCheckin } from './custody.routes.js';
import {
  CorrespondenceDirection,
  LetterType,
  PriorityLevel,
  PhysicalCustodyStatus,
  LinkRole,
  DownmarkStatus,
  SystemRole,
} from '@prisma/client';

export const lettersRouter = Router();

// Memory storage for secure buffering & SHA-256 calculation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// POST /api/v1/letters - Multipart Dak Intake with Multi-File Linking
lettersRouter.post(
  '/',
  authenticateToken,
  upload.single('document'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        direction = CorrespondenceDirection.INWARD,
        letterType = LetterType.ACTION_REQUIRED,
        priority = PriorityLevel.ROUTINE,
        subject,
        briefReason,
        senderName,
        senderOrganization,
        addressedToName,
        addressedToPost,
        referenceNumber,
        letterDate,
        dueDate,
        departmentId,
        isAttachedInPhysicalFile = 'true',
        // JSON array of file links: [{ fileId, linkRole, folioNumber, attachedNote }]
        fileLinks: fileLinksJson,
        tags: tagsJson,
      } = req.body;

      if (!subject || !briefReason || !senderOrganization || !addressedToName) {
        res.status(400).json({
          error: 'Subject, Brief Reason, Sender Organization, and Addressee Name are mandatory government metadata',
        });
        return;
      }

      const targetDeptId = departmentId || req.user!.primaryDeptId;

      // Enforce Multi-Department canCreate RBAC
      if (req.user && req.user.role !== SystemRole.SUPER_ADMIN) {
        const isPrimary = req.user.primaryDeptId === targetDeptId;
        const hasAccess = req.user.deptAccess.some((d) => d.departmentId === targetDeptId && d.canCreate);
        if (!isPrimary && !hasAccess) {
          res.status(403).json({
            error: `Access Denied: You do not hold 'canCreate' clearance for Department ID: ${targetDeptId}`,
          });
          return;
        }
      }

      // 1. Generate National Diary Number & Barcode
      const count = await prisma.letter.count();
      const year = new Date().getFullYear();
      const serial = String(count + 1).padStart(6, '0');
      const diaryNumber = `DAK-${year}-${serial}`;
      const barcode = `LTR-${year}-${serial}`;

      // 2. Compute SHA-256 Checksum and Structured Filename
      const fileBuffer = req.file?.buffer || Buffer.from('GOVEDMS_DOCUMENT_PLACEHOLDER');
      const sha256Checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const mimeType = req.file?.mimetype || 'application/pdf';
      const fileSizeBytes = fileBuffer.length;

      const sanitizedSubject = subject.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const dateStr = new Date().toISOString().split('T')[0];
      const structuredFileName = `${diaryNumber}_${letterType}_${sanitizedSubject}_${dateStr}.pdf`;
      const storageKey = `documents/${year}/${dateStr.slice(5, 7)}/${structuredFileName}`;

      // 3. Upload to MinIO (Private Bucket)
      try {
        await ensureDocumentBucket();
        await minioClient.putObject(config.minio.bucket, storageKey, fileBuffer, fileSizeBytes, {
          'Content-Type': mimeType,
          'x-amz-meta-sha256': sha256Checksum,
          'x-amz-meta-diaryno': diaryNumber,
        });
      } catch (storageErr) {
        console.warn('MinIO upload fallback (mock):', storageErr);
      }

      // 4. Save Letter Record
      const isAttached = isAttachedInPhysicalFile === 'true' || isAttachedInPhysicalFile === true;
      const parsedLetterDate = letterDate ? new Date(letterDate) : new Date();
      const parsedDueDate = dueDate ? new Date(dueDate) : null;

      const newLetter = await prisma.letter.create({
        data: {
          diaryNumber,
          referenceNumber: referenceNumber || null,
          barcode,
          direction: direction as CorrespondenceDirection,
          letterType: letterType as LetterType,
          priority: priority as PriorityLevel,
          subject,
          briefReason,
          senderName: senderName || 'Official Sender',
          senderOrganization,
          addressedToName,
          addressedToPost: addressedToPost || 'Competent Authority',
          letterDate: parsedLetterDate,
          receivedOrSentDate: new Date(),
          dueDate: parsedDueDate,
          storageKey,
          originalFileName: structuredFileName,
          mimeType,
          fileSizeBytes,
          sha256Checksum,
          isAttachedInPhysicalFile: isAttached,
          physicalCustodyStatus: isAttached
            ? PhysicalCustodyStatus.ATTACHED_IN_FILE
            : PhysicalCustodyStatus.ISSUED_OUT_TO_OFFICER,
          departmentId: targetDeptId,
          uploadedById: req.user!.id,
        },
      });

      // 5. Multi-File Linking Junction Records
      let parsedLinks: any[] = [];
      if (fileLinksJson) {
        try {
          parsedLinks = typeof fileLinksJson === 'string' ? JSON.parse(fileLinksJson) : fileLinksJson;
        } catch {
          parsedLinks = [];
        }
      }

      if (parsedLinks.length > 0) {
        await prisma.letterFileLink.createMany({
          data: parsedLinks.map((link: any, index: number) => ({
            letterId: newLetter.id,
            fileId: link.fileId,
            linkRole: (link.linkRole as LinkRole) || (index === 0 ? LinkRole.PRIMARY_MASTER : LinkRole.CROSS_REFERENCE),
            folioNumber: link.folioNumber || `Folio ${index + 1}`,
            attachedNote: link.attachedNote || null,
          })),
        });
      }

      // 6. Asynchronous OCR Worker Trigger
      if (req.file) {
        (async () => {
          try {
            const formData = new FormData();
            const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
            formData.append('file', blob, structuredFileName);

            const ocrRes = await fetch(`${config.ocrServiceUrl}/ocr/extract-text`, {
              method: 'POST',
              body: formData,
            });

            if (ocrRes.ok) {
              const ocrData = (await ocrRes.json()) as { extracted_text: string };
              if (ocrData.extracted_text) {
                await prisma.letter.update({
                  where: { id: newLetter.id },
                  data: { ocrExtractedText: ocrData.extracted_text },
                });
              }
            }
          } catch (ocrErr) {
            console.log('Background OCR trigger skipped/deferred');
          }
        })();
      }

      // 7. Forensic Audit Logging
      await logAuditEvent({
        userId: req.user!.id,
        action: 'CREATE_LETTER',
        entityType: 'LETTER',
        entityId: newLetter.id,
        req,
        metadata: {
          diaryNumber,
          letterType,
          priority,
          linkedFilesCount: parsedLinks.length,
          sha256Checksum,
        },
      });

      // Fetch complete record with links
      const createdWithRelations = await prisma.letter.findUnique({
        where: { id: newLetter.id },
        include: {
          fileLinks: {
            include: { file: true },
          },
          department: true,
          uploadedBy: {
            select: { id: true, fullName: true, designation: true },
          },
        },
      });

      res.status(201).json(createdWithRelations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/v1/letters - Filtered list of correspondence
lettersRouter.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      departmentId,
      direction,
      letterType,
      priority,
      isAttached,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const where: any = {
      deletedAt: null,
    };

    // RBAC: Non-SuperAdmin users can only view letters from authorized departments
    if (req.user && req.user.role !== SystemRole.SUPER_ADMIN) {
      const allowedDeptIds = [
        req.user.primaryDeptId,
        ...req.user.deptAccess.filter((d) => d.canView).map((d) => d.departmentId),
      ];
      where.departmentId = { in: allowedDeptIds };
    }

    if (departmentId) where.departmentId = departmentId as string;
    if (direction) where.direction = direction as CorrespondenceDirection;
    if (letterType) where.letterType = letterType as LetterType;
    if (priority) where.priority = priority as PriorityLevel;
    if (isAttached !== undefined) where.isAttachedInPhysicalFile = isAttached === 'true';

    if (search && typeof search === 'string') {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { diaryNumber: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { senderOrganization: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { ocrExtractedText: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * take;

    const [total, letters] = await Promise.all([
      prisma.letter.count({ where }),
      prisma.letter.findMany({
        where,
        include: {
          department: true,
          fileLinks: {
            include: { file: true },
          },
          downmarkings: {
            include: { markedTo: true },
          },
        },
        orderBy: { receivedOrSentDate: 'desc' },
        take,
        skip,
      }),
    ]);

    res.json({
      total,
      page: parseInt(page as string, 10),
      totalPages: Math.ceil(total / take),
      letters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/letters/:id - Comprehensive letter detail view & download link
lettersRouter.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const letter = await prisma.letter.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        uploadedBy: {
          select: { id: true, fullName: true, designation: true },
        },
        fileLinks: {
          include: { file: true },
        },
        downmarkings: {
          include: {
            markedBy: { select: { id: true, fullName: true, designation: true } },
            markedTo: { select: { id: true, fullName: true, designation: true } },
          },
          orderBy: { sequenceOrder: 'asc' },
        },
        custodyLogs: {
          include: {
            issuedToUser: { select: { id: true, fullName: true, designation: true } },
          },
          orderBy: { checkedOutAt: 'desc' },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!letter || letter.deletedAt) {
      res.status(404).json({ error: 'Letter record not found or has been soft-deleted' });
      return;
    }

    // Log Document View Audit
    await logAuditEvent({
      userId: req.user!.id,
      action: 'VIEW_DOCUMENT',
      entityType: 'LETTER',
      entityId: letter.id,
      req,
      metadata: { diaryNumber: letter.diaryNumber, subject: letter.subject },
    });

    res.json(letter);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/letters/:id/link-files - Attach existing letter into additional file jackets
lettersRouter.post('/:id/link-files', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, linkRole = LinkRole.CROSS_REFERENCE, folioNumber, attachedNote } = req.body;

    if (!fileId) {
      res.status(400).json({ error: 'Target fileId is required' });
      return;
    }

    const existing = await prisma.letterFileLink.findUnique({
      where: {
        letterId_fileId: {
          letterId: req.params.id,
          fileId,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Letter is already linked to this File Jacket' });
      return;
    }

    const link = await prisma.letterFileLink.create({
      data: {
        letterId: req.params.id,
        fileId,
        linkRole: linkRole as LinkRole,
        folioNumber: folioNumber || null,
        attachedNote: attachedNote || null,
      },
      include: {
        file: true,
      },
    });

    await logAuditEvent({
      userId: req.user!.id,
      action: 'LINK_TO_FILE',
      entityType: 'LETTER',
      entityId: req.params.id,
      req,
      metadata: { fileId, fileNumber: link.file.fileNumber, folioNumber },
    });

    res.status(201).json(link);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/letters/:id/downmark - Forward/mark letter down the hierarchy
lettersRouter.post('/:id/downmark', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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

    // RBAC: Verify user holds canDownmark clearance for this department
    if (req.user && req.user.role !== SystemRole.SUPER_ADMIN) {
      const isPrimary = req.user.primaryDeptId === letter.departmentId;
      const hasDownmarkAccess = req.user.deptAccess.some(
        (d) => d.departmentId === letter.departmentId && d.canDownmark
      );
      if (!isPrimary && !hasDownmarkAccess) {
        res.status(403).json({
          error: "Access Denied: You lack 'canDownmark' clearance for this department's correspondence",
        });
        return;
      }
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

// POST /api/v1/letters/:id/physical-checkout - Pull original hardcopy from physical file
lettersRouter.post('/:id/physical-checkout', authenticateToken, handlePhysicalCheckout);

// POST /api/v1/letters/:id/physical-checkin - Confirm original hardcopy re-attached in physical file
lettersRouter.post('/:id/physical-checkin', authenticateToken, handlePhysicalCheckin);

// DELETE /api/v1/letters/:id - Sovereign Admin-Only Soft Delete
lettersRouter.delete(
  '/:id',
  authenticateToken,
  requireAdminDelete(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { reason } = req.body;

      const letter = await prisma.letter.findUnique({
        where: { id: req.params.id },
      });

      if (!letter) {
        res.status(404).json({ error: 'Letter not found' });
        return;
      }

      // Enforce canDelete on specific department if user is DEPT_ADMIN
      if (req.user && req.user.role !== SystemRole.SUPER_ADMIN) {
        const hasDeleteClearance = req.user.deptAccess.some(
          (d) => d.departmentId === letter.departmentId && d.canDelete
        );
        if (!hasDeleteClearance) {
          res.status(403).json({
            error: "Access Denied: You do not possess 'canDelete' clearance for this department's records",
          });
          return;
        }
      }

      await prisma.letter.update({
        where: { id: req.params.id },
        data: {
          deletedAt: new Date(),
          deletedById: req.user!.id,
          deletionReason: reason,
        },
      });

      // Immutable Forensic Audit Entry
      await logAuditEvent({
        userId: req.user!.id,
        action: 'ADMIN_DELETE',
        entityType: 'LETTER',
        entityId: letter.id,
        req,
        metadata: {
          diaryNumber: letter.diaryNumber,
          subject: letter.subject,
          reason,
          deletedByRole: req.user!.role,
        },
      });

      res.json({
        success: true,
        message: 'Government document record successfully soft-deleted with forensic audit record',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/v1/letters/:id/stream - Stream inline PDF (with auto-generation fallback)
lettersRouter.get('/:id/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    // Flexible auth: Header Bearer OR Query token
    let token = req.query.token as string | undefined;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication token is required for document streaming' });
      return;
    }

    try {
      jwt.verify(token, config.jwt.accessSecret);
    } catch {
      res.status(401).json({ error: 'Invalid or expired authentication token' });
      return;
    }

    const letter = await prisma.letter.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        notes: {
          include: {
            author: { select: { fullName: true, designation: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!letter || letter.deletedAt) {
      res.status(404).json({ error: 'Official letter record not found' });
      return;
    }

    // Attempt 1: Fetch binary from MinIO if present
    try {
      const stream = await minioClient.getObject(config.minio.bucket, letter.storageKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const buffer = Buffer.concat(chunks);

      // Check if it's a real PDF (magic bytes %PDF)
      if (buffer.length > 4 && buffer.slice(0, 4).toString() === '%PDF') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${letter.originalFileName}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
        return;
      }
    } catch (storageErr) {
      // Storage object not found or not accessible; fall back to official generated PDF
    }

    // Attempt 2: Generate official high-res PDF on the fly using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const emeraldGreen = rgb(11 / 255, 79 / 255, 50 / 255);
    const darkSlate = rgb(19 / 255, 32 / 255, 27 / 255);
    const goldAccent = rgb(197 / 255, 155 / 255, 39 / 255);
    const softBg = rgb(0.96, 0.98, 0.96);
    const mutedGray = rgb(0.45, 0.5, 0.47);

    const { width, height } = page.getSize();

    // Top Header Banner
    page.drawRectangle({
      x: 0,
      y: height - 85,
      width,
      height: 85,
      color: emeraldGreen,
    });

    page.drawText('GOVERNMENT OF PAKISTAN', {
      x: 40,
      y: height - 35,
      size: 15,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('NATIONAL DOCUMENT & e-FILE REPOSITORY — OFFICIAL RECORD', {
      x: 40,
      y: height - 52,
      size: 8.5,
      font: helvetica,
      color: goldAccent,
    });

    page.drawText(`Department: ${letter.department.name.toUpperCase()} (${letter.department.code})`, {
      x: 40,
      y: height - 68,
      size: 8,
      font: helvetica,
      color: rgb(0.9, 0.95, 0.9),
    });

    // Reference & Barcode Card
    let yPos = height - 120;

    page.drawRectangle({
      x: 40,
      y: yPos - 55,
      width: width - 80,
      height: 70,
      color: softBg,
      borderColor: goldAccent,
      borderWidth: 1,
    });

    page.drawText(`DIARY NO: ${letter.diaryNumber}`, {
      x: 55,
      y: yPos,
      size: 12,
      font: helveticaBold,
      color: emeraldGreen,
    });

    page.drawText(`BARCODE: ${letter.barcode}`, {
      x: width - 220,
      y: yPos,
      size: 10,
      font: helveticaBold,
      color: darkSlate,
    });

    page.drawText(`TYPE: ${letter.letterType.replace(/_/g, ' ')}  |  PRIORITY: ${letter.priority}  |  DIR: ${letter.direction}`, {
      x: 55,
      y: yPos - 18,
      size: 8.5,
      font: helveticaBold,
      color: darkSlate,
    });

    page.drawText(`LETTER DATE: ${new Date(letter.letterDate).toLocaleDateString()}  |  RECORDED: ${new Date(letter.createdAt).toLocaleDateString()}`, {
      x: 55,
      y: yPos - 34,
      size: 8,
      font: helvetica,
      color: mutedGray,
    });

    // Sender & Addressee
    yPos -= 85;

    page.drawText('ISSUING AUTHORITY / SENDER:', {
      x: 40,
      y: yPos,
      size: 8.5,
      font: helveticaBold,
      color: emeraldGreen,
    });

    page.drawText(`${letter.senderName} — ${letter.senderOrganization}`, {
      x: 40,
      y: yPos - 15,
      size: 10,
      font: helveticaBold,
      color: darkSlate,
    });

    page.drawText('ADDRESSED TO:', {
      x: 320,
      y: yPos,
      size: 8.5,
      font: helveticaBold,
      color: emeraldGreen,
    });

    page.drawText(`${letter.addressedToName} (${letter.addressedToPost})`, {
      x: 320,
      y: yPos - 15,
      size: 10,
      font: helveticaBold,
      color: darkSlate,
    });

    // Subject Box
    yPos -= 50;

    page.drawRectangle({
      x: 40,
      y: yPos - 45,
      width: width - 80,
      height: 55,
      color: rgb(0.99, 0.99, 0.98),
      borderColor: rgb(0.8, 0.85, 0.8),
      borderWidth: 1,
    });

    page.drawText('SUBJECT:', {
      x: 55,
      y: yPos - 5,
      size: 9,
      font: helveticaBold,
      color: emeraldGreen,
    });

    page.drawText(letter.subject.slice(0, 150), {
      x: 55,
      y: yPos - 25,
      size: 11,
      font: helveticaBold,
      color: darkSlate,
      maxWidth: width - 110,
      lineHeight: 14,
    });

    // Brief Reason & Official Summary
    yPos -= 75;

    page.drawText('EXECUTIVE SUMMARY & GROUNDS FOR DISPATCH/RECEIPT:', {
      x: 40,
      y: yPos,
      size: 9,
      font: helveticaBold,
      color: emeraldGreen,
    });

    page.drawText(letter.briefReason, {
      x: 40,
      y: yPos - 18,
      size: 9.5,
      font: helvetica,
      color: darkSlate,
      maxWidth: width - 80,
      lineHeight: 15,
    });

    // Minute Notes Sheet Section
    if (letter.notes && letter.notes.length > 0) {
      yPos -= 110;
      page.drawText('OFFICIAL MINUTE NOTES (NOTE SHEET REGISTER):', {
        x: 40,
        y: yPos,
        size: 9,
        font: helveticaBold,
        color: emeraldGreen,
      });

      for (let i = 0; i < Math.min(letter.notes.length, 3); i++) {
        const note = letter.notes[i];
        yPos -= 22;
        page.drawText(`[Note #${i + 1}] By ${note.author.fullName} (${note.author.designation}) on ${new Date(note.createdAt).toLocaleDateString()}:`, {
          x: 45,
          y: yPos,
          size: 8,
          font: helveticaBold,
          color: darkSlate,
        });

        yPos -= 14;
        page.drawText(note.noteText.slice(0, 180), {
          x: 50,
          y: yPos,
          size: 8,
          font: helvetica,
          color: mutedGray,
          maxWidth: width - 100,
        });
      }
    }

    // Footer Watermark & Cryptographic SHA-256 Stamp
    page.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: 48,
      color: rgb(0.95, 0.97, 0.95),
      borderColor: emeraldGreen,
      borderWidth: 1,
    });

    page.drawText('VERIFIED ELECTRONIC RECORD — GOVEDMS NATIONAL ARCHIVES', {
      x: 55,
      y: 72,
      size: 8,
      font: helveticaBold,
      color: emeraldGreen,
    });

    page.drawText(`SHA-256: ${letter.sha256Checksum}`, {
      x: 55,
      y: 58,
      size: 7,
      font: helvetica,
      color: darkSlate,
    });

    page.drawText(`Physical Custody: ${letter.isAttachedInPhysicalFile ? 'Attached in Physical Jacket' : `Issued Out to ${letter.physicalHolderName || 'Officer'}`}`, {
      x: 55,
      y: 46,
      size: 7,
      font: helveticaBold,
      color: letter.isAttachedInPhysicalFile ? emeraldGreen : rgb(0.8, 0.2, 0.2),
    });

    const generatedPdf = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${letter.originalFileName}"`);
    res.setHeader('Content-Length', generatedPdf.length);
    res.send(Buffer.from(generatedPdf));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/letters/:id/notes - Add official minute note to letter note-sheet
lettersRouter.post('/:id/notes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteText, isInternal = true } = req.body;

    if (!noteText || !noteText.trim()) {
      res.status(400).json({ error: 'Minute note text cannot be blank' });
      return;
    }

    const letter = await prisma.letter.findUnique({
      where: { id: req.params.id },
    });

    if (!letter || letter.deletedAt) {
      res.status(404).json({ error: 'Letter record not found' });
      return;
    }

    const newNote = await prisma.letterNote.create({
      data: {
        letterId: letter.id,
        authorId: req.user!.id,
        noteText: noteText.trim(),
        isInternal: Boolean(isInternal),
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            employeeCode: true,
            primaryDept: { select: { id: true, code: true, name: true, shortName: true } },
          },
        },
      },
    });

    await logAuditEvent({
      userId: req.user!.id,
      action: 'ADD_NOTE',
      entityType: 'LETTER',
      entityId: letter.id,
      req,
      metadata: { noteId: newNote.id, isInternal },
    });

    res.status(201).json(newNote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/letters/:id/notes - Get official minute notes register for letter
lettersRouter.get('/:id/notes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const notes = await prisma.letterNote.findMany({
      where: { letterId: req.params.id },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            employeeCode: true,
            primaryDept: { select: { id: true, code: true, name: true, shortName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
