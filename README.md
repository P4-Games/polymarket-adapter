# ChatterPay Polymarket Adapter

Backend adapter for ChatterPay that centralizes calls to the Polymarket APIs.

## Route table

| Prefix | Target |
|---|---|
| `/polymarket-clob/*` | `https://clob.polymarket.com` |
| `/polymarket-gamma/*` | `https://gamma-api.polymarket.com` |
| `/polymarket-data/*` | `https://data-api.polymarket.com` |
| `/polymarket-ws/market` | `wss://ws-subscriptions-clob.polymarket.com/ws/market` (WebSocket relay, public — see below) |
| `/health` | local — no auth required |

`/polymarket-ws/market` is mounted **before** the Bearer-token middleware — browsers
cannot set an `Authorization` header on a WebSocket upgrade. It's a subscribe-only
relay to Polymarket's public, unauthenticated market-data socket: the first client
message must be `{ "type": "market", "assets_ids": [...] }` (≤ 50 ids) or the
connection is dropped, and only that message plus subsequent `"PING"` keepalives are
forwarded upstream. Mitigations: `ALLOWED_WS_ORIGINS` origin allowlist, subscribe
shape validation, and a 15 s timeout to drop connections that never subscribe.

## Env vars

| Var | Type | Default | Required |
|---|---|---|---|
| `AUTH_TOKEN` | string | — | **yes** |
| `PORT` | number | `8080` | no |
| `ALLOWED_WS_ORIGINS` | string (comma-separated) | unset = allow all | no (set in production) |

## Local dev

```bash
bun install
AUTH_TOKEN=secret bun run dev
```

Test:
```bash
curl -H "Authorization: Bearer secret" http://localhost:8080/polymarket-clob/markets
curl http://localhost:8080/health
```
