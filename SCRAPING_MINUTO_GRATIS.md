# ⏱️ Scraping Minuto a Minuto - GRATIS con Cron Externo

## 🎯 Problema Identificado

Vercel Hobby (plan gratuito) limita los cron jobs a **máximo 1 vez al día**.

Para scraping cada minuto sin pagar Vercel Pro ($20/mes), usaremos un **servicio externo de cron GRATUITO**.

---

## ✅ Solución GRATIS: Cron-Job.org

### Por qué Cron-Job.org

- ✅ **100% Gratis** para uso personal
- ✅ Hasta **50 cron jobs** gratuitos
- ✅ Ejecución cada **1 minuto**
- ✅ Monitoreo y logs
- ✅ Notificaciones por email
- ✅ Sin tarjeta de crédito

### Alternativas Gratuitas

1. **Cron-Job.org** - ⭐ Recomendado (50 jobs)
2. **EasyCron** - 1 cron gratuito
3. **Cronitor** - Monitor + cron gratis
4. **UptimeRobot** - Checks cada 5 minutos gratis

---

## 📋 Configuración Paso a Paso

### 1. Registrarse en Cron-Job.org

1. Ve a: https://cron-job.org/en/signup/
2. Registra cuenta (email + password)
3. Confirma email
4. Login en: https://console.cron-job.org/

### 2. Crear Cron Job

1. Clic en **"Create cronjob"**
2. Configurar:

```
Title: Vendoya CRM - Property Sync
URL: https://vendoya-75k9fzqpf-borinkens-projects.vercel.app/api/cron/sync-properties
```

3. **HTTP Method**: `GET`

4. **Authentication**: HTTP Header
   - Header Name: `Authorization`
   - Header Value: `Bearer 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17`

5. **Schedule**:
   - Type: `Every minute`
   - Interval: `Every 1 minute`

6. **Notifications** (opcional):
   - Enable email on failure: ✅
   - Email: tu-email@ejemplo.com

7. Clic en **"Create cronjob"**

### 3. Verificar Ejecución

En el dashboard de Cron-Job.org verás:
- ✅ Status: Active
- 🟢 Last execution: Successful
- 📊 Success rate: 100%
- 📝 Execution log

---

## 🔧 Configuración Detallada

### Headers Requeridos

```
Authorization: Bearer 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17
```

### URL Completa

```
https://vendoya-75k9fzqpf-borinkens-projects.vercel.app/api/cron/sync-properties
```

### Configuración de Schedule

**Cada minuto**:
```
*/1 * * * *
```

**Cada 5 minutos** (alternativa más suave):
```
*/5 * * * *
```

**Solo horas laborales** (9am-6pm, lunes-viernes):
```
* 9-18 * * 1-5
```

---

## 📊 Respuesta Esperada

### Éxito (200 OK)

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
    }
  ]
}
```

### Auto-sync deshabilitado (200 OK)

```json
{
  "message": "Auto-sync deshabilitado",
  "skipped": true
}
```

### Error de autenticación (401 Unauthorized)

```json
{
  "error": "Unauthorized"
}
```

---

## 🎛️ Alternativas de Configuración

### Opción 1: Cron-Job.org (Recomendado)

**Pros:**
- ✅ 50 cron jobs gratis
- ✅ Ejecución cada 1 minuto
- ✅ Logs detallados
- ✅ Notificaciones

**Contras:**
- ❌ Requiere registro

**Límites:**
- 50 cron jobs
- Sin límite de ejecuciones

### Opción 2: EasyCron

**URL:** https://www.easycron.com/

**Pros:**
- ✅ Sin registro para 1 cron
- ✅ Cada minuto

**Contras:**
- ❌ Solo 1 cron job gratis
- ❌ Menos features

**Límites:**
- 1 cron job gratis

### Opción 3: UptimeRobot

**URL:** https://uptimerobot.com/

**Pros:**
- ✅ 50 monitors gratis
- ✅ Monitoreo incluido

**Contras:**
- ❌ Mínimo cada 5 minutos
- ❌ Pensado para uptime, no cron

**Límites:**
- 50 monitors
- Cada 5 minutos

### Opción 4: Railway (Self-hosted)

**URL:** https://railway.app/

**Pros:**
- ✅ Control total
- ✅ Cualquier frecuencia
- ✅ $5/mes crédito gratis

**Contras:**
- ❌ Requiere desplegar código
- ❌ Más complejo

---

## 🔒 Seguridad

### CRON_SECRET

El endpoint está protegido con `CRON_SECRET`:

```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Tu CRON_SECRET:**
```
0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17
```

⚠️ **NUNCA compartir este secret públicamente**

### Endpoint Público pero Protegido

El endpoint `/api/cron/sync-properties` es:
- ✅ Accesible públicamente (URL pública)
- ✅ Protegido con autenticación (CRON_SECRET)
- ❌ No puede ser llamado sin el secret correcto

---

## 📈 Monitoreo

### En Cron-Job.org

Dashboard muestra:
- 📊 Total de ejecuciones
- ✅ Ejecuciones exitosas
- ❌ Ejecuciones fallidas
- ⏱️ Tiempo de respuesta promedio
- 📝 Log de últimas 10 ejecuciones

### En Vercel

1. Ve a: https://vercel.com/borinkens-projects/vendoya-crm
2. Clic en "Logs"
3. Filtra por: `/api/cron/sync-properties`

Verás logs como:
```
🤖 Iniciando sincronización automática...
📊 Ejecutando 3 filtros...
🔔 2 propiedades nuevas...
✅ Sincronización completada
```

### En Supabase

Verifica datos en:
- Tabla `captured_properties`: Nuevas propiedades
- Tabla `system_config`: Auto-sync habilitado
- Tabla `property_alarms`: Alarmas activas

---

## 🐛 Troubleshooting

### Problema: Error 401 Unauthorized

**Causa**: CRON_SECRET incorrecto

**Solución**:
1. Verificar header en Cron-Job.org:
   ```
   Authorization: Bearer 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17
   ```

2. Verificar variable en Vercel:
   ```bash
   vercel env ls
   ```

### Problema: Respuesta "Auto-sync deshabilitado"

**Causa**: Configuración en DB

**Solución**:
```sql
UPDATE system_config 
SET config_value = 'true' 
WHERE config_key = 'auto_sync_properties';
```

### Problema: "No hay filtros activos"

**Causa**: No hay filtros creados

**Solución**:
1. Ve a `/dashboard/capture`
2. Crea filtros de búsqueda
3. Activa los filtros

### Problema: Cron-Job.org dice "Too many requests"

**Causa**: Endpoint tiene rate limiting

**Solución**:
- Aumentar intervalo a cada 5 minutos
- Verificar límites en `/lib/anti-detection.ts`

---

## 💰 Comparación de Costos

| Servicio | Costo | Frecuencia | Crons | Recomendado |
|----------|-------|------------|-------|-------------|
| **Cron-Job.org** | ✅ GRATIS | 1 minuto | 50 | ⭐⭐⭐⭐⭐ |
| **EasyCron** | ✅ GRATIS | 1 minuto | 1 | ⭐⭐⭐ |
| **UptimeRobot** | ✅ GRATIS | 5 minutos | 50 | ⭐⭐⭐ |
| **Vercel Pro** | 💰 $20/mes | 1 minuto | Ilimitado | ⭐⭐ |
| **Railway** | ✅ $5 gratis | Custom | Ilimitado | ⭐⭐⭐⭐ |

---

## 🎯 Recomendación Final

### Para empezar: Cron-Job.org ⭐

1. **Gratis** para siempre
2. **Fácil** de configurar (5 minutos)
3. **Confiable** (uptime 99.9%)
4. **50 cron jobs** incluidos
5. **Monitoreo** incluido

### Configuración óptima:

- **Cada 5 minutos** las primeras semanas (menos agresivo)
- **Cada 1 minuto** después de validar que todo funciona
- **Solo horas laborales** si no necesitas 24/7

---

## 📝 Checklist de Configuración

- [ ] Registrarse en Cron-Job.org
- [ ] Crear cron job con URL del endpoint
- [ ] Agregar header Authorization con CRON_SECRET
- [ ] Configurar schedule (cada 1 o 5 minutos)
- [ ] Habilitar notificaciones por email
- [ ] Guardar y activar cron job
- [ ] Verificar primera ejecución en logs
- [ ] Habilitar auto-sync en Supabase
- [ ] Crear filtros activos
- [ ] Monitorear durante 24 horas
- [ ] Ajustar frecuencia según necesidad

---

## 🔗 Enlaces Útiles

- **Cron-Job.org**: https://cron-job.org
- **Console**: https://console.cron-job.org/
- **Vercel Logs**: https://vercel.com/borinkens-projects/vendoya-crm/logs
- **Supabase SQL**: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new
- **Endpoint**: https://vendoya-75k9fzqpf-borinkens-projects.vercel.app/api/cron/sync-properties

---

**Última actualización**: 2025-01-02  
**Estado**: ✅ Listo para configurar GRATIS  
**Costo**: 💰 $0/mes (100% gratuito)
