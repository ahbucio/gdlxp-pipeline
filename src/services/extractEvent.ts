// LLM-based event extraction service.
// Takes raw text (e.g. an Instagram caption) and returns structured event data
// by calling Gemini 2.5 Flash with native JSON-mode structured output.

import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { config } from '../config/env.js';
import { AppError } from '../middleware/error.js';

// ---------- Output schema ----------
// What our service guarantees to callers. Used for defensive parsing of the
// model's response — even with structured output, we don't trust shape blindly.
export const ExtractedEventSchema = z.object({
  title: z.string().min(1),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  description: z.string(),
  venue_hint: z.string().nullable(),
  location_hint: z.string().nullable(),
});

export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;

// ---------- Gemini response schema ----------
// Sent to Gemini so its decoder is constrained to produce JSON of this shape.
// Note: Gemini uses its own Type enum, not raw JSON Schema strings.
const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    starts_at: { type: Type.STRING, nullable: true },
    ends_at: { type: Type.STRING, nullable: true },
    description: { type: Type.STRING },
    venue_hint: { type: Type.STRING, nullable: true },
    location_hint: { type: Type.STRING, nullable: true },
  },
  required: [
    'title',
    'starts_at',
    'ends_at',
    'description',
    'venue_hint',
    'location_hint',
  ],
};

// ---------- System instruction ----------
// Defines the model's role and constraints. Stays constant across all calls.
const SYSTEM_INSTRUCTION = `You extract structured event data from raw text such as Instagram captions for events in Guadalajara, Mexico.

Rules:
- title: a concise event name (1-100 chars). Required.
- starts_at: ISO 8601 datetime string (e.g. "2025-11-15T20:00:00-06:00") if you can determine it; otherwise null. Use timezone -06:00 for Guadalajara unless the text states otherwise.
- ends_at: ISO 8601 datetime string if explicitly given; otherwise null. Do NOT guess end times.
- description: a 1-3 sentence neutral summary of the event in the original language of the text. Never include hashtags, emojis, or @mentions.
- venue_hint: the venue name as written in the text (e.g. "C3 Stage", "Foro Independencia"); null if no venue is mentioned.
- location_hint: a neighborhood, address, or city if mentioned (e.g. "Providencia", "Av. Vallarta 1234"); null if not mentioned.

Never invent information not present in the text. If a field is not extractable, return null (or "" for description if there is genuinely no descriptive content).`;

// ---------- Service function ----------
const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function extractEvent(rawText: string): Promise<ExtractedEvent> {
  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: rawText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: geminiResponseSchema,
      },
    });
  } catch (err) {
    // Network failure, auth failure, quota exceeded, model unavailable, etc.
    const message = err instanceof Error ? err.message : 'unknown error';
    throw new AppError(502, `Gemini API call failed: ${message}`, 'LLM_UPSTREAM_ERROR');
  }

  const text = response.text;
  if (!text) {
    throw new AppError(502, 'Gemini returned no text in response', 'LLM_EMPTY_RESPONSE');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppError(502, 'Gemini returned non-JSON output despite JSON mode', 'LLM_INVALID_JSON');
  }

  const result = ExtractedEventSchema.safeParse(parsed);
  if (!result.success) {
    throw new AppError(
      502,
      `Gemini output failed schema validation: ${result.error.message}`,
      'LLM_SCHEMA_MISMATCH'
    );
  }

  return result.data;
}