#!/usr/bin/env bash
# Genera los iconos PWA + el logo in-app a partir de public/logo-source.png
# usando sips (nativo de macOS). Sustituye al generador del rayo placeholder.
#
# Uso:  bash scripts/gen-icons.sh
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="public/logo-source.png"

if [ ! -f "$SRC" ]; then
  echo "✗ No existe $SRC — guarda ahí el logo (cuadrado) y reintenta."
  exit 1
fi

mkdir -p public/icons

# Iconos cuadrados directos (el logo ya trae fondo negro en las esquinas)
sips -z 192 192  "$SRC" --out public/icons/icon-192.png >/dev/null
sips -z 512 512  "$SRC" --out public/icons/icon-512.png >/dev/null
sips -z 180 180  "$SRC" --out public/apple-touch-icon.png >/dev/null

# Logo in-app (login / header del portal)
sips -z 256 256  "$SRC" --out public/logo.png >/dev/null

# Maskable: el sujeto va reducido al ~78% y se rellena con negro hasta 512x512
# para respetar la "safe zone" de los iconos enmascarables.
sips -z 400 400 "$SRC" --out /tmp/_mask.png >/dev/null
sips -p 512 512 --padColor 0B0B0D /tmp/_mask.png --out public/icons/icon-512-maskable.png >/dev/null
rm -f /tmp/_mask.png

echo "✓ Iconos y logo generados desde $SRC"
ls -1 public/icons public/logo.png public/apple-touch-icon.png 2>/dev/null
