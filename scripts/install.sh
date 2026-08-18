#!/bin/sh
set -eu
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node 20+ first." >&2
  exit 1
fi
npm install -g @kryptosai/mcp-observatory@latest
echo "Run: mcp-observatory"
