import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createEventSchema, updateEventSchema } from '../schemas/events.js';
import { AppError } from '../middleware/error.js';

export const eventsRouter = Router();

// GET /api/events
eventsRouter.get('/', async (_req: Request, res: Response) => {
  const all = await db.select().from(events);
  res.json({ status: 'success', data: all });
});

// GET /api/events/:id
eventsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id', 'INVALID_PARAM'));

  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event) return next(new AppError(404, `Event ${id} not found`, 'NOT_FOUND'));

  res.json({ status: 'success', data: event });
});

// POST /api/events
eventsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const result = createEventSchema.safeParse(req.body);
  if (!result.success) return next(new AppError(400, result.error.message, 'VALIDATION_ERROR'));

  try {
    const [created] = await db.insert(events).values(result.data).returning();
    res.status(201).json({ status: 'success', data: created });
  } catch (err: unknown) {
    if (err instanceof Error && 'cause' in err) {
      const cause = (err as any).cause;
      if (cause?.code === '23503') {
        return next(new AppError(400, 'venue_id does not exist', 'FK_VIOLATION'));
      }
      if (cause?.code === '23505') {
        return next(new AppError(409, 'Event with this venue and url already exists', 'DUPLICATE_EVENT'));
      }
    }
    return next(err);
  }
});

// PATCH /api/events/:id
eventsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id', 'INVALID_PARAM'));

  const result = updateEventSchema.safeParse(req.body);
  if (!result.success) return next(new AppError(400, result.error.message, 'VALIDATION_ERROR'));

  const [updated] = await db.update(events).set(result.data).where(eq(events.id, id)).returning();
  if (!updated) return next(new AppError(404, `Event ${id} not found`, 'NOT_FOUND'));

  res.json({ status: 'success', data: updated });
});

// DELETE /api/events/:id
eventsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id', 'INVALID_PARAM'));

  const [deleted] = await db.delete(events).where(eq(events.id, id)).returning();
  if (!deleted) return next(new AppError(404, `Event ${id} not found`, 'NOT_FOUND'));

  res.json({ status: 'success', data: deleted });
});