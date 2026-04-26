import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('venues routes', () => {
  let createdId: number;

  it('GET /api/venues returns list with at least 3 seeded venues', async () => {
    const res = await request(app).get('/api/venues');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/venues creates a venue and returns 201', async () => {
    const slug = `smoke-test-venue-${Date.now()}`;
    const res = await request(app)
      .post('/api/venues')
      .send({ name: 'Smoke Test Venue', slug });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Smoke Test Venue');

    createdId = res.body.data.id; // used by GET/:id, PATCH, DELETE, and cleanup
  });

  it('GET /api/venues/:id returns a single venue', async () => {
    const res = await request(app).get(`/api/venues/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.id).toBe(createdId);
  });

  it('PATCH /api/venues/:id updates a venue', async () => {
    const res = await request(app)
      .patch(`/api/venues/${createdId}`)
      .send({ name: 'Smoke Test Venue Updated' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.name).toBe('Smoke Test Venue Updated');
  });

  it('DELETE /api/venues/:id deletes a venue', async () => {
    const res = await request(app).delete(`/api/venues/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.id).toBe(createdId);
    createdId = 0; // signals afterAll that cleanup already happened
  });

  afterAll(async () => {
    // Safety net: if DELETE test failed partway, this removes the orphaned row.
    // If DELETE test succeeded, createdId is 0 and this is a no-op.
    if (createdId) {
      await request(app).delete(`/api/venues/${createdId}`);
    }
  });
});