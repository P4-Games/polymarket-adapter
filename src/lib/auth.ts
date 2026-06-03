import type { Context, Next } from 'hono';

/**
 * Validates `Authorization: Bearer <token>` against the `AUTH_TOKEN` env var.
 *
 * Returns 500 when `AUTH_TOKEN` is unset — this is a server misconfiguration,
 * not a client error, so 401 would be misleading.
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | undefined> {
  const expected = process.env.AUTH_TOKEN;
  if (!expected) {
    return c.json({ error: 'Server misconfigured: AUTH_TOKEN not set' }, 500);
  }

  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = header.slice(7);
  if (token !== expected) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}
