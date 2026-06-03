import type { Context } from 'hono';

/** Headers stripped before forwarding — never safe to proxy as-is. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-authorization',
  'proxy-connection',
  // Internal proxy auth — must never reach the upstream
  'authorization',
  // Replaced with upstream host below
  'host'
]);

export interface ProxyOptions {
  /** Upstream request timeout in ms. @default 10000 */
  timeout?: number;
}

/** Builds headers safe to forward: drops hop-by-hop, sets upstream Host. */
function buildUpstreamHeaders(incoming: Headers, upstreamHost: string): Headers {
  const out = new Headers();
  for (const [key, value] of incoming.entries()) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      out.set(key, value);
    }
  }
  out.set('host', upstreamHost);
  return out;
}

/**
 * Creates a Hono handler that reverse-proxies requests to `targetBase`.
 *
 * Strips hop-by-hop and `Authorization` headers; replaces `Host` with upstream host.
 * This proxy is credential-agnostic: any auth the upstream requires must arrive
 * from the caller in non-`Authorization` headers (e.g. `CLOB-API-KEY`).
 *
 * @param targetBase  - Full upstream base URL, e.g. `"https://clob.polymarket.com"`
 * @param stripPrefix - Path prefix removed from the incoming request before forwarding
 * @param options     - Optional proxy config
 */
export function createProxyHandler(
  targetBase: string,
  stripPrefix: string,
  options?: ProxyOptions
) {
  const timeout = options?.timeout ?? 10_000;
  const upstreamHost = new URL(targetBase).host;

  return async function proxyHandler(c: Context): Promise<Response> {
    const incomingUrl = new URL(c.req.url);
    const upstreamPath = incomingUrl.pathname.slice(stripPrefix.length) || '/';
    const targetUrl = `${targetBase}${upstreamPath}${incomingUrl.search}`;

    const headers = buildUpstreamHeaders(c.req.raw.headers, upstreamHost);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(targetUrl, {
        method: c.req.method,
        headers,
        body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
        signal: controller.signal,
        // Bun decompresses by default — disable so compressed bytes stream as-is
        // with Content-Encoding header intact for the client to handle
        decompress: false
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === 'AbortError') {
        return c.json({ error: 'Upstream timeout' }, 504);
      }
      console.error(`[proxy] ${c.req.method} ${upstreamPath} → fetch error: ${String(err)}`);
      return c.json({ error: 'Bad gateway' }, 502);
    }

    clearTimeout(timer);

    if (upstreamRes.status >= 400) {
      console.error(`[proxy] ${c.req.method} ${upstreamPath} → upstream ${upstreamRes.status}`);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: upstreamRes.headers
    });
  };
}
