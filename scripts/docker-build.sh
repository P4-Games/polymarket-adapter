#!/bin/bash
set -e

cd "$(dirname "$0")/.."

export $(grep -v '^#' .env | xargs)

docker build \
  -t chatterpay-polymarket-adapter \
  .
