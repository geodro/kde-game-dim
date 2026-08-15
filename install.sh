#!/usr/bin/env bash
# Install & enable the "Game Dim" KWin script (Plasma 6).
set -euo pipefail

ID="gamedim"
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/kwin/scripts/$ID"

echo "→ Installing to $DEST"
mkdir -p "$DEST/contents/code" "$DEST/contents/config" "$DEST/contents/ui"
cp "$SRC/metadata.json"              "$DEST/metadata.json"
cp "$SRC/contents/code/main.js"      "$DEST/contents/code/main.js"
cp "$SRC/contents/config/main.xml"   "$DEST/contents/config/main.xml"
cp "$SRC/contents/ui/config.ui"      "$DEST/contents/ui/config.ui"

echo "→ Enabling the plugin"
kwriteconfig6 --file kwinrc --group Plugins --key "${ID}Enabled" true

echo "→ Hot-reloading KWin scripting"
qdbus6 org.kde.KWin /Scripting org.kde.kwin.Scripting.unloadScript "$ID" >/dev/null 2>&1 || true
qdbus6 org.kde.KWin /KWin reconfigure >/dev/null 2>&1 || true

echo
echo "✅ Installed. Click into your game — the rest of the screen goes dark."
echo "   Settings: System Settings → Window Management → KWin Scripts → ⚙ Game Dim."
echo "   If nothing reacts, log out and back in once."
