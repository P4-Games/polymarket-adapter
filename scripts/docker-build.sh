#!/bin/bash
set -e

cd "$(dirname "$0")/.."

export $(grep -v '^#' .env | xargs)

docker build \
  --build-arg AUTH_TOKEN="$AUTH_TOKEN" \
  --build-arg ALLOWED_WS_ORIGINS="$ALLOWED_WS_ORIGINS" \
  -t chatterpay-polymarket-adapter \
  .
