import { Hono } from 'hono';
import { authMiddleware } from './lib/auth';
import health from './routes/health';
import polymarket from './routes/polymarket';
import polymarketData from './routes/polymarket-data';
import polymarketGamma from './routes/polymarket-gamma';

const app = new Hono();

app.route('/health', health);

app.use('/*', authMiddleware);
app.route('/polymarket-clob', polymarket);
app.route('/polymarket-gamma', polymarketGamma);
app.route('/polymarket-data', polymarketData);

const port = Number(process.env.PORT ?? 8080);
console.log(`ChatterPay-EU-Proxy listening on :${port}`);

export default {
  port,
  fetch: app.fetch
};
