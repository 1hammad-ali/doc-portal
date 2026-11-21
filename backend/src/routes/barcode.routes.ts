import { Router, Request, Response } from 'express';
import bwipjs from 'bwip-js';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

export const barcodeRouter = Router();

// GET /api/v1/barcode/generate/:code - Render Code-128 printable barcode sticker
barcodeRouter.get('/generate/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code;

    bwipjs.toBuffer(
      {
        bcid: 'code128', // Barcode type
        text: code, // Text to encode
        scale: 3, // 3x scaling factor
        height: 12, // Bar height, in millimeters
        includetext: true, // Show human-readable text
        textxalign: 'center', // Always good to set this
        textsize: 10,
      },
      (err, png) => {
        if (err) {
          res.status(500).send('Barcode generation error');
        } else {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.send(png);
        }
      }
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Universal scanner resolver function (Letters + Files)
const resolveBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code.trim();

    // 1. Check if barcode belongs to a Letter
    const letter = await prisma.letter.findFirst({
      where: {
        OR: [{ barcode: code }, { diaryNumber: code }],
        deletedAt: null,
      },
      include: {
        department: true,
        fileLinks: { include: { file: true } },
        downmarkings: { include: { markedTo: true } },
        custodyLogs: { take: 1, orderBy: { checkedOutAt: 'desc' } },
      },
    });

    if (letter) {
      res.json({ type: 'LETTER', data: letter });
      return;
    }

    // 2. Check if barcode belongs to a File Jacket
    const file = await prisma.govFile.findFirst({
      where: {
        OR: [{ barcode: code }, { fileNumber: code }],
        deletedAt: null,
      },
      include: {
        department: true,
        letterLinks: {
          include: { letter: true },
          take: 10,
        },
        _count: { select: { letterLinks: true } },
      },
    });

    if (file) {
      res.json({ type: 'FILE', data: file });
      return;
    }

    res.status(404).json({ error: `No Letter or File Jacket found matching barcode: ${code}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/barcode/lookup/:code and GET /api/v1/barcode/:code
barcodeRouter.get('/lookup/:code', authenticateToken, resolveBarcode);
barcodeRouter.get('/:code', authenticateToken, resolveBarcode);
