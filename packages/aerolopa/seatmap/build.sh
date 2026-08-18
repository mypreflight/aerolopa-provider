#!/bin/sh
set -eu

cd "$(dirname "$0")"

rm -rf lib
npm install --no-audit --no-fund --silent
npx tsc -p tsconfig.json
