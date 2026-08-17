#!/bin/bash

echo "🔍 Monitoreando scraper stealth..."
echo ""

for i in {1..10}; do
  echo "📊 Intento $i/10 - $(date +%H:%M:%S)"
  
  STATUS=$(gh run list --repo Borinken/VendoYa --limit 1 --json status -q '.[0].status')
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Workflow completado!"
    echo ""
    gh run view --repo Borinken/VendoYa $(gh run list --repo Borinken/VendoYa --limit 1 --json databaseId -q '.[0].databaseId')
    echo ""
    echo "📝 Logs relevantes:"
    gh run view --repo Borinken/VendoYa $(gh run list --repo Borinken/VendoYa --limit 1 --json databaseId -q '.[0].databaseId') --log | grep -E "(Encontradas|propiedades|ERROR|stealth|Simulando|DEBUG|Total)" | tail -20
    exit 0
  fi
  
  echo "⏳ Estado: $STATUS"
  sleep 15
done

echo "⚠️ Workflow todavía en progreso después de 2.5 minutos"
echo "💡 Ver en GitHub: https://github.com/Borinken/VendoYa/actions"
