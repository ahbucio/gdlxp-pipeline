import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { venues } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createVenueSchema, updateVenueSchema } from '../schemas/venue.js';
import { AppError } from '../middleware/error.js';

export const venuesRouter = Router();

// GET /api/venues
venuesRouter.get('/', async (_req: Request, res: Response) => {
  const all = await db.select().from(venues);
  res.json({ status: 'success', data: all });
});

// GET /api/venues/:id
venuesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id', 'INVALID_PARAM'));

  const [venue] = await db.select().from(venues).where(eq(venues.id, id));
  if (!venue) return next(new AppError(404, `Venue ${id} not found`, 'NOT_FOUND'));

  res.json({ status: 'success', data: venue });
});

// POST /api/venues
venuesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const result = createVenueSchema.safeParse(req.body);
  if (!result.success) return next(new AppError(400, result.error.message, 'VALIDATION_ERROR'));

  const [created] = await db.insert(venues).values(result.data).returning();
  res.status(201).json({ status: 'success', data: created });
});

// PATCH /api/venues/:id
venuesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id', 'INVALID_PARAM'));

  const result = updateVenueSchema.safeParse(req.body);
  if (!result.success) return next(new AppError(400, result.error.message, 'VALIDATION_ERROR'));

  const [updated] = await db.update(venues).set(result.data).where(eq(venues.id, id)).returning();
  if (!updated) return next(new AppError(404, `Venue ${id} not found`, 'NOT_FOUND'));

  res.json({ status: 'success', data: updated });
});

// DELETE /api/venues/:id
venuesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id', 'INVALID_PARAM'));

  const [deleted] = await db.delete(venues).where(eq(venues.id, id)).returning();
  if (!deleted) return next(new AppError(404, `Venue ${id} not found`, 'NOT_FOUND'));

  res.json({ status: 'success', data: deleted });
});