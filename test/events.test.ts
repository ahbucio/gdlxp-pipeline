import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('events routes', () => {
  let venueId: number;
  let createdId: number;

  beforeAll(async () => {
    // Fetch a seeded venue id for use as FK — we don't hardcode an id
    // because auto-increment ids can differ between environments.
    const res = await request(app).get('/api/venues');
    venueId = res.body.data[0].id;
  });

  it('GET /api/events returns list', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/events creates an event and returns 201', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        venue_id: venueId,
        title: 'Smoke Test Event',
        starts_at: '2025-12-01T18:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.title).toBe('Smoke Test Event');

    createdId = res.body.data.id;
  });

  it('GET /api/events/:id returns a single event', async () => {
    const res = await request(app).get(`/api/events/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.id).toBe(createdId);
  });

  it('PATCH /api/events/:id updates an event', async () => {
    const res = await request(app)
      .patch(`/api/events/${createdId}`)
      .send({ title: 'Smoke Test Event Updated' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.title).toBe('Smoke Test Event Updated');
  });

  it('DELETE /api/events/:id deletes an event', async () => {
    const res = await request(app).delete(`/api/events/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.id).toBe(createdId);
    createdId = 0;
  });

  afterAll(async () => {
    if (createdId) {
      await request(app).delete(`/api/events/${createdId}`);
    }
  });
});