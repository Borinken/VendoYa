# ✅ SCRAPING MINUTO A MINUTO - CONFIGURADO Y LISTO

## 🎉 Sistema Desplegado Exitosamente

**URL Production**: https://vendoya-aqdaf2q05-borinkens-projects.vercel.app

**Endpoint Cron**: https://vendoya-aqdaf2q05-borinkens-projects.vercel.app/api/cron/sync-properties

---

## ⚡ Solución Implementada: GRATIS con Cron-Job.org

Debido a que Vercel Hobby (gratuito) limita cron jobs a máximo 1 vez al día, hemos implementado una solución **100% gratuita** usando un servicio externo de cron.

### ¿Por qué esta solución?

✅ **Gratis** - Sin costo mensual
✅ **Minuto a minuto** - Ejecución cada 60 segundos
✅ **Confiable** - Uptime 99.9%
✅ **Monitoreo** - Dashboard con logs
✅ **Sin límites** - 50 cron jobs incluidos

---

## 📋 Configuración RÁPIDA (5 minutos)

### Paso 1: Registrarse en Cron-Job.org

1. Ve a: https://cron-job.org/en/signup/
2. Crear cuenta (email + contraseña)
3. Confirmar email
4. Login: https://console.cron-job.org/

### Paso 2: Crear Cron Job

1. Clic en **"Create cronjob"**

2. **Configuración**:
```
Title: Vendoya CRM - Property Sync
URL: https://vendoya-aqdaf2q05-borinkens-projects.vercel.app/api/cron/sync-properties
HTTP Method: GET
```

3. **Authentication** (¡IMPORTANTE!):
   - Click en "HTTP Header"
   - Header Name: `Authorization`
   - Header Value: `Bearer 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17`

4. **Schedule**:
   - Type: "Every minute"
   - Interval: `Every 1 minute`

5. **Notifications** (Recomendado):
   - ✅ Enable: "On execution failure"
   - Email: tu-email@ejemplo.com

6. Clic en **"Create cronjob"**

### Paso 3: Habilitar Auto-Sync en Supabase

1. Ve a: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new

2. Ejecutar:
```sql
-- Habilitar auto-sync
UPDATE system_config 
SET config_value = 'true', updated_at = NOW()
WHERE config_key = 'auto_sync_properties';

-- Verificar
SELECT config_key, config_value 
FROM system_config 
WHERE config_key = 'auto_sync_properties';
```

### Paso 4: Ejecutar SQL de Alarmas (Opcional pero Recomendado)

Copiar y ejecutar: `/Users/LeslyHector/vendoya-crm/ALARMAS_PROPIEDADES.sql`

---

## 🔒 Datos de Configuración

### CRON_SECRET (para Cron-Job.org)

```
0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17
```

### Endpoint Completo

```
https://vendoya-aqdaf2q05-borinkens-projects.vercel.app/api/cron/sync-properties
```

### Header de Autenticación

```
Authorization: Bearer 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17
```

⚠️ **NUNCA compartir el CRON_SECRET públicamente**

---

## 📊 ¿Cómo Funciona?

```
Cada minuto:
  Cron-Job.org → Llama al endpoint con CRON_SECRET
         ↓
  Vercel API verifica autenticación
         ↓
  ¿Auto-sync habilitado en DB?
         ↓ Sí
  Obtiene filtros activos
         ↓
  Para cada filtro:
    - Scraping seguro (anti-detección)
    - Verifica duplicados
    - Guarda propiedades nuevas
    - Rate limiting automático
         ↓
  ¿Hay propiedades nuevas?
         ↓ Sí
  Verifica alarmas activas
         ↓
  Envía notificaciones WhatsApp
         ↓
  Retorna estadísticas
```

---

## 📈 Monitoreo

### En Cron-Job.org Dashboard

Verás:
- 📊 Total de ejecuciones
- ✅ Tasa de éxito
- ⏱️ Tiempo de respuesta promedio
- 📝 Log de ejecuciones recientes
- 🔔 Alertas por email si falla

### En Vercel Logs

1. Ve a: https://vercel.com/borinkens-projects/vendoya-crm/logs
2. Filtra por: `/api/cron/sync-properties`

Logs esperados:
```
🤖 Iniciando sincronización automática...
📊 Ejecutando 3 filtros...
🔔 2 propiedades nuevas, verificando alarmas...
📱 Notificación WhatsApp enviada
✅ Sincronización completada
```

### En Dashboard de Propiedades

https://vendoya-aqdaf2q05-borinkens-projects.vercel.app/dashboard/properties

- Ver propiedades capturadas
- Filtrar por plataforma
- Ver status de sincronización
- Gestionar alarmas

---

## 🎛️ Control del Sistema

### Pausar Scraping

**En Cron-Job.org**:
- Clic en el cron job
- Toggle "Active" → OFF

**En Supabase**:
```sql
UPDATE system_config 
SET config_value = 'false' 
WHERE config_key = 'auto_sync_properties';
```

### Reanudar Scraping

**En Cron-Job.org**:
- Toggle "Active" → ON

**En Supabase**:
```sql
UPDATE system_config 
SET config_value = 'true' 
WHERE config_key = 'auto_sync_properties';
```

### Cambiar Frecuencia

**Cada 5 minutos** (menos agresivo):
- En Cron-Job.org: Schedule → Every 5 minutes

**Solo horas laborales** (9am-6pm):
- Schedule → Custom
- `* 9-18 * * 1-5`

---

## 🚀 Archivos Implementados

### Backend

- ✅ `/app/api/cron/sync-properties/route.ts` - Endpoint de sincronización
- ✅ `/lib/anti-detection.ts` - Rate limits ajustados (15/min, 200/hora, 1000/día)
- ✅ `/lib/encryption.ts` - Encriptación AES-256
- ✅ `vercel.json` - Configuración de cron (diario como backup)

### Variables de Entorno (Vercel)

- ✅ `ENCRYPTION_MASTER_KEY` - Encriptación de credenciales
- ✅ `CRON_SECRET` - Autenticación del cron
- ✅ `NEXT_PUBLIC_APP_URL` - URL de la aplicación

### Documentación

- ✅ `SCRAPING_MINUTO_A_MINUTO.md` - Guía completa
- ✅ `SCRAPING_MINUTO_GRATIS.md` - Guía de Cron-Job.org
- ✅ `SQL_SCRAPING_MINUTO_A_MINUTO.sql` - SQL de configuración
- ✅ `SEGURIDAD.md` - Guía de seguridad

---

## ⚠️ Consideraciones Importantes

### Rate Limiting

Con scraping cada minuto:
- **15 req/minuto** × **60 min** = 900 req/hora teóricas
- **200 req/hora** límite real
- **1000 req/día** máximo

**Recomendación**: Mantener máximo 3-4 filtros activos por plataforma

### Consumo de Recursos

- **Cron-Job.org**: Gratis (50 crons incluidos)
- **Vercel**: Invocaciones gratis hasta límite de Hobby
- **Supabase**: Verificar límite de queries
- **Twilio WhatsApp**: Cada notificación cuenta como mensaje

### Detección por Plataformas

El sistema incluye:
- ✅ Delays humanizados (2-6 segundos)
- ✅ User-agents rotativos
- ✅ Rate limiting inteligente
- ✅ Gestión de sesiones
- ✅ Detección de bloqueos

**Sugerencia inicial**: Comenzar con cada 5 minutos y monitorear

---

## 🐛 Troubleshooting

### Error 401 en Cron-Job.org

**Solución**:
- Verificar header Authorization
- Debe incluir "Bearer " antes del token
- Token completo: 64 caracteres

### "Auto-sync deshabilitado"

**Solución**:
```sql
UPDATE system_config 
SET config_value = 'true' 
WHERE config_key = 'auto_sync_properties';
```

### "No hay filtros activos"

**Solución**:
1. Ve a `/dashboard/capture`
2. Crea filtros de búsqueda
3. Marca como activos (toggle)

### Demasiados requests

**Solución**:
- Reducir número de filtros activos
- Aumentar intervalo a 5 minutos
- Distribuir filtros en diferentes horarios

---

## ✅ Checklist Final

- [ ] Registrado en Cron-Job.org
- [ ] Cron job creado con URL correcta
- [ ] Header Authorization configurado
- [ ] Schedule: Every 1 minute
- [ ] Notificaciones por email habilitadas
- [ ] Auto-sync habilitado en Supabase
- [ ] SQL de alarmas ejecutado
- [ ] Al menos 1 filtro activo creado
- [ ] Primera ejecución verificada en logs
- [ ] Dashboard de propiedades revisado

---

## 🎯 Resumen Técnico

### Lo que se implementó:

✅ **Sistema de seguridad máxima** (AES-256, anti-detección, rate limiting)
✅ **Endpoint de cron** protegido con autenticación
✅ **Sincronización automática** con verificación de duplicados
✅ **Sistema de alarmas** con notificaciones WhatsApp
✅ **Rate limits ajustados** para scraping frecuente (1000 req/día)
✅ **Documentación completa** con guías paso a paso

### Lo que debes configurar tú:

1. **Crear cuenta en Cron-Job.org** (2 minutos)
2. **Configurar cron job** (3 minutos)
3. **Habilitar auto-sync en Supabase** (1 minuto)
4. **Opcional: Ejecutar SQL de alarmas** (1 minuto)

**Tiempo total: ~7 minutos**

---

## 💰 Costos

| Componente | Costo |
|------------|-------|
| Vercel Hosting | ✅ GRATIS (Hobby) |
| Cron-Job.org | ✅ GRATIS (50 crons) |
| Supabase Database | ✅ GRATIS (500MB) |
| Twilio WhatsApp | 💰 ~$0.005/mensaje |

**Total mensual**: ~$1-5 (solo WhatsApp según uso)

---

## 📞 Soporte

### Documentación

- **Guía Scraping**: `SCRAPING_MINUTO_A_MINUTO.md`
- **Guía Cron-Job.org**: `SCRAPING_MINUTO_GRATIS.md`
- **Guía Seguridad**: `SEGURIDAD.md`

### Enlaces Útiles

- Cron-Job.org Console: https://console.cron-job.org/
- Vercel Dashboard: https://vercel.com/borinkens-projects/vendoya-crm
- Supabase SQL: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new
- Properties Dashboard: https://vendoya-aqdaf2q05-borinkens-projects.vercel.app/dashboard/properties

---

**Estado**: ✅ **DESPLEGADO Y LISTO**

**Próximo paso**: Configurar Cron-Job.org (5 minutos) → Empezar a recibir propiedades automáticamente cada minuto 🚀

**Fecha**: 2025-01-02

**Versión**: 2.0.0 (Scraping Minuto a Minuto)
