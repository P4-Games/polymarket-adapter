import { Hono } from 'hono';
import { afterEach, describe, expect, it } from 'vitest';
import { connectionGuard, isOriginAllowed, parseSubscribe } from '../src/lib/wsRelayGuards';

describe('isOriginAllowed', () => {
  const original = process.env.ALLOWED_WS_ORIGINS;

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOWED_WS_ORIGINS;
    else process.env.ALLOWED_WS_ORIGINS = original;
  });

  it('allows any origin when the allowlist is unset', () => {
    delete process.env.ALLOWED_WS_ORIGINS;
    expect(isOriginAllowed('https://evil.example')).toBe(true);
    expect(isOriginAllowed(null)).toBe(true);
  });

  it('allows only listed origins when the allowlist is set', () => {
    process.env.ALLOWED_WS_ORIGINS = 'https://chatterpay.net, https://app.chatterpay.net';
    expect(isOriginAllowed('https://chatterpay.net')).toBe(true);
    expect(isOriginAllowed('https://app.chatterpay.net')).toBe(true);
    expect(isOriginAllowed('https://evil.example')).toBe(false);
    expect(isOriginAllowed(null)).toBe(false);
  });
});

describe('parseSubscribe', () => {
  it('accepts a well-formed subscribe message', () => {
    const msg = JSON.stringify({ type: 'market', assets_ids: ['1', '2'] });
    expect(parseSubscribe(msg)).toEqual({ type: 'market', assets_ids: ['1', '2'] });
  });

  it('rejects invalid JSON', () => {
    expect(parseSubscribe('not json')).toBeNull();
  });

  it('rejects the wrong type field', () => {
    expect(parseSubscribe(JSON.stringify({ type: 'book', assets_ids: ['1'] }))).toBeNull();
  });

  it('rejects an empty assets_ids array', () => {
    expect(parseSubscribe(JSON.stringify({ type: 'market', assets_ids: [] }))).toBeNull();
  });

  it('rejects more than 50 assets_ids', () => {
    const ids = Array.from({ length: 51 }, (_, i) => String(i));
    expect(parseSubscribe(JSON.stringify({ type: 'market', assets_ids: ids }))).toBeNull();
  });

  it('rejects non-string entries in assets_ids', () => {
    expect(parseSubscribe(JSON.stringify({ type: 'market', assets_ids: [1, 2] }))).toBeNull();
  });

  it('rejects a plain PING before subscribe', () => {
    expect(parseSubscribe('PING')).toBeNull();
  });
});

describe('connectionGuard', () => {
  const original = process.env.ALLOWED_WS_ORIGINS;

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOWED_WS_ORIGINS;
    else process.env.ALLOWED_WS_ORIGINS = original;
  });

  function makeApp() {
    const app = new Hono();
    app.get('/market', connectionGuard, (c) => c.text('ok'));
    return app;
  }

  it('rejects a disallowed origin with 403', async () => {
    process.env.ALLOWED_WS_ORIGINS = 'https://chatterpay.net';
    const res = await makeApp().request('/market', {
      headers: { origin: 'https://evil.example' }
    });
    expect(res.status).toBe(403);
  });

  it('passes through with an allowed origin', async () => {
    const res = await makeApp().request('/market');
    expect(res.status).toBe(200);
  });
});
