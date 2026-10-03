#!/usr/bin/env bash
# Instala dependencias y deja todo listo para correr en local.
set -e

echo "🚀 AI Cash Machine — preparando tu proyecto…"

# 1) ¿Tienes pnpm? Si no, lo activamos.
if ! command -v pnpm >/dev/null 2>&1; then
  echo "📦 No encontré pnpm. Activándolo…"
  corepack enable 2>/dev/null || npm install -g pnpm
fi

# 2) Instala las dependencias.
echo "📥 Instalando dependencias (puede tardar 1–2 minutos)…"
pnpm install

# 3) Crea tu archivo de llaves si no existe.
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "🔑 Creé .env.local — ábrelo y pega tus llaves (sin ellas corre en MODO DEMO)."
fi

echo ""
echo "✅ ¡Listo! Ahora corre:  pnpm dev"
echo "   y abre en tu navegador:  http://localhost:3000"
