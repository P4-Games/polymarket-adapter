#!/bin/bash
set -e

cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
source .env
set +a

docker build \
  --build-arg AUTH_TOKEN="$AUTH_TOKEN" \
  --build-arg ALLOWED_WS_ORIGINS="$ALLOWED_WS_ORIGINS" \
  -t chatterpay-polymarket-adapter \
  .
