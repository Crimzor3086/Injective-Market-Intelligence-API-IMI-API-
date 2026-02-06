import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';

let app: ReturnType<typeof buildApp>;

describe('markets routes', () => {
  beforeAll(() => {
    app = buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/markets returns markets', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/markets'
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.items.length).toBeGreaterThan(0);
  });
});
