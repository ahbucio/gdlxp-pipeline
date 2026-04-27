import { Router, Request, Response, NextFunction } from 'express';
import { extractEventRequestSchema } from '../schemas/extractEvent.js';
import { extractEvent } from '../services/extractEvent.js';
import { AppError } from '../middleware/error.js';

export const extractEventRouter = Router();

// POST /api/extract-event
// Takes raw text (e.g. an Instagram caption), returns structured event data.
// This endpoint does NOT persist anything — it is a manual extraction tool.
extractEventRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = extractEventRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));
    }

    try {
      const data = await extractEvent(parsed.data.raw_text);
      res.json({ status: 'success', data });
    } catch (err) {
      // extractEvent throws AppError(502, ...) on Gemini failures; the error
      // middleware will format the response. Anything else (genuinely
      // unexpected) propagates as a 500 via the same path.
      return next(err);
    }
  }
);