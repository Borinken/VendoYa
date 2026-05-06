# 🎯 GUÍA ACTUALIZADA - Sistema Multi-Usuario con Gmail

## 📧 CONCEPTO: Cada usuario su propio email

Este sistema permite que **cada usuario del CRM configure su propia cuenta de Gmail** para recibir leads automáticamente.

### ¿Cómo funciona?

```
Usuario 1 (Agente A)            Usuario 2 (Agente B)
    ↓                              ↓
Configura su Gmail:            Configura su Gmail:
agente-a@gmail.com             agente-b@gmail.com
    ↓                              ↓
Recibe leads de Idealista      Recibe leads de Fotocasa
Captados automáticamente       Captados automáticamente
    ↓                              ↓
Aparecen en SU dashboard       Aparecen en SU dashboard
```

---

## 🚀 SETUP DEL SISTEMA (Una sola vez)

### PASO 1: Ejecutar SQL en Supabase ⚡

1. Abre: https://supabase.com/dashboard
2. Ve a tu proyecto → SQL Editor
3. Copia el contenido de: `SISTEMA_EMAIL_SUPABASE.sql`
4. Pégalo y haz clic en **RUN**
5. Verifica que se crearon las tablas: `email_logs`, `tasks`, `email_accounts`

✅ **Esto se hace UNA SOLA VEZ** para todo el sistema.

---

### PASO 2: Configurar Google Cloud Console 🔐

**Solo el administrador hace esto UNA VEZ:**

1. Abre: https://console.cloud.google.com
2. Crea proyecto: "VendoYa CRM"
3. Activa "Gmail API"
4. Configura "OAuth consent screen":
   - Tipo: **External** (gratis)
   - App name: VendoYa CRM
   - Scopes: `gmail.readonly`, `gmail.modify`, `gmail.labels`
   - **NO agregues test users aquí** (cada usuario autoriza individualmente)
5. Crea credenciales OAuth 2.0:
   - Tipo: **Web application**
   - Authorized redirect URIs:
     ```
     https://vendoya-netk9cj8a-borinkens-projects.vercel.app/api/auth/gmail/callback
     http://localhost:3000/api/auth/gmail/callback
     ```
6. **Copia Client ID y Client Secret**

7. Agrégalos al archivo `.env.local`:
   ```env
   GMAIL_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
   GMAIL_CLIENT_SECRET="GOCSPX-abc123..."
   NEXT_PUBLIC_GMAIL_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
   ```

8. Despliega a producción:
   ```bash
   vercel --prod
   ```

✅ **Configuración de Google Cloud completada**

---

## 👤 PARA CADA USUARIO DEL CRM

### Conectar su cuenta de Gmail (2 minutos)

Cada usuario hace esto **desde el CRM**:

1. **Iniciar sesión en el CRM**:
   ```
   https://vendoya-netk9cj8a-borinkens-projects.vercel.app/dashboard
   ```

2. **Ir a Configuración de Email**:
   - Menú lateral → **"📧 Configurar Email"**
   - O ir directo a: `/dashboard/email-config`

3. **Conectar Gmail**:
   - Ingresa tu email de Gmail: `tu-email@gmail.com`
   - Haz clic en **"Conectar Gmail"**
   - Se abre ventana de autorización de Google
   - Inicia sesión con tu cuenta de Gmail
   - Verás: "Google hasn't verified this app"
     * Haz clic en "Advanced"
     * Haz clic en "Go to VendoYa CRM (unsafe)"
   - Revisa los permisos y haz clic en **"Continue"**
   - La ventana se cierra automáticamente
   - ✅ Tu Gmail está conectado!

4. **Verificar**:
   - Deberías ver tu cuenta en la lista de "Cuentas Conectadas"
   - Estado: Activa ✅

5. **Sincronizar manualmente** (opcional):
   - Haz clic en **"Sincronizar"**
   - El sistema leerá tus últimos emails
   - Los leads aparecerán en Contactos

---

## 📊 ¿QUÉ EMAILS SE PROCESAN?

El sistema busca automáticamente emails de:

✅ **Portales inmobiliarios**:
- Idealista (noreply@idealista.com)
- Fotocasa (notificaciones@fotocasa.es)
- RealAdvisor
- Habitaclia

✅ **Contactos directos**:
- Propietarios que te escriben
- Compradores interesados
- Consultas generales

❌ **NO procesa**:
- Spam
- Newsletters
- Emails personales sin relación

---

## 🔄 SINCRONIZACIÓN AUTOMÁTICA

### Opción 1: Cron de Vercel (Recomendado)

Crea `vercel.json` en la raíz:

```json
{
  "crons": [{
    "path": "/api/email/sync",
    "schedule": "*/15 * * * *"
  }]
}
```

Despliega:
```bash
vercel --prod
```

**Resultado**: Cada 15 minutos, el sistema sincroniza **todas** las cuentas conectadas automáticamente.

### Opción 2: GitHub Actions

Ya está configurado en `.github/workflows/email-sync.yml`

---

## 🎯 FLUJO COMPLETO DE UN LEAD

```
1. Cliente ve tu propiedad en Idealista
   ↓
2. Cliente hace clic en "Contactar"
   ↓
3. Idealista te envía email:
   De: noreply@idealista.com
   A: tu-email@gmail.com
   Asunto: "Nuevo contacto para tu propiedad en Madrid"
   ↓
4. Sistema sincroniza (cada 15 minutos)
   ↓
5. IA extrae datos del email:
   • Nombre: Juan Pérez
   • Teléfono: +34 612 345 678
   • Email: juan.perez@gmail.com
   • Propiedad: Piso en Madrid
   • Intención: Compra
   • Prioridad: Alta
   ↓
6. Sistema crea automáticamente:
   • Contacto en CRM
   • Tarea de seguimiento
   • Log del email
   ↓
7. Aparece en tu dashboard:
   /dashboard/contacts
   ↓
8. Email marcado como "leído" en Gmail
   Etiqueta agregada: "CRM-Processed"
```

---

## 🔐 SEGURIDAD Y PRIVACIDAD

### ✅ Lo que SÍ hace:
- Cada usuario autoriza su propia cuenta
- Las credenciales se guardan encriptadas en Supabase
- Solo lee emails no leídos
- Marca emails como procesados
- Cada usuario ve solo sus propios leads

### ❌ Lo que NO hace:
- NO lee emails de otras personas
- NO comparte datos entre usuarios
- NO guarda contraseñas
- NO modifica el contenido de los emails
- NO elimina emails

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### "Error: Credenciales de Gmail no configuradas"
**Solución**: El administrador debe configurar `GMAIL_CLIENT_ID` y `GMAIL_CLIENT_SECRET` en variables de entorno de Vercel.

### "No hay cuentas de email configuradas"
**Solución**: Ve a `/dashboard/email-config` y conecta tu Gmail.

### "Google hasn't verified this app"
**Solución**: Normal en desarrollo. Haz clic en "Advanced" → "Go to VendoYa CRM (unsafe)".

### "Access blocked"
**Solución**: Verifica que el OAuth consent screen esté configurado como "External" y publicado.

### "No se procesan emails"
**Solución**:
1. Ve a `/dashboard/email-config`
2. Haz clic en "Sincronizar" manualmente
3. Verifica que tu cuenta esté **Activa**
4. Comprueba que tienes emails no leídos de portales inmobiliarios

### "Token expirado"
**Solución**: El sistema usa refresh tokens que se renuevan automáticamente. Si persiste, desconecta y vuelve a conectar tu Gmail.

---

## 📈 ESTADÍSTICAS Y MONITOREO

Ver estadísticas del sistema:

```sql
-- En Supabase SQL Editor
SELECT * FROM get_email_stats(30);
```

Resultado:
- Total emails procesados
- Leads creados
- Tareas generadas
- Emails pendientes

---

## 🎉 VENTAJAS DE ESTE SISTEMA

✅ **Multi-usuario**: Cada agente su propia cuenta
✅ **Privacidad**: Datos aislados por usuario
✅ **Automático**: Sincronización cada 15 minutos
✅ **Gratis**: Usa Groq AI (432,000 requests/mes)
✅ **Escalable**: Soporta 100+ usuarios
✅ **Seguro**: OAuth 2.0 con tokens encriptados
✅ **Trazable**: Historial completo de emails procesados

---

## 🚀 PRÓXIMOS PASOS

Después de configurar:

1. **Publica propiedades** en Idealista/Fotocasa
2. **Recibe consultas** en tu Gmail
3. **Leads aparecen automáticamente** en el CRM
4. **Haz seguimiento** desde el dashboard
5. **Cierra ventas** más rápido

¡Tu CRM está listo para captar leads 24/7! 🎉
