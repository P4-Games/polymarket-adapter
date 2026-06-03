import { Hono } from 'hono';
import { createAdapterHandler } from '../lib/adapter';

const DATA_BASE = 'https://data-api.polymarket.com';
const STRIP_PREFIX = '/polymarket-data';

const polymarketData = new Hono();

const handler = createAdapterHandler(DATA_BASE, STRIP_PREFIX);

polymarketData.all('/*', handler);

export default polymarketData;
