import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

// Real Instagram caption used as fixture. This is a Spanish-language event
// announcement for a talk at the Museo de las Artes Populares de Jalisco.
// Using a real caption (not a synthetic one) means the test exercises the
// same kind of input the endpoint will see in production.
const REAL_CAPTION = `Guadalajara es capital de gobierno civil y eclesiástico desde hace 460 años gracias a tres personajes que nacieron en Valladolid, España.

En el marco del cumpleaños 511, 500 y 325 de cada uno, algo nos dirá de sus obras Tomás de Híjar Ornelas, en el mejor lugar para demostrarlo: el Museo de las Artes Populares de Jalisco.

Te esperamos este jueves a partir de las 6:00 pm.`;

describe('POST /api/extract-event', () => {
  it('rejects raw_text shorter than 20 chars with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/extract-event')
      .send({ raw_text: 'too short' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it(
    'extracts structured event data from a real Instagram caption',
    async () => {
      const res = await request(app)
        .post('/api/extract-event')
        .send({ raw_text: REAL_CAPTION });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const data = res.body.data;
      expect(data).toBeDefined();

      // Shape: all six fields must be present.
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('starts_at');
      expect(data).toHaveProperty('ends_at');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('venue_hint');
      expect(data).toHaveProperty('location_hint');

      // Types: title and description must be non-empty strings.
      // The other four are string-or-null per our schema.
      expect(typeof data.title).toBe('string');
      expect(data.title.length).toBeGreaterThan(0);
      expect(typeof data.description).toBe('string');

      for (const field of ['starts_at', 'ends_at', 'venue_hint', 'location_hint']) {
        const value = data[field];
        expect(value === null || typeof value === 'string').toBe(true);
      }
    },
    20_000 // 20s timeout — Gemini Flash is fast but network + cold start can spike
  );
});