#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
if ! pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only 2>&1; then
  echo "pnpm install failed, cleaning node_modules and retrying..."
  rm -rf node_modules
  pnpm install --loglevel debug --reporter=append-only
fi
