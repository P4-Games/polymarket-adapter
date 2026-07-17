import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import { connectionGuard, parseSubscribe } from '../lib/wsRelayGuards';

const UPSTREAM_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
/** A client that never sends a valid subscribe within this window is dropped. */
const SUBSCRIBE_TIMEOUT_MS = 15_000;

const polymarketWs = new Hono();

// Public: browsers cannot set an Authorization header on a WebSocket upgrade
// request, so this route is mounted before the app's Bearer-token middleware.
// The upstream is public, unauthenticated market data — mitigations in
// wsRelayGuards.ts (origin allowlist, subscribe-shape validation) keep this
// from being an open relay to arbitrary upstream endpoints.
polymarketWs.get(
  '/market',
  connectionGuard,
  upgradeWebSocket((_c) => {
    let upstream: WebSocket | null = null;
    let validated = false;
    let subscribeTimer: ReturnType<typeof setTimeout> | null = null;

    return {
      onOpen(_evt, ws) {
        console.log('[ws-relay] open');

        subscribeTimer = setTimeout(() => {
          if (!validated) {
            console.log('[ws-relay] dropped — no subscribe within timeout');
            ws.close(1008, 'Subscribe timeout');
          }
        }, SUBSCRIBE_TIMEOUT_MS);
      },

      onMessage(evt, ws) {
        if (typeof evt.data !== 'string') return; // protocol is JSON text only

        if (!validated) {
          const subscribe = parseSubscribe(evt.data);
          if (!subscribe) {
            console.log('[ws-relay] dropped — invalid initial subscribe');
            ws.close(1008, 'Invalid subscribe');
            return;
          }
          validated = true;
          if (subscribeTimer) clearTimeout(subscribeTimer);

          upstream = new WebSocket(UPSTREAM_WS_URL);
          upstream.onopen = () => upstream?.send(evt.data as string);
          upstream.onmessage = (upstreamEvt) => {
            if (ws.readyState === 1) ws.send(upstreamEvt.data);
          };
          upstream.onclose = () => {
            if (ws.readyState === 1) ws.close();
          };
          upstream.onerror = () => {
            upstream?.close();
          };
          return;
        }

        // Post-subscribe, only the keepalive ping is forwarded — subscribe-only relay.
        if (evt.data === 'PING') {
          upstream?.send('PING');
        }
      },

      onClose(_evt, _ws) {
        if (subscribeTimer) clearTimeout(subscribeTimer);
        upstream?.close();
        upstream = null;
        console.log('[ws-relay] close');
      },

      onError() {
        upstream?.close();
        upstream = null;
      }
    };
  })
);

export default polymarketWs;
