import { Hono } from "hono";
import { createProxyHandler } from "../lib/proxy";

const POLYMARKET_BASE = "https://clob.polymarket.com";
const STRIP_PREFIX = "/polymarket-clob";

const polymarket = new Hono();

const handler = createProxyHandler(POLYMARKET_BASE, STRIP_PREFIX);

polymarket.all("/*", handler);

export default polymarket;
