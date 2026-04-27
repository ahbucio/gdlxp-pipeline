import { z } from 'zod';

// Request body for POST /api/extract-event.
// Minimum length 20 chars to avoid burning quota on near-empty inputs that
// can't possibly contain an extractable event.
export const extractEventRequestSchema = z.object({
  raw_text: z.string().min(20, 'raw_text must be at least 20 characters'),
});

export type ExtractEventRequest = z.infer<typeof extractEventRequestSchema>;