#!/usr/bin/env bash
# Packages the Tizen hosted web app launcher as a .wgt file.
#
# The .wgt is a thin manifest that points to https://cablejack.tv — no UI
# build needed. Updates to the app are live as soon as you deploy; users
# never need to reinstall.
#
# Prerequisites (for signed build):
#   - Tizen Studio CLI on PATH (provides the `tizen` command)
#     Default location: ~/tizen-studio/tools/ide/bin/tizen
#     Add to PATH:  export PATH="$HOME/tizen-studio/tools/ide/bin:$PATH"
#   - A developer certificate profile configured in Tizen Studio
#     (Tizen Studio > Tools > Certificate Manager)
#
# If the `tizen` CLI is not found, an unsigned .wgt is created via zip.
# Unsigned packages work for sideloading in developer mode but cannot be
# submitted to the Samsung Smart TV app store.
#
# Usage:
#   ./scripts/build-tizen.sh
#
# Output:
#   tizen/CableJack.wgt  — widget package, ready to sideload

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIZEN_SRC="$SCRIPT_DIR/../tizen"

if [ ! -f "$TIZEN_SRC/icon.png" ]; then
  echo "WARNING: tizen/icon.png not found — add a 512x512 PNG icon before packaging."
  echo "         (convert src/ui/public/favicon.svg to PNG, or supply your own)"
fi

cd "$TIZEN_SRC"

if command -v tizen &>/dev/null; then
  echo "==> Packaging as .wgt (signed, via Tizen Studio CLI)..."
  tizen package --type wgt -- .
else
  echo "WARNING: 'tizen' CLI not found — building unsigned .wgt via zip."
  echo "         To build a signed package, add Tizen Studio CLI to PATH:"
  echo "           export PATH=\"\$HOME/tizen-studio/tools/ide/bin:\$PATH\""
  echo ""
  echo "==> Packaging as .wgt (unsigned)..."
  rm -f CableJack.wgt
  zip -r CableJack.wgt . -x "*.wgt" -x ".tproject"
fi

WGT_FILE=$(find "$TIZEN_SRC" -maxdepth 1 -name "*.wgt" | head -1)

echo ""
echo "Package: $WGT_FILE"
echo ""
echo "To install on a TV (developer mode must be enabled on the TV):"
echo "  tizen install --name CableJack.wgt -- <TV_IP>:26101"
echo ""
echo "To launch after installing:"
echo "  tizen run -p CableJack.App -- <TV_IP>:26101"
