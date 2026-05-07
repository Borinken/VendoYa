# 🤖 GitHub Actions - Cron Job Automático

## ✅ Ventajas sobre Vercel Cron

- **Gratis**: Sin límite en GitHub Actions (plan gratuito)
- **Flexible**: Cada 5, 10, 15 minutos o lo que necesites
- **Sin plan Pro**: Vercel Hobby solo permite cron diario

---

## 📝 Configuración (2 pasos)

### 1. Agregar Secret en GitHub

Ve a tu repositorio:
https://github.com/Borinken/VendoYa/settings/secrets/actions

Haz clic en **"New repository secret"**:

- **Name:** `CRON_SECRET`
- **Value:** `0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17`

(Este valor ya está en tu `.env.local`)

### 2. Activar GitHub Actions (si está desactivado)

Ve a:
https://github.com/Borinken/VendoYa/actions

Si ves un mensaje de activación, haz clic en **"I understand my workflows, go ahead and enable them"**

---

## 🚀 Funcionamiento

El workflow `.github/workflows/send-scheduled-messages.yml` ejecutará automáticamente cada 15 minutos:

```bash
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://vendoya-6do7vkzvd-borinkens-projects.vercel.app/api/cron/send-scheduled
```

Esto procesará todos los mensajes pendientes en `scheduled_messages`.

---

## 📊 Ver Ejecuciones

Monitorea las ejecuciones en:
https://github.com/Borinken/VendoYa/actions/workflows/send-scheduled-messages.yml

Verás:
- ✅ Ejecuciones exitosas
- ❌ Errores (si los hay)
- 📅 Historial completo

---

## 🔧 Personalizar Frecuencia

Edita `.github/workflows/send-scheduled-messages.yml`:

```yaml
schedule:
  - cron: '*/5 * * * *'   # Cada 5 minutos
  - cron: '*/10 * * * *'  # Cada 10 minutos
  - cron: '*/15 * * * *'  # Cada 15 minutos (actual)
  - cron: '*/30 * * * *'  # Cada 30 minutos
  - cron: '0 * * * *'     # Cada hora
```

---

## 🧪 Probar Manualmente

1. Ve a: https://github.com/Borinken/VendoYa/actions/workflows/send-scheduled-messages.yml
2. Haz clic en **"Run workflow"**
3. Selecciona la rama `main`
4. Haz clic en **"Run workflow"**

Verás los resultados en tiempo real.

---

## 💡 Límites de GitHub Actions

Plan gratuito:
- ✅ 2,000 minutos/mes (más que suficiente para cron jobs cada 15 min)
- ✅ Sin límite de ejecuciones
- ✅ Repos públicos: minutos ilimitados

Uso estimado:
- Cron cada 15 min = 96 ejecuciones/día
- ~30 segundos por ejecución = 48 minutos/día
- **Total: ~1,440 minutos/mes** (dentro del límite gratuito)

---

## 🔐 Seguridad

El endpoint `/api/cron/send-scheduled` requiere autenticación:

```typescript
const authHeader = req.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');

if (token !== process.env.CRON_SECRET) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

Solo GitHub Actions con el secret correcto puede ejecutarlo.

---

## 🎯 Próximos Pasos

1. ✅ Agregar `CRON_SECRET` en GitHub Secrets
2. ✅ Verificar que Actions esté habilitado
3. ✅ Esperar la primera ejecución (máx 15 min)
4. ✅ Revisar logs en GitHub Actions

---

## 📞 Alternativas

Si necesitas cron más frecuente que cada 5 minutos:

1. **Vercel Pro** ($20/mes) - Cron cada minuto
2. **Railway** (gratis) - Cron jobs flexibles
3. **Render** (gratis) - Cron jobs incluidos
4. **cron-job.org** (gratis) - Servicio externo de cron

Pero para este caso, **GitHub Actions es perfecto** 🎉
