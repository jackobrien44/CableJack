#!/usr/bin/env bash
# Packages the Tizen hosted web app launcher as a .wgt file.
#
# The .wgt is a thin manifest that points to https://cablejack.tv — no UI
# build needed. Updates to the app are live as soon as you deploy; users
# never need to reinstall.
#
# Prerequisites:
#   - Tizen Studio CLI on PATH (provides the `tizen` command)
#   - A developer certificate profile configured in Tizen Studio
#     (Tizen Studio > Tools > Certificate Manager)
#
# Usage:
#   ./scripts/build-tizen.sh
#
# Output:
#   tizen/CableJack.wgt  — signed widget package, ready to sideload

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIZEN_SRC="$SCRIPT_DIR/../tizen"

if [ ! -f "$TIZEN_SRC/icon.png" ]; then
  echo "WARNING: tizen/icon.png not found — add a 512x512 PNG icon before packaging."
fi

echo "==> Packaging as .wgt..."
cd "$TIZEN_SRC"
tizen package --type wgt -- .

WGT_FILE=$(find "$TIZEN_SRC" -maxdepth 1 -name "*.wgt" | head -1)

echo ""
echo "Package: $WGT_FILE"
echo ""
echo "To install on a TV (developer mode must be enabled on the TV):"
echo "  tizen install --name CableJack.wgt -- <TV_IP>:26101"
echo ""
echo "To launch after installing:"
echo "  tizen run -p CableJack.App -- <TV_IP>:26101"
