# ChatterPay-EU-Proxy

Reverse proxy on Google Cloud Run (europe-west1) to reach geo-restricted APIs from a European IP.

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

## Cloud Run deploy

```bash
gcloud run deploy chatterpay-eu-proxy \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars AUTH_TOKEN=<your-token> \
  --port 8080
```
