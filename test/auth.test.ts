import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../src/lib/auth';

function makeApp() {
  const app = new Hono();
  app.use('/*', authMiddleware);
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('authMiddleware', () => {
  const original = process.env['AUTH_TOKEN'];

  beforeEach(() => {
    process.env['AUTH_TOKEN'] = 'secret';
  });

  afterEach(() => {
    if (original === undefined) delete process.env['AUTH_TOKEN'];
    else process.env['AUTH_TOKEN'] = original;
  });

  it('returns 401 when Authorization header is absent', async () => {
    const res = await makeApp().request('/test');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is wrong', async () => {
    const res = await makeApp().request('/test', {
      headers: { Authorization: 'Bearer wrong' }
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when header is not Bearer scheme', async () => {
    const res = await makeApp().request('/test', {
      headers: { Authorization: 'Basic abc123' }
    });
    expect(res.status).toBe(401);
  });

  it('passes through with correct token', async () => {
    const res = await makeApp().request('/test', {
      headers: { Authorization: 'Bearer secret' }
    });
    expect(res.status).toBe(200);
  });

  // AUTH_TOKEN absent means server misconfiguration, not client error
  it('returns 500 when AUTH_TOKEN env var is not set', async () => {
    delete process.env['AUTH_TOKEN'];
    const res = await makeApp().request('/test');
    expect(res.status).toBe(500);
  });
});
