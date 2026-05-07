# 🔐 Configuración Google Cloud Console - Paso a Paso

## ⏱️ Tiempo estimado: 15 minutos

---

## 📍 PASO 1: Crear proyecto

1. Abre: https://console.cloud.google.com
2. Click en el selector de proyecto (arriba)
3. Click **"Nuevo proyecto"**
4. Nombre: `VendoYa CRM`
5. Click **"Crear"**
6. Espera y selecciona el proyecto

---

## 📍 PASO 2: Activar Gmail API

1. Menú → **APIs y servicios** → **Biblioteca**
2. Busca: `Gmail API`
3. Click en **Gmail API**
4. Click **"HABILITAR"**

---

## 📍 PASO 3: Configurar OAuth

1. Menú → **APIs y servicios** → **Pantalla de consentimiento de OAuth**
2. Selecciona: **Externo**
3. Click **"CREAR"**

### Página 1 - Información de la app:
- Nombre: `VendoYa CRM`
- Email de asistencia: tu email
- Dominios autorizados: `vercel.app`
- Email del desarrollador: tu email
- Click **"GUARDAR Y CONTINUAR"**

### Página 2 - Ámbitos:
- Click **"AGREGAR O QUITAR ÁMBITOS"**
- Selecciona estos 3:
  - ✅ `.../auth/gmail.readonly`
  - ✅ `.../auth/gmail.modify`
  - ✅ `.../auth/gmail.labels`
- Click **"ACTUALIZAR"**
- Click **"GUARDAR Y CONTINUAR"**

### Página 3 - Usuarios de prueba:
- Click **"+ AGREGAR USUARIOS"**
- Agrega tu Gmail
- Click **"AGREGAR"**
- Click **"GUARDAR Y CONTINUAR"**

### Página 4 - Resumen:
- Click **"VOLVER AL PANEL"**

---

## 📍 PASO 4: Crear credenciales

1. Menú → **APIs y servicios** → **Credenciales**
2. Click **"+ CREAR CREDENCIALES"**
3. Selecciona: **"ID de cliente de OAuth 2.0"**

### Formulario:
- **Tipo:** `Aplicación web`
- **Nombre:** `VendoYa CRM Web`

- **Orígenes JavaScript:**
  ```
  https://vendoya-6do7vkzvd-borinkens-projects.vercel.app
  http://localhost:3000
  ```

- **URIs de redireccionamiento:**
  ```
  https://vendoya-6do7vkzvd-borinkens-projects.vercel.app/api/auth/gmail/callback
  http://localhost:3000/api/auth/gmail/callback
  ```

- Click **"CREAR"**

---

## 📍 PASO 5: Copiar credenciales

Se abrirá un popup con:

```
ID de cliente: 123456789-abc...apps.googleusercontent.com
Secreto del cliente: GOCSPX-xyz123...
```

**¡Cópialas!**

---

## 📍 PASO 6: Agregar a Vercel

Ve a: https://vercel.com/borinkens-projects/vendoya-crm/settings/environment-variables

Agrega estas 3 variables:

| Name | Value | Environment |
|------|-------|-------------|
| `GMAIL_CLIENT_ID` | Tu Client ID completo | Production ✅ |
| `GMAIL_CLIENT_SECRET` | Tu Client Secret | Production ✅ |
| `NEXT_PUBLIC_GMAIL_CLIENT_ID` | Tu Client ID completo | Production ✅ |

Click **"Save"** en cada una.

---

## 📍 PASO 7: Re-desplegar

```bash
cd /Users/LeslyHector/vendoya-crm
vercel --prod
```

---

## 📍 PASO 8: Probar

1. Ve a: https://vendoya-6do7vkzvd-borinkens-projects.vercel.app/dashboard/email-config
2. Ingresa tu Gmail
3. Click **"Conectar Gmail"**
4. Autoriza en Google
5. ✅ ¡Listo!

---

## ⚠️ Notas importantes

- El Client ID es el mismo para `GMAIL_CLIENT_ID` y `NEXT_PUBLIC_GMAIL_CLIENT_ID`
- El Client Secret solo lo usas en `GMAIL_CLIENT_SECRET`
- Modo "Externo" permite cualquier Gmail, pero en prueba solo los usuarios agregados
- Para producción, deberás publicar la app (verificación de Google)

---

## 📍 PASO 9: Configurar GitHub Secret (Cron Job)

Para activar el envío automático de mensajes de seguimiento cada 15 minutos:

1. Ve a: https://github.com/Borinken/VendoYa/settings/secrets/actions
2. Click **"New repository secret"**
3. Completa:
   - **Name:** `CRON_SECRET`
   - **Value:** `0bda0d1c040c9b6e8d982fca93db997fb1ab1c17d47b11f25cccfe3d8e6feb17`
4. Click **"Add secret"**

**¿Para qué sirve?**
- Permite que GitHub Actions ejecute el cron job `/api/cron/send-scheduled`
- Envía mensajes automáticos a leads en días 1, 3 y 7
- Sin esto, el seguimiento automático no funcionará

**Monitorear ejecuciones:**
https://github.com/Borinken/VendoYa/actions/workflows/send-scheduled-messages.yml

---

## 🆘 Problemas comunes

### "redirect_uri_mismatch"
→ Verifica que las URIs de redireccionamiento en Google Cloud coincidan exactamente

### "access_denied"
→ Agrega tu email en "Usuarios de prueba"

### "invalid_client"
→ Verifica que copiaste bien el Client ID y Secret en Vercel
