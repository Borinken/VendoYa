#!/bin/bash

# Script para actualizar proyecto de Supabase correcto

echo "🔄 Actualizando proyecto de Supabase..."
echo ""

# Solicitar credenciales
echo "📋 Necesito las siguientes credenciales de tu proyecto Supabase:"
echo "   Ábrelas en: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/settings/api"
echo ""

read -p "🔑 Anon key (comienza con 'eyJhb...'): " ANON_KEY
read -p "🔐 Service role key (comienza con 'eyJhb...'): " SERVICE_KEY

# Actualizar .env.local
cat > .env.local << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://iuqumqztkzpfefkgguuq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo "✅ .env.local actualizado"
echo ""

# Actualizar variables en Vercel
echo "🚀 Actualizando Vercel..."
vercel env rm NEXT_PUBLIC_SUPABASE_URL production -y 2>/dev/null
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production -y 2>/dev/null
vercel env rm SUPABASE_SERVICE_ROLE_KEY production -y 2>/dev/null

echo "https://iuqumqztkzpfefkgguuq.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "$ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "$SERVICE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo "✅ Variables de Vercel actualizadas"
echo ""

# Build y deploy
echo "📦 Compilando y desplegando..."
npm run build && vercel --prod

echo ""
echo "🎉 ¡LISTO! Proyecto actualizado al Supabase correcto"
echo ""
echo "📝 SIGUIENTE PASO:"
echo "   Ve al SQL Editor y ejecuta el SQL:"
echo "   https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new"
