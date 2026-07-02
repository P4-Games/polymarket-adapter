# ChatterPay Polymarket Adapter

Backend adapter for ChatterPay that centralizes calls to the Polymarket APIs.

## Route table

| Prefix | Target |
|---|---|
| `/polymarket-clob/*` | `https://clob.polymarket.com` |
| `/polymarket-gamma/*` | `https://gamma-api.polymarket.com` |
| `/polymarket-data/*` | `https://data-api.polymarket.com` |
| `/health` | local — no auth required |

## Env vars

| Var | Type | Default | Required |
|---|---|---|---|
| `AUTH_TOKEN` | string | — | **yes** |
| `PORT` | number | `8080` | no |

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
