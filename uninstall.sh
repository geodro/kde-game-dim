#!/usr/bin/env bash
# Disable & remove the "Game Dim" KWin script.
set -euo pipefail

ID="gamedim"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/kwin/scripts/$ID"

echo "→ Unloading & disabling"
qdbus6 org.kde.KWin /Scripting org.kde.kwin.Scripting.unloadScript "$ID" >/dev/null 2>&1 || true
kwriteconfig6 --file kwinrc --group Plugins --key "${ID}Enabled" false

echo "→ Removing $DEST"
rm -rf "$DEST"

qdbus6 org.kde.KWin /KWin reconfigure >/dev/null 2>&1 || true

echo
echo "✅ Uninstalled. If a window was left dimmed, it goes back to normal after"
echo "   the reconfigure above — or log out and back in once."
