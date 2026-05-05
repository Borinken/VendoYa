# ⏱️ Scraping Minuto a Minuto - Guía Completa

## 🚀 Sistema Automatizado 24/7

Se ha configurado un sistema de **scraping automático cada minuto** usando Vercel Cron Jobs.

---

## 📋 Arquitectura

### Componentes

1. **Vercel Cron Job**
   - Se ejecuta cada minuto (`* * * * *`)
   - Llama al endpoint `/api/cron/sync-properties`
   - Autenticado con `CRON_SECRET`

2. **Endpoint de Sincronización**
   - Archivo: `/app/api/cron/sync-properties/route.ts`
   - Verifica que auto-sync esté habilitado
   - Ejecuta todos los filtros activos
   - Detecta propiedades nuevas
   - Envía notificaciones WhatsApp automáticas

3. **Rate Limiting Ajustado**
   - 15 requests/minuto por plataforma (antes 10)
   - 200 requests/hora por plataforma (antes 100)
   - 1000 requests/día por plataforma (antes 500)

---

## ⚙️ Configuración Paso a Paso

### 1. Variables de Entorno en Vercel

Agregar las siguientes variables en Vercel Dashboard:

```bash
# Ya configuradas:
ENCRYPTION_MASTER_KEY=52c5c2c78591f1dfefd9a517ff8a0b7c1d4d876eedb354375b796593ed43cd17

# NUEVAS - Agregar ahora:
CRON_SECRET=0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17
NEXT_PUBLIC_APP_URL=https://vendoya-75k9fzqpf-borinkens-projects.vercel.app
```

#### Comandos para agregar en Vercel:

```bash
# 1. CRON_SECRET
vercel env add CRON_SECRET production

# 2. NEXT_PUBLIC_APP_URL
vercel env add NEXT_PUBLIC_APP_URL production
```

### 2. Ejecutar SQL en Supabase

**URL**: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new

Copiar y ejecutar el contenido de: `SQL_SCRAPING_MINUTO_A_MINUTO.sql`

```sql
INSERT INTO system_config (config_key, config_value, description, updated_at) VALUES
('auto_sync_properties', 'true', 'Sincronización automática habilitada', NOW()),
('sync_interval_minutes', '1', 'Intervalo de 1 minuto', NOW())
ON CONFLICT (config_key) 
DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW();
```

### 3. Desplegar a Producción

```bash
cd /Users/LeslyHector/vendoya-crm
npm run build
vercel --prod
```

---

## 🔄 Flujo de Ejecución

```
Cada minuto (cron)
        ↓
Vercel llama /api/cron/sync-properties
        ↓
Verificar auth con CRON_SECRET
        ↓
¿Auto-sync habilitado?
        ↓ Sí
Obtener filtros activos de DB
        ↓
Para cada filtro:
  - Ejecutar scraping seguro
  - Verificar propiedades duplicadas
  - Guardar nuevas propiedades
  - Aplicar rate limiting
        ↓
¿Hay propiedades nuevas?
        ↓ Sí
Verificar alarmas activas
        ↓
Para cada propiedad nueva:
  - ¿Cumple condiciones de alarma?
  - Enviar notificación WhatsApp
  - Marcar como notificada
        ↓
Retornar estadísticas
```

---

## 📊 Configuración de Cron en vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-properties",
      "schedule": "* * * * *"
    }
  ]
}
```

### Formato del Schedule (Cron Expression)

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Día de la semana (0-6, 0=Domingo)
│ │ │ └───── Mes (1-12)
│ │ └─────── Día del mes (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

**Ejemplos**:
- `* * * * *` - Cada minuto
- `*/5 * * * *` - Cada 5 minutos
- `0 * * * *` - Cada hora
- `0 */2 * * *` - Cada 2 horas

---

## 🔒 Seguridad del Cron

### Autenticación

El endpoint `/api/cron/sync-properties` verifica:

```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### CRON_SECRET

- **Generado**: `0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17`
- **Uso**: Vercel incluye automáticamente este header al llamar cron jobs
- **Protección**: Evita que terceros ejecuten el endpoint

---

## 📈 Monitoreo y Logs

### Ver Logs en Vercel

1. Ve a: https://vercel.com/borinkens-projects/vendoya-crm
2. Clic en "Logs"
3. Filtra por: `/api/cron/sync-properties`

### Logs Esperados

```
✅ Éxito:
🤖 Iniciando sincronización automática (cron minuto a minuto)...
📊 Ejecutando 3 filtros...
🔔 2 propiedades nuevas, verificando alarmas...
📱 Notificación WhatsApp enviada para propiedad ABC123
✅ Sincronización completada

❌ Auto-sync deshabilitado:
Auto-sync deshabilitado (skipped: true)

⚠️ Sin filtros:
No hay filtros activos (newProperties: 0)
```

### Response del Endpoint

```json
{
  "success": true,
  "timestamp": "2025-01-02T10:30:00.000Z",
  "filtersExecuted": 3,
  "newProperties": 2,
  "results": [
    {
      "filter": "Madrid Centro",
      "platform": "idealista",
      "propertiesFound": 5
    },
    {
      "filter": "Barcelona Eixample",
      "platform": "fotocasa",
      "propertiesFound": 3
    }
  ]
}
```

---

## 🎛️ Control del Sistema

### Habilitar/Deshabilitar Auto-Sync

**En Supabase**:
```sql
-- Habilitar
UPDATE system_config 
SET config_value = 'true' 
WHERE config_key = 'auto_sync_properties';

-- Deshabilitar
UPDATE system_config 
SET config_value = 'false' 
WHERE config_key = 'auto_sync_properties';
```

**Desde la UI** (Panel de Propiedades):
- Clic en el toggle "Auto-Sync Activo"

### Cambiar Intervalo

**Nota**: El intervalo en la DB es solo para referencia. El cron se controla desde `vercel.json`.

Para cambiar el intervalo del cron:

1. Editar `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-properties",
      "schedule": "*/5 * * * *"  // Cada 5 minutos
    }
  ]
}
```

2. Redesplegar:
```bash
vercel --prod
```

---

## ⚠️ Consideraciones Importantes

### Límites de Rate

Con scraping cada minuto:
- **15 req/min** × **60 min** = 900 req/hora posibles
- Pero limitado a **200 req/hora** real
- Y **1000 req/día** máximo

**Recomendación**: 
- Mantener **máximo 3-4 filtros activos** por plataforma
- Rotar filtros si necesitas más búsquedas

### Consumo de Recursos

- **Vercel Cron**: Incluido en plan Pro (hasta 1000 ejecuciones/mes)
- **Supabase**: Verificar límites de database connections
- **Twilio WhatsApp**: Cada notificación cuenta como mensaje

### Detección por Plataformas

El sistema anti-detección está optimizado, pero:
- ✅ Delays humanizados
- ✅ User-agents rotativos
- ✅ Rate limiting inteligente
- ⚠️ Scraping cada minuto puede ser agresivo

**Recomendación**: 
- Comenzar con **cada 5 minutos** (`*/5 * * * *`)
- Monitorear bloqueos
- Ajustar según necesidad

---

## 🧪 Testing del Cron

### Test Local

No es posible ejecutar Vercel Cron localmente, pero puedes probar el endpoint:

```bash
# Llamar endpoint manualmente
curl -X GET http://localhost:3000/api/cron/sync-properties \
  -H "Authorization: Bearer 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17"
```

### Test en Producción

```bash
# Llamar endpoint en producción (requiere CRON_SECRET)
curl -X GET https://vendoya-75k9fzqpf-borinkens-projects.vercel.app/api/cron/sync-properties \
  -H "Authorization: Bearer 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17"
```

### Forzar Ejecución Inmediata

En Vercel Dashboard:
1. Ve a: Cron Jobs
2. Encuentra: `/api/cron/sync-properties`
3. Clic en "Trigger Now"

---

## 📊 Estadísticas y Métricas

### Dashboard de Propiedades

La página `/dashboard/properties` muestra:
- Total de propiedades capturadas
- Propiedades por estado
- Propiedades por plataforma
- Últimas sincronizaciones

### Estadísticas del Cron

Endpoint: `GET /api/cron/sync-properties` (solo con auth)

Retorna:
- Filtros ejecutados
- Propiedades nuevas encontradas
- Resultados por filtro
- Timestamp de ejecución

---

## 🐛 Troubleshooting

### Problema: Cron no se ejecuta

**Verificar**:
1. ¿`vercel.json` está en la raíz del proyecto?
2. ¿Se desplegó a producción después de agregar el cron?
3. ¿Los logs de Vercel muestran ejecuciones?

**Solución**:
```bash
# Redesplegar
vercel --prod
```

### Problema: Error 401 Unauthorized

**Causa**: `CRON_SECRET` no configurado o incorrecto

**Solución**:
```bash
vercel env add CRON_SECRET production
# Pegar: 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17

vercel --prod
```

### Problema: Auto-sync deshabilitado

**Causa**: Configuración en DB

**Solución**:
```sql
UPDATE system_config 
SET config_value = 'true' 
WHERE config_key = 'auto_sync_properties';
```

### Problema: No hay filtros activos

**Causa**: No se han creado filtros o están desactivados

**Solución**:
1. Ve a `/dashboard/capture`
2. Crea filtros de búsqueda
3. Activa los filtros

### Problema: Exceso de rate limiting

**Síntoma**: Logs muestran "Rate limit alcanzado"

**Solución**:
1. Reducir número de filtros activos
2. Aumentar intervalo del cron a 5 minutos
3. Distribuir filtros entre diferentes horas

---

## 🎯 Mejores Prácticas

### 1. Comenzar Gradualmente

```json
// Día 1-3: Cada 5 minutos
{ "schedule": "*/5 * * * *" }

// Día 4-7: Cada 3 minutos
{ "schedule": "*/3 * * * *" }

// Después de 1 semana: Cada minuto (si no hay problemas)
{ "schedule": "* * * * *" }
```

### 2. Monitorear Constantemente

- Revisar logs diariamente la primera semana
- Verificar que no haya bloqueos
- Ajustar según métricas

### 3. Rotar Filtros

En lugar de tener todos los filtros activos todo el tiempo:
- Mañana: Filtros de Madrid
- Tarde: Filtros de Barcelona
- Noche: Filtros de Valencia

### 4. Configurar Alarmas Inteligentes

- Solo notificar propiedades realmente interesantes
- Evitar spam de WhatsApp
- Usar condiciones específicas

---

## 📚 Archivos de Referencia

- **Endpoint Cron**: `/app/api/cron/sync-properties/route.ts`
- **Config Cron**: `/vercel.json`
- **Rate Limiter**: `/lib/anti-detection.ts`
- **SQL Setup**: `/SQL_SCRAPING_MINUTO_A_MINUTO.sql`

---

## ✅ Checklist de Configuración

- [ ] Agregar `CRON_SECRET` en Vercel
- [ ] Agregar `NEXT_PUBLIC_APP_URL` en Vercel
- [ ] Ejecutar SQL en Supabase (habilitar auto-sync)
- [ ] Ejecutar SQL de alarmas (`ALARMAS_PROPIEDADES.sql`)
- [ ] Crear al menos 1 filtro activo
- [ ] Desplegar a producción
- [ ] Verificar primera ejecución en logs
- [ ] Monitorear durante 24 horas
- [ ] Ajustar intervalo según resultados

---

**Última actualización**: 2025-01-02  
**Estado**: ⏱️ Listo para configurar y activar
