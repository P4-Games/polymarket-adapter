import { Hono } from 'hono';
import { createAdapterHandler } from '../lib/adapter';

const POLYMARKET_BASE = 'https://clob.polymarket.com';
const STRIP_PREFIX = '/polymarket-clob';

const polymarket = new Hono();

const handler = createAdapterHandler(POLYMARKET_BASE, STRIP_PREFIX);

polymarket.all('/*', handler);

export default polymarket;
