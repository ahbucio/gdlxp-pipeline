import { z } from 'zod';

export const createEventSchema = z.object({
  venue_id: z.number().int(),
  title: z.string(),
  starts_at: z.iso.datetime().transform(s => new Date(s)),
  ends_at: z.iso.datetime().transform(s => new Date(s)).optional(),
  description: z.string().optional(),
  url: z.url().optional(),
  raw_source: z.unknown().optional(),
}).strict();

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;