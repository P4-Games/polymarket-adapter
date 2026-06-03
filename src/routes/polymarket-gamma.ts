import { Hono } from 'hono';
import { createProxyHandler } from '../lib/proxy';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const STRIP_PREFIX = '/polymarket-gamma';

const polymarketGamma = new Hono();

const handler = createProxyHandler(GAMMA_BASE, STRIP_PREFIX);

polymarketGamma.all('/*', handler);

export default polymarketGamma;
