# 📧 SISTEMA DE INTEGRACIÓN DE EMAIL - VENDOYA CRM

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 🎯 Capacidades Principales:

1. **Lectura Automática de Emails**
   - ✅ Conecta con Gmail via OAuth 2.0
   - ✅ Lee emails no leídos automáticamente
   - ✅ Soporta IMAP para otros proveedores (Outlook, custom)
   - ✅ Sincronización cada 15 minutos (configurable)

2. **Detección Inteligente de Portales**
   - ✅ Idealista
   - ✅ Fotocasa
   - ✅ RealAdvisor
   - ✅ Habitaclia
   - ✅ Propietarios directos
   - ✅ Compradores/inquilinos

3. **Extracción de Datos con IA (Groq)**
   - ✅ Nombre completo
   - ✅ Teléfono (formato español e internacional)
   - ✅ Email
   - ✅ Tipo de consulta (comprador/vendedor/consulta)
   - ✅ Referencia de inmueble
   - ✅ Dirección y ubicación
   - ✅ Precio y tipo de operación
   - ✅ Intención y prioridad

4. **Automatizaciones**
   - ✅ Crea/actualiza contactos automáticamente
   - ✅ Vincula emails con propiedades existentes
   - ✅ Genera tareas de seguimiento
   - ✅ Prioriza emails (high/medium/low)
   - ✅ Marca emails como leídos
   - ✅ Agrega etiquetas en Gmail

5. **Base de Datos**
   - ✅ Tabla `email_logs`: Registro de todos los emails
   - ✅ Tabla `tasks`: Tareas y seguimientos
   - ✅ Tabla `email_accounts`: Configuración de cuentas
   - ✅ Vistas optimizadas para reportes
   - ✅ Funciones SQL para estadísticas

---

## 🚀 CONFIGURACIÓN RÁPIDA

### Paso 1: Crear Tablas en Supabase

```sql
-- Ejecutar en Supabase SQL Editor
-- (Ver archivo SISTEMA_EMAIL_SUPABASE.sql)
```

Ve a tu proyecto Supabase → SQL Editor → Ejecuta el archivo `SISTEMA_EMAIL_SUPABASE.sql`

### Paso 2: Configurar Gmail OAuth (GRATIS)

#### 2.1. Google Cloud Console

1. Ve a: https://console.cloud.google.com
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita "Gmail API":
   - APIs & Services → Enable APIs and Services
   - Busca "Gmail API" → Enable

#### 2.2. Configurar OAuth Consent Screen

1. APIs & Services → OAuth consent screen
2. User Type: **External** (gratis, hasta 100 usuarios)
3. App name: `Vendoya CRM`
4. User support email: tu email
5. Developer contact: tu email
6. Save and Continue

#### 2.3. Agregar Scopes

En la pantalla de Scopes, agrega:
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.labels
```

#### 2.4. Crear Credenciales OAuth

1. APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client ID
3. Application type: **Web application**
4. Name: `Vendoya CRM Web Client`
5. Authorized redirect URIs:
   ```
   https://tu-dominio.vercel.app/api/auth/gmail/callback
   http://localhost:3000/api/auth/gmail/callback
   ```
6. Crear

**Guarda:**
- ✅ Client ID: `xxxxx.apps.googleusercontent.com`
- ✅ Client Secret: `xxxxx`

#### 2.5. Agregar Usuarios de Prueba

1. OAuth consent screen → Test users
2. Add users → Agrega el email que quieres conectar
3. Save

### Paso 3: Obtener Access Token

Opción A - Manual (para testing):

```bash
# 1. Genera URL de autorización
https://accounts.google.com/o/oauth2/v2/auth?client_id=TU_CLIENT_ID&redirect_uri=http://localhost:3000&response_type=code&scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/gmail.modify&access_type=offline

# 2. Autoriza en el navegador
# 3. Copia el código de la URL de redirección
# 4. Intercambia código por token:

curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=TU_CLIENT_ID" \
  -d "client_secret=TU_CLIENT_SECRET" \
  -d "code=CODIGO_DE_AUTORIZACION" \
  -d "redirect_uri=http://localhost:3000" \
  -d "grant_type=authorization_code"

# 5. Guarda el access_token y refresh_token
```

Opción B - Usando OAuth Flow (recomendado para producción):
```typescript
// Implementar en tu aplicación Next.js
// Ver ejemplo en lib/gmail-oauth.ts (próximo archivo)
```

### Paso 4: Probar Integración

```bash
# Test 1: Procesar un email individual
curl -X POST https://tu-dominio.vercel.app/api/email/process \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Juan Pérez <juan@gmail.com>",
    "subject": "Interesado en piso Calle Mayor 10",
    "body": "Hola, me interesa visitar el piso. Mi teléfono es 612345678.",
    "to": "info@vendoya.es"
  }'

# Test 2: Sincronizar emails de Gmail
curl -X POST https://tu-dominio.vercel.app/api/email/sync \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "ya29.xxxxx",
    "email": "info@vendoya.es",
    "maxResults": 5
  }'
```

---

## 📊 USO DEL SISTEMA

### Endpoints Disponibles:

#### 1. `/api/email/process` - Procesar Email Individual

```bash
POST /api/email/process
Content-Type: application/json

{
  "from": "nombre@email.com",
  "subject": "Asunto del email",
  "body": "Contenido del email",
  "to": "info@vendoya.es",
  "date": "2026-05-05T12:00:00Z"  // Opcional
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "parsed": {
      "source": "idealista",
      "type": "property_inquiry",
      "contact": {
        "name": "Juan Pérez",
        "email": "juan@gmail.com",
        "phone": "+34612345678"
      },
      "priority": "high"
    },
    "contactId": "uuid",
    "propertyId": "uuid",
    "tasksCreated": 2,
    "summary": "📍 Idealista - Consulta inmueble\n👤 Juan Pérez\n📱 +34612345678"
  }
}
```

#### 2. `/api/email/sync` - Sincronizar Gmail

```bash
POST /api/email/sync
Content-Type: application/json

{
  "accessToken": "ya29.xxxxx",
  "email": "info@vendoya.es",
  "maxResults": 10,
  "query": "is:unread"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Procesados 8 de 10 emails",
  "data": {
    "total": 10,
    "processed": 8,
    "errors": 2,
    "details": {
      "processed": [
        {
          "messageId": "18f1234567890abc",
          "subject": "Interesado en piso",
          "contactId": "uuid",
          "tasksCreated": 2
        }
      ]
    }
  }
}
```

---

## ⚙️ AUTOMATIZACIÓN 24/7

### Opción 1: Vercel Cron Jobs (GRATIS)

**Archivo:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/email/sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Problema:** Necesitas pasar el access_token, que expira cada hora.

**Solución:** Implementar refresh token automático.

### Opción 2: GitHub Actions (GRATIS)

**Archivo:** `.github/workflows/sync-emails.yml`
```yaml
name: Sync Emails
on:
  schedule:
    - cron: '*/15 * * * *'  # Cada 15 minutos
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Gmail
        run: |
          curl -X POST https://tu-dominio.vercel.app/api/email/sync \
            -H "Content-Type: application/json" \
            -d '{"accessToken":"${{ secrets.GMAIL_ACCESS_TOKEN }}","email":"info@vendoya.es"}'
```

### Opción 3: Servicio Externo (EasyCron, cron-job.org)

1. Ve a https://cron-job.org (GRATIS)
2. Crea cuenta
3. New Cronjob:
   - URL: `https://tu-dominio.vercel.app/api/email/sync`
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Body: `{"accessToken":"ya29.xxx","email":"info@vendoya.es"}`
   - Schedule: Every 15 minutes
4. Save

---

## 📈 MONITOREO Y ESTADÍSTICAS

### Consultas SQL Útiles:

```sql
-- Ver emails procesados hoy
SELECT * FROM email_logs 
WHERE DATE(created_at) = CURRENT_DATE 
ORDER BY created_at DESC;

-- Estadísticas últimos 30 días
SELECT * FROM get_email_stats(30);

-- Tareas pendientes de seguimiento
SELECT * FROM pending_tasks 
WHERE due_date < NOW() + INTERVAL '24 hours';

-- Emails por fuente (último mes)
SELECT 
  source, 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority
FROM email_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY source;

-- Conversión de emails a leads
SELECT 
  DATE(created_at) as date,
  COUNT(*) as emails_received,
  COUNT(DISTINCT contact_id) as leads_created
FROM email_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🎯 CASOS DE USO

### Caso 1: Email de Idealista

**Email recibido:**
```
De: Juan Pérez <notificaciones@idealista.com>
Asunto: Nuevo contacto para tu inmueble - Ref: 12345678
Cuerpo:
Juan Pérez está interesado en tu inmueble en Calle Mayor, 10, Madrid.
Teléfono: 612 34 56 78
Email: juan.perez@gmail.com
Mensaje: Me gustaría visitar el piso este fin de semana.
```

**Resultado automático:**
- ✅ Contacto creado: "Juan Pérez"
- ✅ Teléfono: +34612345678
- ✅ Email: juan.perez@gmail.com
- ✅ Propiedad vinculada: Ref 12345678
- ✅ Tareas creadas:
  - "Llamar a Juan Pérez para agendar visita"
  - "Preparar documentación del inmueble"
- ✅ Prioridad: HIGH
- ✅ Email marcado como leído
- ✅ Etiqueta agregada: "CRM-Processed"

### Caso 2: Propietario Queriendo Vender

**Email recibido:**
```
De: María García <maria.garcia@gmail.com>
Asunto: Quiero vender mi piso
Cuerpo:
Hola, tengo un piso de 90m² en Salamanca que quiero vender.
Está en buen estado, 3 habitaciones, 2 baños.
¿Pueden ayudarme con la tasación?
Mi teléfono: 654321098
```

**Resultado automático:**
- ✅ Contacto creado: "María García"
- ✅ Tipo: LEAD_SELLER (captación)
- ✅ Teléfono: +34654321098
- ✅ Propiedad placeholder creada: "Piso Salamanca 90m²"
- ✅ Tareas creadas:
  - "Contactar María García para tasación"
  - "Agendar visita de valoración"
  - "Preparar dosier de captación"
- ✅ Prioridad: HIGH (captación)

### Caso 3: Consulta General

**Email recibido:**
```
De: Pedro López <pedro@example.com>
Asunto: Información sobre alquileres
Cuerpo:
Buenas tardes,
¿Tienen pisos de 2 habitaciones en alquiler en el centro?
Mi presupuesto es 1000€/mes.
Gracias.
```

**Resultado automático:**
- ✅ Contacto creado: "Pedro López"
- ✅ Tipo: LEAD_BUYER
- ✅ Preferencias extraídas: 2 habitaciones, alquiler, centro, 1000€/mes
- ✅ Tareas creadas:
  - "Enviar propuestas de pisos en alquiler"
  - "Programar seguimiento en 3 días"
- ✅ Prioridad: MEDIUM

---

## 💰 COSTOS

### Totalmente GRATIS:
- ✅ Gmail API: Gratis (hasta 1 billón de solicitudes/día)
- ✅ Google OAuth: Gratis (hasta 100 usuarios en modo test)
- ✅ Groq API: 432,000 análisis/mes gratis
- ✅ Vercel: Hosting gratis
- ✅ Supabase: 500MB gratis
- ✅ GitHub Actions: 2,000 minutos/mes gratis

**Costo mensual total: €0.00**

---

## 🔧 PRÓXIMOS PASOS

### Para Producción:

1. **Implementar Refresh Token Automático**
   - Guardar refresh_token en Supabase (encriptado)
   - Auto-renovar access_token cada hora
   - Ver `lib/gmail-oauth-refresh.ts`

2. **Agregar Outlook/Microsoft 365**
   - Similar a Gmail pero con Microsoft Graph API
   - Ver `lib/outlook-client.ts`

3. **Panel de Control Email**
   - Interfaz para ver emails procesados
   - Estadísticas en tiempo real
   - Configurar reglas personalizadas
   - Ver `/dashboard/emails`

4. **Webhooks de Portales**
   - Idealista webhook directo
   - Fotocasa API
   - Eliminar necesidad de polling

5. **IA Mejorada**
   - Entrenar modelo específico para inmobiliaria
   - Detectar urgencia y sentiment
   - Respuestas automáticas sugeridas

---

## 📞 SOPORTE

**Documentación:**
- Gmail API: https://developers.google.com/gmail/api
- OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Groq API: https://console.groq.com/docs

**Testing:**
```bash
# Verificar API
curl https://tu-dominio.vercel.app/api/email/process

# Ver logs de Vercel
vercel logs --follow

# Ver logs de Supabase
# Supabase Dashboard → Logs
```

---

## ✅ CHECKLIST DE CONFIGURACIÓN

- [ ] Tablas creadas en Supabase
- [ ] Gmail API habilitada en Google Cloud
- [ ] OAuth configured con scopes correctos
- [ ] Credenciales OAuth obtenidas (Client ID + Secret)
- [ ] Access token obtenido para cuenta de email
- [ ] Endpoint `/api/email/process` probado
- [ ] Endpoint `/api/email/sync` probado
- [ ] Cron job configurado para sincronización automática
- [ ] Etiqueta "CRM-Processed" creada en Gmail
- [ ] Primer email procesado exitosamente
- [ ] Contacto y tarea creados automáticamente

**¡Sistema de Email listo para captar leads 24/7!** 🚀
