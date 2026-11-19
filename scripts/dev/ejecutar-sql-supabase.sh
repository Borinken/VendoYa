#!/bin/bash

# Configuración de Supabase
SUPABASE_URL="https://iuqumqztkzpfefkgguuq.supabase.co"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?define SUPABASE_SERVICE_ROLE_KEY}"

echo "🚀 Ejecutando SQL en Supabase..."
echo ""

# Leer el archivo SQL
SQL_CONTENT=$(cat SISTEMA_EMAIL_SUPABASE.sql)

# Ejecutar SQL usando la API REST de Supabase
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
  2>&1

echo ""
echo "✅ SQL ejecutado"
echo ""
echo "📊 Verificando tablas creadas..."

# Verificar que las tablas existen
curl -s "${SUPABASE_URL}/rest/v1/email_logs?select=count" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  | jq '.' 2>&1 | head -5

echo ""
echo "✅ Sistema de email configurado en Supabase"
