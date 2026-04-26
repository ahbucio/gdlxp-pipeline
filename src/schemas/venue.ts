import { z } from 'zod';

export const createVenueSchema = z.object({
  name: z.string(),
  slug: z.string(),
  website_url: z.url().optional(),
  city: z.string().optional(),
}).strict();

export const updateVenueSchema = createVenueSchema.partial();

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;