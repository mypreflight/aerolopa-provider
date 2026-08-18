#!/bin/sh
set -eu

cd "$(dirname "$0")"

rm -rf lib
(cd ../../.. && npm run build)
cp -r ../../../dist lib
