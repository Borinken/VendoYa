# 🔧 CONFIGURACIÓN RÁPIDA - TUS CREDENCIALES DE TWILIO

## ✅ Credenciales Identificadas

**Account SID:** `ACc3e5774a1190b865c73ad5e03c25f883`
**WhatsApp Número (From):** `whatsapp:+14155238886`
**Tu Número (To):** `whatsapp:+34604347363`
**Auth Token:** `[Ingresa manualmente - no compartir públicamente]`

---

## 🚀 MÉTODO 1: Configurar desde la UI (Recomendado)

1. **Abre el CRM en tu navegador:**
   ```
   https://vendoya-rkfk24ifj-borinkens-projects.vercel.app/dashboard/config
   ```

2. **Ingresa las credenciales:**
   - **Twilio Account SID:** `ACc3e5774a1190b865c73ad5e03c25f883`
   - **Twilio Auth Token:** `[Tu Auth Token completo]`
   - **Número de WhatsApp:** `whatsapp:+14155238886`

3. **Guarda los cambios** ✅

---

## 📊 MÉTODO 2: Configurar desde Supabase SQL

1. **Ve a Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/dvwpyjcmmtjybvtahcmr/sql
   ```

2. **Ejecuta el script:**
   ```sql
   UPDATE system_config SET config_value = 'ACc3e5774a1190b865c73ad5e03c25f883' 
   WHERE config_key = 'twilio_account_sid';
   
   UPDATE system_config SET config_value = '[TU_AUTH_TOKEN_AQUI]' 
   WHERE config_key = 'twilio_auth_token';
   
   UPDATE system_config SET config_value = 'whatsapp:+14155238886' 
   WHERE config_key = 'twilio_whatsapp_number';
   ```

---

## 🧪 PROBAR WHATSAPP

### Prueba Manual (cURL)

```bash
curl -X POST https://vendoya-rkfk24ifj-borinkens-projects.vercel.app/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+34604347363",
    "message": "🏠 Prueba desde Vendoya CRM - ¡Funciona!"
  }'
```

### Prueba con Template de Cita

```bash
curl -X POST https://vendoya-rkfk24ifj-borinkens-projects.vercel.app/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+34604347363",
    "contentSid": "HXb5b62575e6e4ff6129ad7c8efe1f983e",
    "contentVariables": {"1": "12/1", "2": "3pm"}
  }'
```

### Prueba desde el CRM

1. Ve a **Captura Auto**
2. Crea un filtro con tu número: `+34604347363`
3. Activa **WhatsApp**
4. Haz clic en **Ejecutar Captura Ahora**
5. ✅ Deberías recibir el mensaje

---

## 📱 CONTENT TEMPLATES DISPONIBLES

### Template: Appointment Reminders
**ContentSid:** `HXb5b62575e6e4ff6129ad7c8efe1f983e`
**Variables:**
- `{{1}}`: Fecha (ejemplo: "12/1")
- `{{2}}`: Hora (ejemplo: "3pm")

**Mensaje:** 
```
Your appointment is coming up on {{1}} at {{2}}. 
If you need to change it, please reply back and let us know.
```

### Crear Tus Propios Templates

1. Ve a Twilio Console: https://console.twilio.com/us1/develop/sms/content-editor
2. Crea un nuevo Content Template
3. Copia el ContentSid
4. Úsalo en tus llamadas a la API

---

## 🔄 NUEVO: Soporte para Templates

La API ahora soporta **dos modos**:

### 1. Mensaje Simple (Body)
```javascript
{
  "phone": "+34604347363",
  "message": "Tu mensaje aquí"
}
```

### 2. Content Template
```javascript
{
  "phone": "+34604347363",
  "contentSid": "HXb5b62575e6e4ff6129ad7c8efe1f983e",
  "contentVariables": {
    "1": "12/1",
    "2": "3pm"
  }
}
```

---

## 📚 Helper de WhatsApp (Código)

Ahora puedes usar el helper `lib/whatsapp.ts`:

```typescript
import { sendSimpleWhatsApp, sendTemplateWhatsApp, WhatsAppTemplates } from '@/lib/whatsapp'

// Mensaje simple
await sendSimpleWhatsApp('+34604347363', '¡Hola!')

// Template de cita
const template = WhatsAppTemplates.appointmentReminder('12/1', '3pm')
await sendTemplateWhatsApp('+34604347363', template.contentSid, template.variables)

// Nuevas propiedades
const msg = WhatsAppTemplates.newProperties(5, 'Pisos en Madrid')
await sendSimpleWhatsApp('+34604347363', msg.message)
```

---

## ✅ CHECKLIST

- [ ] Ejecutar `supabase-config-table.sql` en Supabase
- [ ] Ejecutar `config-twilio-credentials.sql` en Supabase
- [ ] Ingresar Auth Token manualmente en `/dashboard/config`
- [ ] Probar con cURL
- [ ] Crear filtro y probar captura automática
- [ ] ✅ ¡Recibir notificaciones por WhatsApp!

---

## 🎯 SIGUIENTE PASO

**Ve a:** https://vendoya-rkfk24ifj-borinkens-projects.vercel.app/dashboard/config

**Ingresa tu Auth Token y guarda.** ¡Listo! 🚀
