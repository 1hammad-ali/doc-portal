import { Router, Request, Response } from 'express';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireFolderAccess } from '../middleware/rbac.js';
import { logAuditEvent } from '../middleware/audit.js';
import { minioClient } from '../lib/minio.js';
import { config } from '../config/index.js';
import { FileCategory, FileStatus, SystemRole } from '@prisma/client';

export const filesRouter = Router();

// GET /api/v1/files - List and filter file jackets, cases & projects (with RBAC)
filesRouter.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId, category, status, search } = req.query;

    const where: any = {
      deletedAt: null,
    };

    if (departmentId) where.departmentId = departmentId as string;
    if (category) where.category = category as FileCategory;
    if (status) where.status = status as FileStatus;

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { fileNumber: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { rackLocation: { contains: search, mode: 'insensitive' } },
      ];
    }

    // RBAC: Non-SuperAdmin users can only see authorized departments & folders
    if (req.user && req.user.role !== SystemRole.SUPER_ADMIN) {
      const allowedDeptIds = [
        req.user.primaryDeptId,
        ...req.user.deptAccess.filter((d) => d.canView).map((d) => d.departmentId),
      ];

      const userFolderPerms = await prisma.userFolderPermission.findMany({
        where: { userId: req.user.id, canRead: true },
        select: { fileId: true },
      });
      const explicitFileIds = userFolderPerms.map((p) => p.fileId);

      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { departmentId: { in: allowedDeptIds }, isConfidential: false },
            { id: { in: explicitFileIds } },
          ],
        },
      ];
    }

    const files = await prisma.govFile.findMany({
      where,
      include: {
        department: {
          select: { id: true, code: true, name: true, shortName: true },
        },
        _count: {
          select: { letterLinks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/files - Create a new File Jacket, Case, or Project
filesRouter.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      category = FileCategory.MAIN_ORG_FILE,
      departmentId,
      custodianName,
      rackLocation,
      isConfidential = false,
    } = req.body;

    if (!title || !departmentId) {
      res.status(400).json({ error: 'File Title and Department are required' });
      return;
    }

    // Auto-generate official fileNumber and unique Barcode
    const count = await prisma.govFile.count();
    const year = new Date().getFullYear();
    const serial = String(count + 1).padStart(4, '0');

    let prefix = 'FILE';
    if (category === FileCategory.CASE_FILE) prefix = 'CASE';
    else if (category === FileCategory.PROJECT_FILE) prefix = 'PROJ';
    else if (category === FileCategory.POLICY_FILE) prefix = 'SRO';

    const fileNumber = `GOV/${year}/${prefix}-${serial}`;
    const barcode = `FILE-${year}-${String(100000 + count + 1)}`;

    const newFile = await prisma.govFile.create({
      data: {
        fileNumber,
        barcode,
        title,
        description,
        category,
        departmentId,
        custodianName,
        rackLocation,
        isConfidential: Boolean(isConfidential),
        status: FileStatus.ACTIVE,
      },
      include: {
        department: true,
      },
    });

    await logAuditEvent({
      userId: req.user!.id,
      action: 'CREATE_FILE',
      entityType: 'FILE',
      entityId: newFile.id,
      req,
      metadata: { fileNumber, title, category },
    });

    res.status(201).json(newFile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/files/:id - Complete Dossier view with indexed Table of Contents
filesRouter.get('/:id', authenticateToken, requireFolderAccess('canRead'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = await prisma.govFile.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        letterLinks: {
          include: {
            letter: {
              include: {
                department: true,
                uploadedBy: {
                  select: { id: true, fullName: true, designation: true },
                },
                downmarkings: {
                  include: {
                    markedBy: { select: { id: true, fullName: true, designation: true } },
                    markedTo: { select: { id: true, fullName: true, designation: true } },
                  },
                  orderBy: { sequenceOrder: 'asc' },
                },
                custodyLogs: {
                  orderBy: { checkedOutAt: 'desc' },
                  take: 5,
                },
                tags: {
                  include: { tag: true },
                },
              },
            },
          },
          orderBy: { linkedAt: 'asc' },
        },
      },
    });

    if (!file) {
      res.status(404).json({ error: 'File Jacket not found' });
      return;
    }

    // Sort letter links naturally by folioNumber or linkedAt
    const sortedLinks = [...file.letterLinks].sort((a, b) => {
      if (a.folioNumber && b.folioNumber) {
        return a.folioNumber.localeCompare(b.folioNumber, undefined, { numeric: true });
      }
      return new Date(a.linkedAt).getTime() - new Date(b.linkedAt).getTime();
    });

    res.json({
      ...file,
      letterLinks: sortedLinks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST & GET /api/v1/files/:id/merge-pdf - Compile entire dossier or selected letters into 1 unified PDF
const handleMergePdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { letterIds } = (req.method === 'POST' ? req.body : req.query) as { letterIds?: string[] | string };

    const parsedLetterIds: string[] | undefined = Array.isArray(letterIds)
      ? letterIds
      : typeof letterIds === 'string'
      ? letterIds.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const file = await prisma.govFile.findUnique({
      where: { id },
      include: {
        department: true,
        letterLinks: {
          include: {
            letter: {
              include: {
                department: true,
                uploadedBy: { select: { fullName: true, designation: true } },
              },
            },
          },
          orderBy: { linkedAt: 'asc' },
        },
      },
    });

    if (!file) {
      res.status(404).json({ error: 'File Jacket not found' });
      return;
    }

    // Filter by selected letters if requested
    let targetLinks = file.letterLinks;
    if (parsedLetterIds && parsedLetterIds.length > 0) {
      targetLinks = file.letterLinks.filter((link) => parsedLetterIds.includes(link.letterId));
    }

    // Natural sort by folio number
    targetLinks.sort((a, b) => {
      if (a.folioNumber && b.folioNumber) {
        return a.folioNumber.localeCompare(b.folioNumber, undefined, { numeric: true });
      }
      return new Date(a.linkedAt).getTime() - new Date(b.linkedAt).getTime();
    });

    // 1. Initialize Master PDF Document
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const emeraldGreen = rgb(0.043, 0.31, 0.196); // #0B4F32
    const darkSlate = rgb(0.067, 0.11, 0.094);    // #111C18
    const goldAccent = rgb(0.773, 0.608, 0.153);   // #C59B27
    const mutedGray = rgb(0.4, 0.45, 0.42);

    // 2. Cover Index Page (A4: 595.28 x 841.89 pt)
    const coverPage = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = coverPage.getSize();

    // Top Header Banner
    coverPage.drawRectangle({
      x: 0,
      y: height - 110,
      width,
      height: 110,
      color: emeraldGreen,
    });

    coverPage.drawText('GOVERNMENT OF PAKISTAN', {
      x: 40,
      y: height - 42,
      size: 16,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    coverPage.drawText('NATIONAL e-OFFICE SYSTEM — GovEDMS v2.0', {
      x: 40,
      y: height - 64,
      size: 11,
      font: helveticaBold,
      color: goldAccent,
    });

    coverPage.drawText('OFFICIAL DOSSIER RECORD & ELECTRONIC FILE JACKET', {
      x: 40,
      y: height - 84,
      size: 9,
      font: helvetica,
      color: rgb(0.9, 0.95, 0.9),
    });

    // File Metadata Card
    let y = height - 145;
    coverPage.drawText(`FILE NUMBER: ${file.fileNumber}`, {
      x: 40,
      y,
      size: 13,
      font: helveticaBold,
      color: darkSlate,
    });

    y -= 22;
    coverPage.drawText(`BARCODE: ${file.barcode}  |  CLASSIFICATION: ${file.category}`, {
      x: 40,
      y,
      size: 9,
      font: helveticaBold,
      color: emeraldGreen,
    });

    y -= 18;
    coverPage.drawText(`TITLE: ${file.title.slice(0, 85)}`, {
      x: 40,
      y,
      size: 10,
      font: helvetica,
      color: darkSlate,
    });

    y -= 18;
    coverPage.drawText(`DEPARTMENT: ${file.department.name} (${file.department.code})`, {
      x: 40,
      y,
      size: 9,
      font: helvetica,
      color: mutedGray,
    });

    y -= 16;
    coverPage.drawText(`CUSTODIAN: ${file.custodianName || 'Central Registry'}  |  RACK LOCATION: ${file.rackLocation || 'General Archive'}`, {
      x: 40,
      y,
      size: 9,
      font: helvetica,
      color: mutedGray,
    });

    y -= 16;
    coverPage.drawText(`COMPILED ON: ${new Date().toLocaleString()}  |  TOTAL ATTACHED FOLIOS: ${targetLinks.length}`, {
      x: 40,
      y,
      size: 9,
      font: helveticaBold,
      color: emeraldGreen,
    });

    // Divider Line
    y -= 20;
    coverPage.drawLine({
      start: { x: 40, y },
      end: { x: width - 40, y },
      thickness: 1.5,
      color: goldAccent,
    });

    // Table of Contents Header
    y -= 25;
    coverPage.drawText('TABLE OF CONTENTS / FOLIO REGISTER', {
      x: 40,
      y,
      size: 11,
      font: helveticaBold,
      color: emeraldGreen,
    });

    y -= 15;
    // Table Header Row
    coverPage.drawRectangle({
      x: 40,
      y: y - 5,
      width: width - 80,
      height: 20,
      color: rgb(0.94, 0.97, 0.95),
    });

    coverPage.drawText('FOLIO', { x: 45, y: y + 2, size: 8, font: helveticaBold, color: darkSlate });
    coverPage.drawText('DIARY NO', { x: 100, y: y + 2, size: 8, font: helveticaBold, color: darkSlate });
    coverPage.drawText('TYPE', { x: 190, y: y + 2, size: 8, font: helveticaBold, color: darkSlate });
    coverPage.drawText('SUBJECT & SENDER', { x: 300, y: y + 2, size: 8, font: helveticaBold, color: darkSlate });
    coverPage.drawText('DATE', { x: width - 90, y: y + 2, size: 8, font: helveticaBold, color: darkSlate });

    y -= 18;

    // Render TOC rows (up to 25 rows on cover page)
    for (let i = 0; i < Math.min(targetLinks.length, 25); i++) {
      const link = targetLinks[i];
      const letter = link.letter;
      const folio = link.folioNumber || `Folio ${i + 1}`;
      const diary = letter.diaryNumber;
      const type = letter.letterType.replace(/_/g, ' ').slice(0, 16);
      const subject = `${letter.subject.slice(0, 42)}... (${letter.senderOrganization.slice(0, 20)})`;
      const date = new Date(letter.letterDate).toISOString().split('T')[0];

      coverPage.drawText(folio.slice(0, 10), { x: 45, y, size: 8, font: helveticaBold, color: emeraldGreen });
      coverPage.drawText(diary, { x: 100, y, size: 8, font: helvetica, color: darkSlate });
      coverPage.drawText(type, { x: 190, y, size: 7, font: helvetica, color: mutedGray });
      coverPage.drawText(subject, { x: 300, y, size: 7.5, font: helvetica, color: darkSlate });
      coverPage.drawText(date, { x: width - 90, y, size: 8, font: helvetica, color: mutedGray });

      y -= 18;
    }

    // 3. For each letter, append Folio Separator Page + Embedded Document Pages
    for (let i = 0; i < targetLinks.length; i++) {
      const link = targetLinks[i];
      const letter = link.letter;
      const folioLabel = link.folioNumber || `Folio ${i + 1}`;

      // Create Folio Separator / Stamp Page
      const separatorPage = pdfDoc.addPage([595.28, 841.89]);
      const sepHeight = separatorPage.getSize().height;
      const sepWidth = separatorPage.getSize().width;

      // Top Folio Stamp Header
      separatorPage.drawRectangle({
        x: 30,
        y: sepHeight - 85,
        width: sepWidth - 60,
        height: 65,
        color: emeraldGreen,
      });

      separatorPage.drawText(`FOLIO REGISTER NO: ${folioLabel}`, {
        x: 45,
        y: sepHeight - 45,
        size: 14,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });

      separatorPage.drawText(`FILE NUMBER: ${file.fileNumber}  |  ATTACHMENT ROLE: ${link.linkRole}`, {
        x: 45,
        y: sepHeight - 68,
        size: 9,
        font: helveticaBold,
        color: goldAccent,
      });

      let sepY = sepHeight - 110;

      // Metadata Details Box
      separatorPage.drawText(`DIARY NUMBER: ${letter.diaryNumber}  |  BARCODE: ${letter.barcode}`, {
        x: 40,
        y: sepY,
        size: 10,
        font: helveticaBold,
        color: emeraldGreen,
      });

      sepY -= 18;
      separatorPage.drawText(`CLASSIFICATION: ${letter.letterType}  |  PRIORITY: ${letter.priority}`, {
        x: 40,
        y: sepY,
        size: 9,
        font: helveticaBold,
        color: darkSlate,
      });

      sepY -= 20;
      separatorPage.drawText('SUBJECT:', { x: 40, y: sepY, size: 9, font: helveticaBold, color: darkSlate });
      separatorPage.drawText(letter.subject.slice(0, 95), { x: 100, y: sepY, size: 9, font: helvetica, color: darkSlate });

      sepY -= 18;
      separatorPage.drawText('ISSUING AUTH:', { x: 40, y: sepY, size: 9, font: helveticaBold, color: darkSlate });
      separatorPage.drawText(`${letter.senderName} — ${letter.senderOrganization}`, {
        x: 125,
        y: sepY,
        size: 9,
        font: helvetica,
        color: darkSlate,
      });

      sepY -= 18;
      separatorPage.drawText('ADDRESSED TO:', { x: 40, y: sepY, size: 9, font: helveticaBold, color: darkSlate });
      separatorPage.drawText(`${letter.addressedToName} (${letter.addressedToPost})`, {
        x: 125,
        y: sepY,
        size: 9,
        font: helvetica,
        color: darkSlate,
      });

      sepY -= 18;
      separatorPage.drawText('REFERENCE NO:', { x: 40, y: sepY, size: 9, font: helveticaBold, color: darkSlate });
      separatorPage.drawText(letter.referenceNumber || 'N/A', { x: 125, y: sepY, size: 9, font: helvetica, color: mutedGray });

      sepY -= 18;
      separatorPage.drawText('LETTER DATE:', { x: 40, y: sepY, size: 9, font: helveticaBold, color: darkSlate });
      separatorPage.drawText(new Date(letter.letterDate).toISOString().split('T')[0], { x: 125, y: sepY, size: 9, font: helvetica, color: mutedGray });

      sepY -= 18;
      separatorPage.drawText('PHYSICAL CUSTODY:', { x: 40, y: sepY, size: 9, font: helveticaBold, color: darkSlate });
      const custodyDesc = letter.isAttachedInPhysicalFile
        ? 'VERIFIED ATTACHED IN PHYSICAL FILE'
        : `ISSUED OUT TO: ${letter.physicalHolderName || 'Officer'}`;
      separatorPage.drawText(custodyDesc, {
        x: 155,
        y: sepY,
        size: 9,
        font: helveticaBold,
        color: letter.isAttachedInPhysicalFile ? emeraldGreen : rgb(0.8, 0.2, 0.2),
      });

      // Context & Summary Section
      sepY -= 25;
      separatorPage.drawRectangle({
        x: 40,
        y: sepY - 140,
        width: sepWidth - 80,
        height: 155,
        color: rgb(0.97, 0.98, 0.97),
        borderColor: goldAccent,
        borderWidth: 1,
      });

      separatorPage.drawText('GOVERNMENT SUMMARY & CONTEXT / NOTE:', {
        x: 55,
        y: sepY - 5,
        size: 9,
        font: helveticaBold,
        color: emeraldGreen,
      });

      const briefSnippet = letter.briefReason.slice(0, 320);
      separatorPage.drawText(briefSnippet, {
        x: 55,
        y: sepY - 24,
        size: 8.5,
        font: helvetica,
        color: darkSlate,
        maxWidth: sepWidth - 110,
        lineHeight: 13,
      });

      if (link.attachedNote) {
        separatorPage.drawText(`File Note: ${link.attachedNote}`, {
          x: 55,
          y: sepY - 75,
          size: 8,
          font: helveticaBold,
          color: emeraldGreen,
        });
      }

      if (letter.ocrExtractedText) {
        separatorPage.drawText('OCR TEXT TRANSCRIPT (EXCERPT):', {
          x: 55,
          y: sepY - 95,
          size: 8,
          font: helveticaBold,
          color: darkSlate,
        });

        separatorPage.drawText(letter.ocrExtractedText.slice(0, 200).replace(/\n/g, ' '), {
          x: 55,
          y: sepY - 110,
          size: 7.5,
          font: helvetica,
          color: mutedGray,
          maxWidth: sepWidth - 110,
          lineHeight: 11,
        });
      }

      // Check if actual PDF file exists in MinIO or storage and append it
      try {
        const stream = await minioClient.getObject(config.minio.bucket, letter.storageKey);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(chunk as Buffer);
        const pdfBytes = Buffer.concat(chunks);

        const embeddedDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const copiedPages = await pdfDoc.copyPages(embeddedDoc, embeddedDoc.getPageIndices());
        copiedPages.forEach((p) => pdfDoc.addPage(p));
      } catch (storageErr) {
        // Fallback: separator page already represents the complete official folio
      }
    }

    // 4. Finalize and send PDF
    const finalPdfBytes = await pdfDoc.save();

    await logAuditEvent({
      userId: req.user!.id,
      action: 'DOWNLOAD_PDF',
      entityType: 'FILE',
      entityId: file.id,
      req,
      metadata: {
        action: 'MERGE_DOSSIER_PDF',
        fileNumber: file.fileNumber,
        lettersMerged: targetLinks.length,
        fileSizeBytes: finalPdfBytes.length,
      },
    });

    const sanitizedFileNumber = file.fileNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${sanitizedFileNumber}_Complete_Dossier.pdf"`);
    res.send(Buffer.from(finalPdfBytes));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

filesRouter.post('/:id/merge-pdf', authenticateToken, requireFolderAccess('canRead'), handleMergePdf);
filesRouter.get('/:id/merge-pdf', authenticateToken, requireFolderAccess('canRead'), handleMergePdf);
filesRouter.get('/:id/download-all', authenticateToken, requireFolderAccess('canRead'), handleMergePdf);

// GET /api/v1/files/barcode/:code - Barcode scanner resolver
filesRouter.get('/barcode/:code', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const file = await prisma.govFile.findUnique({
      where: { barcode: req.params.code },
      include: {
        department: true,
        _count: { select: { letterLinks: true } },
      },
    });

    if (!file) {
      res.status(404).json({ error: 'No File Jacket matches this barcode' });
      return;
    }

    res.json(file);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
