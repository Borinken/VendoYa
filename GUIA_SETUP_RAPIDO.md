# 🚀 SETUP RÁPIDO - Sistema de Leads por Email

## PASO 1: Ejecutar SQL en Supabase (2 minutos) ✅

### Opción A: Dashboard Web (RECOMENDADO)
1. **Abre el SQL Editor**: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new
2. **Copia TODO el contenido** del archivo `SISTEMA_EMAIL_SUPABASE.sql`
3. **Pégalo en el editor** de Supabase
4. **Haz clic en RUN** (o presiona Cmd+Enter)
5. **Verifica** que aparece "Success. No rows returned"

### ¿Qué crea este SQL?
- ✅ Tabla `email_logs` - Registro de emails recibidos
- ✅ Tabla `tasks` - Tareas de seguimiento automáticas
- ✅ Tabla `email_accounts` - Configuración de cuentas de email
- ✅ Índices para rendimiento
- ✅ Triggers automáticos
- ✅ Vistas de emails y tareas pendientes
- ✅ Funciones de estadísticas

---

## PASO 2: Configurar Gmail OAuth (10 minutos) ⚙️

### 2.1 Google Cloud Console
1. **Abre**: https://console.cloud.google.com/
2. **Crea un proyecto** nuevo o selecciona uno existente
   - Nombre sugerido: "VendoYa CRM"

### 2.2 Activar Gmail API
1. Ve a **APIs & Services** → **Library**
2. Busca "Gmail API"
3. Haz clic en **Enable**

### 2.3 Configurar OAuth Consent Screen
1. Ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona **External** (gratis hasta 100 usuarios)
3. Rellena:
   - **App name**: VendoYa CRM
   - **User support email**: tu email
   - **Developer contact**: tu email
4. Haz clic en **Save and Continue**
5. En **Scopes**, agrega estos 3 scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.labels`
6. En **Test users**, agrega tu email de Gmail
7. Guarda todo

### 2.4 Crear OAuth Credentials
1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Selecciona **Web application**
4. Nombre: "VendoYa CRM Web"
5. En **Authorized redirect URIs**, agrega:
   ```
   https://vendoya-netk9cj8a-borinkens-projects.vercel.app/api/auth/gmail/callback
   http://localhost:3000/api/auth/gmail/callback
   ```
6. Haz clic en **Create**
7. **GUARDA** el Client ID y Client Secret que aparecen

### 2.5 Obtener Access Token
Ejecuta en terminal:
```bash
cd /Users/LeslyHector/vendoya-crm
node obtener-gmail-token.js
```

Sigue las instrucciones en pantalla:
1. Se abrirá un navegador
2. Inicia sesión con tu Gmail
3. Acepta los permisos
4. Copia el código que aparece
5. Pégalo en la terminal

¡Listo! El token se guarda automáticamente.

---

## PASO 3: Verificar que Funciona 🎉

```bash
# Probar sincronización de Gmail
curl -X POST http://localhost:3000/api/email/sync \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "tu_access_token_aqui",
    "email": "tu_email@gmail.com",
    "maxResults": 5
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "processed": 5,
  "leads": 3,
  "tasks": 4
}
```

---

## 🔄 Automatización (Opcional)

### Opción 1: Vercel Cron (Gratis)
Crea `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/email/sync",
    "schedule": "*/15 * * * *"
  }]
}
```

### Opción 2: GitHub Actions (Gratis)
Ya está configurado en `.github/workflows/email-sync.yml`

---

## 📊 Monitoreo

Ver leads capturados:
```bash
# En Supabase SQL Editor
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;
SELECT * FROM tasks WHERE status = 'pending' ORDER BY priority, due_date;
```

O en el dashboard: https://vendoya-netk9cj8a-borinkens-projects.vercel.app/dashboard

---

## ⚡ Comando Rápido

Ejecuta todo de una vez:
```bash
cd /Users/LeslyHector/vendoya-crm && \
echo "1️⃣  Abre SQL Editor: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new" && \
echo "2️⃣  Copia contenido de: SISTEMA_EMAIL_SUPABASE.sql" && \
echo "3️⃣  Pégalo y ejecuta RUN" && \
echo "4️⃣  Configura Gmail OAuth: https://console.cloud.google.com" && \
echo "✅ Listo para recibir leads automáticamente!"
```
