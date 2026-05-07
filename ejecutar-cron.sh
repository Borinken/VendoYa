#!/bin/bash

# Script para ejecutar el cron de mensajes programados manualmente
# Usar mientras se resuelve el issue de GitHub Actions

echo "🚀 Ejecutando cron de mensajes programados..."
echo ""

RESPONSE=$(curl -s \
  -H "Authorization: Bearer 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17" \
  https://vendoya-kvaagblzr-borinkens-projects.vercel.app/api/cron/send-scheduled)

echo "📦 Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Cron ejecutado exitosamente"
  exit 0
else
  echo "❌ Error al ejecutar cron"
  exit 1
fi
