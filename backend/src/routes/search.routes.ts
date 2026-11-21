import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { SystemRole, LetterType, PriorityLevel } from '@prisma/client';

export const searchRouter = Router();

// Stopwords in English and Roman Urdu to extract meaningful concept tokens
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'on', 'at', 'to', 'from', 'with', 'by',
  'letter', 'dak', 'file', 'k', 'ka', 'ki', 'ke', 'ko', 'jo', 'tha', 'thi', 'the', 'hai', 'hain',
  'aya', 'gaya', 'wala', 'wali', 'about', 'regarding', 'please', 'doc', 'record',
]);

/**
 * Tokenize a natural language story query into salient concept keywords
 */
function extractConceptTokens(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  return Array.from(new Set(words));
}

/**
 * Extract a contextual snippet highlighting the matched term
 */
function extractContextualSnippet(text: string | null | undefined, tokens: string[], maxLength = 220): string | null {
  if (!text) return null;

  const lowerText = text.toLowerCase();
  let firstMatchIdx = -1;

  for (const token of tokens) {
    const idx = lowerText.indexOf(token.toLowerCase());
    if (idx !== -1 && (firstMatchIdx === -1 || idx < firstMatchIdx)) {
      firstMatchIdx = idx;
    }
  }

  if (firstMatchIdx === -1) {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  const start = Math.max(0, firstMatchIdx - 60);
  const end = Math.min(text.length, firstMatchIdx + maxLength - 60);
  let snippet = text.slice(start, end).trim();

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

// GET /api/v1/search - Story/Concept-based Archival Search
searchRouter.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q = '',
      year,
      departmentId,
      letterType,
      priority,
      page = '1',
      limit = '25',
    } = req.query;

    const queryString = (q as string).trim();
    const tokens = extractConceptTokens(queryString);

    const where: any = {
      deletedAt: null,
    };

    // Filter by year if specified
    if (year && typeof year === 'string' && !isNaN(Number(year))) {
      const y = parseInt(year, 10);
      where.letterDate = {
        gte: new Date(`${y}-01-01T00:00:00.000Z`),
        lte: new Date(`${y}-12-31T23:59:59.999Z`),
      };
    }

    if (departmentId && typeof departmentId === 'string') {
      where.departmentId = departmentId;
    }

    if (letterType && typeof letterType === 'string') {
      where.letterType = letterType as LetterType;
    }

    if (priority && typeof priority === 'string') {
      where.priority = priority as PriorityLevel;
    }

    // RBAC: Non-SuperAdmin users can only search departments they have canView access to
    if (req.user && req.user.role !== SystemRole.SUPER_ADMIN) {
      const allowedDeptIds = [
        req.user.primaryDeptId,
        ...req.user.deptAccess.filter((d) => d.canView).map((d) => d.departmentId),
      ];

      where.departmentId = { in: allowedDeptIds };
    }

    // Build multi-keyword concept matching clauses
    if (queryString) {
      const searchTerms = tokens.length > 0 ? tokens : [queryString];

      // Match ANY of the concept tokens across the search fields
      const orClauses = searchTerms.flatMap((term) => [
        { subject: { contains: term, mode: 'insensitive' } },
        { briefReason: { contains: term, mode: 'insensitive' } },
        { ocrExtractedText: { contains: term, mode: 'insensitive' } },
        { senderOrganization: { contains: term, mode: 'insensitive' } },
        { senderName: { contains: term, mode: 'insensitive' } },
        { addressedToName: { contains: term, mode: 'insensitive' } },
        { addressedToPost: { contains: term, mode: 'insensitive' } },
        { referenceNumber: { contains: term, mode: 'insensitive' } },
        { diaryNumber: { contains: term, mode: 'insensitive' } },
        { barcode: { contains: term, mode: 'insensitive' } },
        {
          fileLinks: {
            some: {
              file: {
                OR: [
                  { title: { contains: term, mode: 'insensitive' } },
                  { fileNumber: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
        {
          tags: {
            some: {
              tag: {
                name: { contains: term, mode: 'insensitive' },
              },
            },
          },
        },
      ]);

      where.OR = orClauses;
    }

    const take = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * take;

    const [total, letters] = await Promise.all([
      prisma.letter.count({ where }),
      prisma.letter.findMany({
        where,
        include: {
          department: {
            select: { id: true, code: true, name: true, shortName: true },
          },
          fileLinks: {
            include: {
              file: {
                select: { id: true, fileNumber: true, title: true, category: true },
              },
            },
          },
          downmarkings: {
            include: { markedTo: { select: { fullName: true, designation: true } } },
            take: 2,
          },
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { receivedOrSentDate: 'desc' },
        take,
        skip,
      }),
    ]);

    // Enrich results with Contextual Snippets & Relevance Scoring
    const enrichedResults = letters.map((letter) => {
      let matchField = 'subject';
      let snippet = letter.briefReason;
      let relevanceScore = 1;

      const lowerTokens = tokens.length > 0 ? tokens : [queryString.toLowerCase()];

      // Check which field triggered the match
      if (letter.ocrExtractedText && lowerTokens.some((t) => letter.ocrExtractedText!.toLowerCase().includes(t))) {
        matchField = 'ocrExtractedText';
        snippet = extractContextualSnippet(letter.ocrExtractedText, lowerTokens) || letter.briefReason;
        relevanceScore += 3;
      } else if (lowerTokens.some((t) => letter.briefReason.toLowerCase().includes(t))) {
        matchField = 'briefReason';
        snippet = extractContextualSnippet(letter.briefReason, lowerTokens) || letter.briefReason;
        relevanceScore += 2;
      } else if (lowerTokens.some((t) => letter.subject.toLowerCase().includes(t))) {
        matchField = 'subject';
        snippet = letter.briefReason;
        relevanceScore += 4;
      } else if (lowerTokens.some((t) => letter.senderOrganization.toLowerCase().includes(t))) {
        matchField = 'senderOrganization';
        snippet = `Sender: ${letter.senderName} (${letter.senderOrganization}) — ${letter.briefReason}`;
        relevanceScore += 2;
      }

      return {
        ...letter,
        searchMeta: {
          matchField,
          snippet,
          relevanceScore,
          matchedTokens: tokens,
        },
      };
    });

    // Sort by relevance score descending
    enrichedResults.sort((a, b) => b.searchMeta.relevanceScore - a.searchMeta.relevanceScore);

    res.json({
      query: queryString,
      conceptTokens: tokens,
      total,
      page: parseInt(page as string, 10),
      totalPages: Math.ceil(total / take),
      results: enrichedResults,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
