import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('health route', () => {
  it('GET /health returns 200 with database connected', async () => {
    // Arrange: app is imported — no state setup needed for a health check

    // Act: send a fake HTTP GET directly to the app, no port required
    const res = await request(app).get('/health');

    // Assert: server is up and the DB round-trip succeeded
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });
});