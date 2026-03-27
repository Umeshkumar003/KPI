#!/usr/bin/env bash
# Opens kpi_erd.drawio in the Draw.io desktop app (Linux).
# Usage: ./open-kpi-erd.sh   OR   bash open-kpi-erd.sh
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILE="$DIR/kpi_erd.drawio"
if [[ ! -f "$FILE" ]]; then
  echo "Missing: $FILE" >&2
  exit 1
fi
if command -v drawio >/dev/null 2>&1; then
  exec drawio "$FILE"
fi
if command -v draw.io >/dev/null 2>&1; then
  exec draw.io "$FILE"
fi
# AppImage / common install paths
for candidate in \
  "$HOME/Applications/drawio" \
  "/opt/draw.io/drawio" \
  "/usr/local/bin/drawio"
do
  if [[ -x "$candidate" ]]; then
    exec "$candidate" "$FILE"
  fi
done
xdg-open "$FILE" 2>/dev/null || open "$FILE" 2>/dev/null || {
  echo "Install Draw.io desktop or run: xdg-open \"$FILE\"" >&2
  exit 1
}
