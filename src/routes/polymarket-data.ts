import { Hono } from 'hono';
import { createProxyHandler } from '../lib/proxy';

const DATA_BASE = 'https://data-api.polymarket.com';
const STRIP_PREFIX = '/polymarket-data';

const polymarketData = new Hono();

const handler = createProxyHandler(DATA_BASE, STRIP_PREFIX);

polymarketData.all('/*', handler);

export default polymarketData;
