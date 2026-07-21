import { Hono } from 'hono';
import { websocket } from 'hono/bun';
import { authMiddleware } from './lib/auth';
import health from './routes/health';
import polymarket from './routes/polymarket';
import polymarketData from './routes/polymarket-data';
import polymarketGamma from './routes/polymarket-gamma';
import polymarketWs from './routes/polymarket-ws';

const app = new Hono();

app.route('/health', health);

// Public: WebSocket upgrade requests can't carry an Authorization header, so
// this is mounted before the Bearer-token middleware. See polymarket-ws.ts
// for the mitigations (origin allowlist, subscribe validation, timeout).
app.route('/polymarket-ws', polymarketWs);

app.use('/*', authMiddleware);
app.route('/polymarket-clob', polymarket);
app.route('/polymarket-gamma', polymarketGamma);
app.route('/polymarket-data', polymarketData);

const port = Number(process.env.PORT ?? 8080);
console.log(`ChatterPay Polymarket Adapter listening on :${port}`);

export default {
  port,
  fetch: app.fetch,
  websocket
};
