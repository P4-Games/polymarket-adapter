import { Hono } from 'hono';
import { createAdapterHandler } from '../lib/adapter';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const STRIP_PREFIX = '/polymarket-gamma';

const polymarketGamma = new Hono();

const handler = createAdapterHandler(GAMMA_BASE, STRIP_PREFIX);

polymarketGamma.all('/*', handler);

export default polymarketGamma;
