#!/usr/bin/env bash
# Packages the WebOS hosted web app launcher as an .ipk file.
#
# The .ipk is a thin manifest that points to https://cablejack.tv — no UI
# build needed. Updates to the app are live as soon as you deploy; users
# never need to reinstall.
#
# Prerequisites:
#   - Node.js and npm installed
#   - ares-cli installed: npm install -g @webosose/ares-cli
#
# Usage:
#   ./scripts/build-webos.sh
#
# Output:
#   webos/tv.cablejack.app_1.0.0_all.ipk  — package ready to sideload

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBOS_SRC="$SCRIPT_DIR/../webos"

for icon in icon.png largeIcon.png; do
  if [ ! -f "$WEBOS_SRC/$icon" ]; then
    echo "WARNING: webos/$icon not found — add it before packaging."
  fi
done

echo "==> Packaging as .ipk..."
cd "$WEBOS_SRC"
ares-package .

IPK_FILE=$(find "$WEBOS_SRC" -maxdepth 1 -name "*.ipk" | head -1)

echo ""
echo "Package: $IPK_FILE"
echo ""
echo "To install on a TV (developer mode must be enabled on the TV):"
echo "  ares-setup-device  # register your TV first (one-time)"
echo "  ares-install --device <device-name> $IPK_FILE"
echo ""
echo "To launch after installing:"
echo "  ares-launch --device <device-name> tv.cablejack.app"
