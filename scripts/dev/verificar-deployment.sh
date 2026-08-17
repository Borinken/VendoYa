#!/bin/bash

echo "🚀 Verificando deployment del funnel..."
echo ""

# Verificar que el código está en GitHub
echo "1️⃣ Verificando GitHub..."
git log --oneline -3
echo ""

# Verificar build local
echo "2️⃣ Verificando build local..."
npm run build 2>&1 | grep -E "Compiled|Failed" | head -3
echo ""

# Verificar archivos del funnel
echo "3️⃣ Verificando archivos del funnel..."
ls -la app/vende-rapido/ 2>/dev/null && echo "✅ Landing page existe" || echo "❌ Landing page NO existe"
ls -la app/api/leads/create/ 2>/dev/null && echo "✅ API de leads existe" || echo "❌ API de leads NO existe"
ls -la .github/workflows/ 2>/dev/null && echo "✅ GitHub Actions configurado" || echo "❌ GitHub Actions NO configurado"
echo ""

# Verificar Supabase
echo "4️⃣ Verificando Supabase..."
node verificar-funnel.js 2>/dev/null || echo "⚠️  Ejecutar: node verificar-funnel.js"
echo ""

echo "📍 PRÓXIMOS PASOS:"
echo ""
echo "1. Configurar GitHub Secret:"
echo "   https://github.com/Borinken/VendoYa/settings/secrets/actions"
echo "   Name: CRON_SECRET"
echo "   Value: 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17"
echo ""
echo "2. Verificar Vercel deployment:"
echo "   https://vercel.com/borinkens-projects/vendoya-crm"
echo ""
echo "3. Probar el funnel:"
echo "   https://vendoya-crm.vercel.app/vende-rapido"
echo "   (o la URL de producción que veas en Vercel)"
