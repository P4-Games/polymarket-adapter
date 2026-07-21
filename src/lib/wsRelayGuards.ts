import type { Context, Next } from 'hono';

/**
 * Pure guard/validation logic for the `/polymarket-ws/market` relay, kept out of
 * polymarket-ws.ts so it can be unit tested without importing `hono/bun` (which
 * references the global `Bun` object at module load and crashes under Node —
 * vitest's `forks` pool runs test workers under plain Node even when the CLI
 * itself is launched via `bunx`).
 */

/** Max token ids a single subscribe message may request. */
export const MAX_SUBSCRIBE_ASSETS = 50;

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_WS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Origin is always a full `scheme://host`; allowlist entries may be bare hostnames. */
function hostOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

/** Empty/unset allowlist = allow all origins (local dev). */
export function isOriginAllowed(origin: string | null): boolean {
  const allowed = allowedOrigins();
  if (allowed.length === 0) return true;
  if (!origin) return false;
  const originHost = hostOf(origin);
  return allowed.some((entry) => hostOf(entry) === originHost);
}

export type SubscribeMessage = { assets_ids: string[]; type: 'market' };

/** The relay is subscribe-only: the first client message must be exactly this shape. */
export function parseSubscribe(raw: string): SubscribeMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const msg = parsed as Record<string, unknown>;
  if (msg.type !== 'market') return null;
  if (!Array.isArray(msg.assets_ids) || msg.assets_ids.length === 0) return null;
  if (msg.assets_ids.length > MAX_SUBSCRIBE_ASSETS) return null;
  if (!msg.assets_ids.every((id) => typeof id === 'string')) return null;
  return { type: 'market', assets_ids: msg.assets_ids as string[] };
}

/**
 * Rejects the upgrade outright (proper HTTP status, no socket held open) for
 * disallowed origins.
 */
export function connectionGuard(c: Context, next: Next) {
  const origin = c.req.header('origin') ?? null;
  if (!isOriginAllowed(origin)) {
    return c.text('Forbidden origin', 403);
  }
  return next();
}
