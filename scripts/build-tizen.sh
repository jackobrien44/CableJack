#!/usr/bin/env bash
# Packages the Tizen hosted web app launcher as an unsigned .wgt file.
#
# The .wgt is a thin manifest that points to https://cablejack.tv — no UI
# build needed. Updates to the app are live as soon as you deploy; users
# never need to reinstall.
#
# Unsigned packages work for sideloading when developer mode is enabled on
# the TV. Signing is not required for this workflow.
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

echo "==> Packaging as .wgt (unsigned)..."
cd "$TIZEN_SRC"
rm -f CableJack.wgt

if command -v zip &>/dev/null; then
  zip -r CableJack.wgt . -x "*.wgt" -x ".tproject"
elif command -v powershell.exe &>/dev/null; then
  # Git Bash on Windows — pwd -W gives C:/... which PowerShell accepts
  # Compress-Archive only accepts .zip, so write a temp zip then rename to .wgt
  SRC_WIN=$(pwd -W)
  powershell.exe -NoProfile -Command "
    \$tmp = '${SRC_WIN}/CableJack.tmp.zip';
    Get-ChildItem -Path '${SRC_WIN}' |
      Where-Object { \$_.Name -notlike '*.wgt' -and \$_.Name -ne '.tproject' -and \$_.Name -ne 'CableJack.tmp.zip' } |
      Compress-Archive -DestinationPath \$tmp -Force;
    Rename-Item -Path \$tmp -NewName 'CableJack.wgt'
  "
else
  echo "ERROR: neither 'zip' nor 'powershell.exe' found — cannot create .wgt." >&2
  exit 1
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
