import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProxyHandler } from '../src/lib/proxy';

function makeApp(base = 'https://api.example.com', prefix = '/prefix') {
  const app = new Hono();
  app.all('/*', createProxyHandler(base, prefix));
  return app;
}

describe('createProxyHandler', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('strips Authorization, hop-by-hop headers and sets upstream Host', async () => {
    let captured: Headers | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit) => {
        captured = init.headers as Headers;
        return new Response('{}', { status: 200 });
      })
    );

    await makeApp().request('/prefix/path', {
      headers: {
        authorization: 'Bearer token',
        connection: 'keep-alive',
        'transfer-encoding': 'chunked',
        'x-custom': 'value'
      }
    });

    expect(captured?.get('authorization')).toBeNull();
    expect(captured?.get('connection')).toBeNull();
    expect(captured?.get('transfer-encoding')).toBeNull();
    expect(captured?.get('x-custom')).toBe('value');
    expect(captured?.get('host')).toBe('api.example.com');
  });

  it('strips prefix and forwards path + query string', async () => {
    let capturedUrl: string | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        capturedUrl = url as string;
        return new Response('{}', { status: 200 });
      })
    );

    await makeApp('https://api.example.com', '/polymarket-clob').request(
      '/polymarket-clob/markets?limit=10&next_cursor=abc'
    );

    expect(capturedUrl).toBe('https://api.example.com/markets?limit=10&next_cursor=abc');
  });

  it('preserves upstream status code exactly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not found', { status: 404 }))
    );

    const res = await makeApp().request('/prefix/path');
    expect(res.status).toBe(404);
  });

  it('returns 504 on AbortError (timeout)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      })
    );

    const res = await makeApp().request('/prefix/path');
    expect(res.status).toBe(504);
  });

  it('returns 502 on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      })
    );

    const res = await makeApp().request('/prefix/path');
    expect(res.status).toBe(502);
  });
});
