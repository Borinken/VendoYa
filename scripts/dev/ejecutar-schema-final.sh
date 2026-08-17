#!/bin/bash

echo "🗄️  Ejecutando SCHEMA_LEADS.sql en Supabase..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Leer el SQL
SQL_FILE="SCHEMA_LEADS.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ No se encuentra $SQL_FILE${NC}"
    exit 1
fi

# Intentar instalar psql si no existe
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql no está instalado${NC}"
    echo ""
    echo "Instalando postgres..."
    if command -v brew &> /dev/null; then
        brew install postgresql@15
    else
        echo -e "${RED}❌ Homebrew no está instalado${NC}"
        echo "Instala Homebrew desde: https://brew.sh"
        echo "O ejecuta manualmente el SQL en Supabase"
        exit 1
    fi
fi

# Connection string de Supabase
DB_URL="postgresql://postgres.iuqumqztkzpfefkgguuq:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo -e "${YELLOW}📋 Para ejecutar el SQL necesitas la contraseña de la base de datos${NC}"
echo ""
echo "Opciones:"
echo ""
echo "1️⃣  MANUAL (RECOMENDADO):"
echo "   - Abre: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new"
echo "   - El SQL ya está copiado (Cmd+V para pegar)"
echo "   - Haz clic en 'RUN'"
echo ""
echo "2️⃣  CON PSQL (necesitas la contraseña):"
echo "   - Ve a Supabase Settings > Database > Connection String"
echo "   - Copia la contraseña"
echo "   - Ejecuta:"
echo "     psql 'postgresql://postgres.iuqumqztkzpfefkgguuq:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres' -f SCHEMA_LEADS.sql"
echo ""
echo -e "${GREEN}El SQL está copiado en tu portapapeles.${NC}"
echo "Solo pégalo en el SQL Editor de Supabase y haz clic en RUN."
