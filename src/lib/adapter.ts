import type { Context } from 'hono';

/** Headers stripped before forwarding to upstream APIs. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-authorization',
  'proxy-connection',
  'authorization',
  'host'
]);

export interface AdapterOptions {
  /** Upstream request timeout in ms. @default 10000 */
  timeout?: number;
}

/** Builds headers safe to forward: drops hop-by-hop headers and sets upstream Host. */
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
 * Creates a Hono handler that adapts requests to `targetBase`.
 *
 * Strips hop-by-hop and `Authorization` headers; replaces `Host` with upstream host.
 * Any auth the upstream requires must arrive from the caller in non-`Authorization`
 * headers, such as `CLOB-API-KEY`.
 *
 * @param targetBase  - Full upstream base URL, e.g. `"https://clob.polymarket.com"`
 * @param stripPrefix - Path prefix removed from the incoming request before forwarding
 * @param options     - Optional adapter config
 */
export function createAdapterHandler(
  targetBase: string,
  stripPrefix: string,
  options?: AdapterOptions
) {
  const timeout = options?.timeout ?? 10_000;
  const upstreamHost = new URL(targetBase).host;

  return async function adapterHandler(c: Context): Promise<Response> {
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
        // Bun decompresses by default; disable so compressed bytes stream as-is
        // with Content-Encoding header intact for the client to handle.
        decompress: false
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === 'AbortError') {
        return c.json({ error: 'Upstream timeout' }, 504);
      }
      console.error(`[adapter] ${c.req.method} ${upstreamPath} fetch error: ${String(err)}`);
      return c.json({ error: 'Bad gateway' }, 502);
    }

    clearTimeout(timer);

    if (upstreamRes.status >= 400) {
      console.error(`[adapter] ${c.req.method} ${upstreamPath} upstream ${upstreamRes.status}`);
    }

    // TEMP DIAG: inspect L2 auth headers + upstream error body on order POST. Remove after debug.
    if (
      upstreamPath.includes('/order') ||
      upstreamPath.includes('/auth/api-key') ||
      upstreamPath.includes('/auth/derive-api-key')
    ) {
      const diag = {
        apiKey: (headers.get('poly_api_key') ?? headers.get('poly-api-key'))?.slice(0, 8),
        address: headers.get('poly_address') ?? headers.get('poly-address'),
        timestamp: headers.get('poly_timestamp') ?? headers.get('poly-timestamp'),
        sig: (headers.get('poly_signature') ?? headers.get('poly-signature'))?.slice(0, 12),
        pass: (headers.get('poly_passphrase') ?? headers.get('poly-passphrase'))?.slice(0, 8),
        hdrNames: [...headers.keys()].join(',')
      };
      const errBody = await upstreamRes.clone().text();
      console.log(
        `[adapter:diag] ${c.req.method} ${upstreamPath} status=${upstreamRes.status} req=${JSON.stringify(diag)} resp=${errBody}`
      );
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: upstreamRes.headers
    });
  };
}
