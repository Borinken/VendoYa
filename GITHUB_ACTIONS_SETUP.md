# ⚡ GitHub Actions - Scraping Cada 5 Minutos (GRATIS)

## ✅ Archivo creado: `.github/workflows/sync-properties.yml`

**Ejecución**: Cada 5 minutos (mínimo de GitHub Actions)
**Costo**: 100% GRATIS (2000 minutos/mes incluidos)

---

## 🚀 Configuración en 3 Pasos

### Paso 1: Subir el Workflow a GitHub

```bash
cd /Users/LeslyHector/vendoya-crm
git add .github/workflows/sync-properties.yml
git commit -m "feat: Add GitHub Actions cron for property sync every 5 minutes"
git push origin main
```

### Paso 2: Configurar Secrets en GitHub

1. Ve a tu repo: https://github.com/TUUSUARIO/vendoya-crm/settings/secrets/actions

2. Clic en **"New repository secret"**

3. Agregar estos 2 secrets:

**Secret 1: CRON_SECRET**
```
Name: CRON_SECRET
Value: 0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17
```

**Secret 2: APP_URL**
```
Name: APP_URL
Value: https://vendoya-aqdaf2q05-borinkens-projects.vercel.app
```

### Paso 3: Habilitar Auto-Sync en Supabase

Ve a: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new

```sql
UPDATE system_config 
SET config_value = 'true', updated_at = NOW()
WHERE config_key = 'auto_sync_properties';
```

---

## ✅ ¡Listo! El sistema se activará automáticamente

- **Primera ejecución**: Dentro de 5 minutos después del push
- **Siguientes**: Cada 5 minutos, 24/7
- **Monitoreo**: https://github.com/TUUSUARIO/vendoya-crm/actions

---

## 📊 Verificar que Funciona

1. Ve a: https://github.com/TUUSUARIO/vendoya-crm/actions

2. Busca workflow: "Sync Properties Every 5 Minutes"

3. Verás:
   - ✅ Ejecuciones completadas
   - ⏱️ Próxima ejecución
   - 📝 Logs de cada sincronización

---

## 🎛️ Control del Sistema

### Pausar Scraping
```bash
# Opción 1: Deshabilitar workflow en GitHub
# Settings → Actions → Disable workflow

# Opción 2: Deshabilitar en Supabase
UPDATE system_config 
SET config_value = 'false' 
WHERE config_key = 'auto_sync_properties';
```

### Ejecutar Manualmente
1. Ve a: https://github.com/TUUSUARIO/vendoya-crm/actions
2. Selecciona el workflow
3. Clic en "Run workflow" → "Run workflow"

---

## 💡 Ventajas de GitHub Actions

✅ **Gratis**: 2000 minutos/mes (suficiente para 24/7)
✅ **Confiable**: Uptime 99.95%
✅ **Sin registro extra**: Ya tienes GitHub
✅ **Logs integrados**: Ver todo en GitHub
✅ **Ejecución manual**: Botón "Run workflow"
✅ **Sin delays**: Más puntual que Cron-Job.org

---

## 📈 Consumo Mensual

- **Ejecuciones por día**: 288 (cada 5 min × 24 horas)
- **Ejecuciones por mes**: ~8,640
- **Duración promedio**: ~10 segundos
- **Minutos totales**: ~1,440 min/mes
- **Límite GitHub**: 2,000 min/mes

**Resultado**: ✅ Dentro del límite gratis

---

## 🔄 Si Quieres Cada 15 Minutos (Más Conservador)

Editar [.github/workflows/sync-properties.yml](../.github/workflows/sync-properties.yml):

```yaml
schedule:
  - cron: '*/15 * * * *'  # Cada 15 minutos
```

**Beneficios**:
- Menos agresivo con las plataformas
- Consume solo ~500 min/mes
- Suficiente para capturar propiedades nuevas

---

## ⚠️ Importante

- GitHub Actions puede tener delays de 5-15 min en horas pico
- El cron `*/5 * * * *` es el mínimo permitido
- No se puede configurar cada 1 minuto en GitHub
- Para cada minuto → usa Cron-Job.org (ver `SCRAPING_MINUTO_GRATIS.md`)

---

## 🐛 Troubleshooting

### Workflow no se ejecuta

**Causa**: Repo sin actividad en 60 días
**Solución**: Hacer un commit o ejecutar manualmente

### Error 401 Unauthorized

**Causa**: Secret CRON_SECRET mal configurado
**Solución**: Verificar que el secret tenga el valor correcto (sin espacios)

### Workflow deshabilitado

**Causa**: GitHub deshabilita workflows inactivos
**Solución**: Re-habilitarlo en Settings → Actions

---

## 📦 Comandos Útiles

```bash
# Ver status del repo
git status

# Subir cambios
git add .
git commit -m "Update workflow"
git push

# Ver logs remotos
git log --oneline -5

# Ver rama actual
git branch
```

---

## ✅ Checklist Final

- [ ] Archivo `.github/workflows/sync-properties.yml` creado
- [ ] Cambios subidos a GitHub (git push)
- [ ] Secret CRON_SECRET configurado
- [ ] Secret APP_URL configurado
- [ ] Auto-sync habilitado en Supabase
- [ ] Primera ejecución verificada en GitHub Actions
- [ ] Propiedades apareciendo en dashboard

---

**Próximos pasos**:
1. Ejecutar los 3 comandos git (add, commit, push)
2. Configurar los 2 secrets en GitHub
3. Esperar 5 minutos
4. Verificar en GitHub Actions → Ver logs
5. Revisar propiedades en dashboard

**Estado**: ✅ Workflow creado, listo para subir a GitHub
