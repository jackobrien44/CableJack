#!/usr/bin/env bash
# Builds the UI for Tizen and packages it as a .wgt file.
#
# Prerequisites:
#   - Node.js and npm installed
#   - Tizen Studio CLI on PATH (provides the `tizen` command)
#   - A developer certificate profile configured in Tizen Studio
#     (Tizen Studio > Tools > Certificate Manager)
#
# Usage:
#   ./scripts/build-tizen.sh [--skip-package]
#
# Flags:
#   --skip-package   Build the dist only; do not run `tizen package`
#                    (useful if you want to inspect the output first)
#
# Outputs:
#   dist/CableJack.wgt  — signed widget package, ready to sideload

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
UI="$ROOT/src/ui"
DIST="$UI/dist"
TIZEN_SRC="$ROOT/tizen"
SKIP_PACKAGE=false

for arg in "$@"; do
  [[ "$arg" == "--skip-package" ]] && SKIP_PACKAGE=true
done

echo "==> Building UI (mode: tizen)..."
cd "$UI"
npm run build -- --mode tizen

echo "==> Copying Tizen manifest..."
cp "$TIZEN_SRC/config.xml" "$DIST/config.xml"

if [ -f "$TIZEN_SRC/icon.png" ]; then
  cp "$TIZEN_SRC/icon.png" "$DIST/icon.png"
else
  echo "    WARNING: tizen/icon.png not found — add a 512x512 PNG icon before store submission."
fi

if [ "$SKIP_PACKAGE" = true ]; then
  echo ""
  echo "Build output: $DIST"
  echo "Skipping packaging (--skip-package)."
  exit 0
fi

echo "==> Packaging as .wgt..."
cd "$DIST"
tizen package --type wgt -- .

WGT_FILE=$(find "$DIST" -maxdepth 1 -name "*.wgt" | head -1)

echo ""
echo "Package: $WGT_FILE"
echo ""
echo "To install on a TV (developer mode must be enabled on the TV):"
echo "  tizen install --name CableJack.wgt -- <TV_IP>:26101"
echo ""
echo "To launch after installing:"
echo "  tizen run -p CableJack.App -- <TV_IP>:26101"
