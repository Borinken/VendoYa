#!/bin/bash

echo "🔍 VERIFICADOR DE PROGRESO - Sistema de Email"
echo "=============================================="
echo ""

cd /Users/LeslyHector/vendoya-crm

# Verificar Supabase
echo "📊 PASO 1: Verificando Supabase..."
echo ""

SUPABASE_URL="https://iuqumqztkzpfefkgguuq.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc"

# Verificar tabla email_logs
echo -n "  • Tabla email_logs... "
RESULT=$(curl -s "${SUPABASE_URL}/rest/v1/email_logs?select=count" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" 2>&1)

if [[ $RESULT == *"count"* ]]; then
  echo "✅ Existe"
  EMAIL_LOGS_OK=1
else
  echo "❌ No existe"
  EMAIL_LOGS_OK=0
fi

# Verificar tabla tasks
echo -n "  • Tabla tasks... "
RESULT=$(curl -s "${SUPABASE_URL}/rest/v1/tasks?select=count" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" 2>&1)

if [[ $RESULT == *"count"* ]]; then
  echo "✅ Existe"
  TASKS_OK=1
else
  echo "❌ No existe"
  TASKS_OK=0
fi

# Verificar tabla email_accounts
echo -n "  • Tabla email_accounts... "
RESULT=$(curl -s "${SUPABASE_URL}/rest/v1/email_accounts?select=count" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" 2>&1)

if [[ $RESULT == *"count"* ]]; then
  echo "✅ Existe"
  EMAIL_ACCOUNTS_OK=1
else
  echo "❌ No existe"
  EMAIL_ACCOUNTS_OK=0
fi

echo ""

# Resultado PASO 1
if [[ $EMAIL_LOGS_OK -eq 1 ]] && [[ $TASKS_OK -eq 1 ]] && [[ $EMAIL_ACCOUNTS_OK -eq 1 ]]; then
  echo "✅ PASO 1 COMPLETADO - Todas las tablas existen"
else
  echo "⚠️  PASO 1 PENDIENTE - Ejecuta el SQL en Supabase"
  echo "   URL: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar Gmail OAuth
echo "🔐 PASO 2: Verificando Gmail OAuth..."
echo ""

if [ -f .env.local ]; then
  echo -n "  • Archivo .env.local... "
  echo "✅ Existe"
  
  if grep -q "GMAIL_CLIENT_ID" .env.local; then
    echo -n "  • GMAIL_CLIENT_ID... "
    echo "✅ Configurado"
    CLIENT_ID_OK=1
  else
    echo -n "  • GMAIL_CLIENT_ID... "
    echo "❌ No configurado"
    CLIENT_ID_OK=0
  fi
  
  if grep -q "GMAIL_CLIENT_SECRET" .env.local; then
    echo -n "  • GMAIL_CLIENT_SECRET... "
    echo "✅ Configurado"
    CLIENT_SECRET_OK=1
  else
    echo -n "  • GMAIL_CLIENT_SECRET... "
    echo "❌ No configurado"
    CLIENT_SECRET_OK=0
  fi
  
  if grep -q "GMAIL_ACCESS_TOKEN" .env.local; then
    echo -n "  • GMAIL_ACCESS_TOKEN... "
    echo "✅ Configurado"
    ACCESS_TOKEN_OK=1
  else
    echo -n "  • GMAIL_ACCESS_TOKEN... "
    echo "❌ No configurado"
    ACCESS_TOKEN_OK=0
  fi
else
  echo "  • Archivo .env.local... ❌ No existe"
  CLIENT_ID_OK=0
  CLIENT_SECRET_OK=0
  ACCESS_TOKEN_OK=0
fi

echo ""

# Resultado PASO 2
if [[ $CLIENT_ID_OK -eq 1 ]] && [[ $CLIENT_SECRET_OK -eq 1 ]] && [[ $ACCESS_TOKEN_OK -eq 1 ]]; then
  echo "✅ PASO 2 COMPLETADO - Gmail OAuth configurado"
else
  echo "⚠️  PASO 2 PENDIENTE - Configura Gmail OAuth"
  echo "   1. Google Cloud Console: https://console.cloud.google.com"
  echo "   2. Ejecuta: node obtener-gmail-token.js"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Resumen final
if [[ $EMAIL_LOGS_OK -eq 1 ]] && [[ $TASKS_OK -eq 1 ]] && [[ $EMAIL_ACCOUNTS_OK -eq 1 ]] && \
   [[ $CLIENT_ID_OK -eq 1 ]] && [[ $CLIENT_SECRET_OK -eq 1 ]] && [[ $ACCESS_TOKEN_OK -eq 1 ]]; then
  echo "🎉 ¡TODO LISTO! Sistema de email configurado completamente"
  echo ""
  echo "Prueba sincronización:"
  echo "  npm run dev"
  echo "  # En otra terminal:"
  echo "  curl -X POST http://localhost:3000/api/email/sync \\"
  echo "    -H \"Content-Type: application/json\" \\"
  echo "    -d '{\"email\": \"tu@gmail.com\", \"maxResults\": 5}'"
else
  echo "⚠️  CONFIGURACIÓN INCOMPLETA"
  echo ""
  echo "Pasos pendientes:"
  if [[ $EMAIL_LOGS_OK -eq 0 ]] || [[ $TASKS_OK -eq 0 ]] || [[ $EMAIL_ACCOUNTS_OK -eq 0 ]]; then
    echo "  1. ❌ Ejecutar SQL en Supabase"
  else
    echo "  1. ✅ SQL ejecutado en Supabase"
  fi
  
  if [[ $CLIENT_ID_OK -eq 0 ]] || [[ $CLIENT_SECRET_OK -eq 0 ]] || [[ $ACCESS_TOKEN_OK -eq 0 ]]; then
    echo "  2. ❌ Configurar Gmail OAuth"
  else
    echo "  2. ✅ Gmail OAuth configurado"
  fi
  
  echo ""
  echo "Lee la guía completa: GUIA_PASO_A_PASO_COMPLETA.md"
fi

echo ""
echo "=============================================="
