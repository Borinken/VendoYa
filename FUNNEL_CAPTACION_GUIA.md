# 🎯 FUNNEL DE CAPTACIÓN DE LEADS URGENTES - VENDOYA

## 📋 RESUMEN

Sistema completo de captación para propietarios con situaciones urgentes (herencia, divorcio, embargo, etc.) que incluye:

- ✅ Landing page pública multi-paso
- ✅ Formulario con dirección, situación y fotos
- ✅ Valoración automática con IA (Groq)
- ✅ Página de resultados personalizada
- ✅ Captura de teléfono para WhatsApp
- ✅ Guardado automático en CRM con etiqueta "caso complejo"
- ✅ Automatización de seguimiento días 1, 3 y 7

---

## 🗂️ ARQUITECTURA

### **Archivos Creados:**

```
vendoya-crm/
├── app/
│   ├── vende-rapido/
│   │   ├── page.tsx                          # Landing page del funnel
│   │   └── valoracion/
│   │       └── [id]/
│   │           └── page.tsx                  # Página de resultados personalizada
│   └── api/
│       ├── leads/
│       │   ├── create/route.ts               # Crear lead + valoración IA
│       │   └── [id]/
│       │       ├── route.ts                  # GET/PATCH lead
│       │       └── interaction/route.ts      # Registrar interacciones
│       ├── upload/
│       │   └── photos/route.ts               # Subir fotos
│       └── cron/
│           └── send-scheduled/route.ts       # Worker para mensajes automáticos
├── SCHEMA_LEADS.sql                          # Schema completo de base de datos
└── vercel.json                                # Cron job cada 15 minutos
```

---

## 🚀 SETUP E INSTALACIÓN

### **1. Ejecutar SQL en Supabase**

```bash
# Copiar contenido de SCHEMA_LEADS.sql
# Ir a Supabase SQL Editor
# Pegar y ejecutar
```

Esto crea:
- Tabla `urgent_leads`
- Tabla `lead_interactions`
- Tabla `scheduled_messages`
- Vista `urgent_leads_dashboard`
- Funciones y triggers
- Políticas RLS

### **2. Configurar Variables de Entorno**

Agregar a `.env.local`:

```bash
# Ya tienes estas
NEXT_PUBLIC_SUPABASE_URL=https://iuqumqztkzpfefkgguuq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
GROQ_API_KEY=tu-groq-api-key

# Nuevas para el funnel
CRON_SECRET=tu-secreto-para-cron-jobs
NEXT_PUBLIC_URL=https://vendoya-6do7vkzvd-borinkens-projects.vercel.app

# Opcional - WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=tu-account-sid
TWILIO_AUTH_TOKEN=tu-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886

# Opcional - Email (Resend)
RESEND_API_KEY=tu-resend-api-key

# Opcional - Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=tu-blob-token
```

### **3. Instalar Dependencias (si faltan)**

```bash
npm install @supabase/supabase-js
# Si usas Vercel Blob:
npm install @vercel/blob
```

### **4. Desplegar**

```bash
git add .
git commit -m "Funnel de captación de leads urgentes completo"
git push origin main
vercel --prod
```

---

## 📊 FLUJO COMPLETO DEL USUARIO

### **Paso 1: Landing Page** (`/vende-rapido`)

Usuario llega desde:
- Google Ads (keyword: "vender casa rápido")
- Facebook Ads
- Instagram Stories
- LinkedIn

**Formulario Multi-Paso:**

1. **Dirección** (obligatorio)
   - Dirección completa
   - Ciudad
   - Código postal
   - Tipo de propiedad

2. **Situación urgente** (obligatorio)
   - Herencia 🏠
   - Divorcio 💔
   - Riesgo de embargo ⚠️
   - Propiedad en ruinas 🏚️
   - Mudanza urgente ✈️
   - Necesito liquidez YA 💰
   - Okupación 🚫
   - Otra situación 📝

3. **Fotos** (opcional)
   - Hasta 5 fotos
   - Arrastra y suelta

4. **Datos de contacto** (obligatorio)
   - Nombre
   - Teléfono/WhatsApp
   - Email (opcional)

---

### **Paso 2: Generación de Valoración**

Al enviar el formulario:

1. **Se suben las fotos** a storage (simulado por ahora)
2. **Se llama a Groq API** para generar valoración con IA:
   ```
   - Valor estimado: 250.000€
   - Rango: 230.000€ - 270.000€
   - Precio por m²: 2.500€
   - Análisis del mercado
   - Recomendaciones
   - Impacto de la urgencia
   ```
3. **Se crea el lead** en `urgent_leads`:
   ```json
   {
     "address": "Calle Gran Vía 28, 3º B",
     "city": "Madrid",
     "property_type": "piso",
     "urgent_situation": "divorcio",
     "estimated_value": 250000,
     "valuation_data": { ... },
     "phone": "+34600123456",
     "status": "nuevo",
     "priority": "media"
   }
   ```

4. **Se programan 3 mensajes** en `scheduled_messages`:
   - Día 1: "¿Tienes dudas? Podemos ayudarte"
   - Día 3: "¿Sigues interesado? Tenemos compradores activos"
   - Día 7: "Última oportunidad - Red de +500 agencias"

5. **Se envía WhatsApp inmediato** con:
   - Valoración
   - Link a página de resultados
   - CTA para responder

---

### **Paso 3: Página de Resultados** (`/vende-rapido/valoracion/[id]`)

Usuario ve:

- ✅ **Valoración destacada**: 250.000€
- 📊 **Análisis del mercado** en su ciudad
- ⚠️ **Impacto de su situación** urgente
- 💡 **Recomendaciones personalizadas**
- 📞 **CTAs potentes**:
  - "Quiero que me llamen"
  - "Escribir por WhatsApp"

Al hacer click en CTA:
- Se registra interacción en `lead_interactions`
- Se actualiza status a "contactado"
- Se notifica al equipo de ventas

---

## 🤖 AUTOMATIZACIÓN DE SEGUIMIENTO

### **Cron Job** (cada 15 minutos)

Endpoint: `GET /api/cron/send-scheduled`

**Proceso:**

1. Busca mensajes pendientes en `scheduled_messages`
2. Filtra por `status = 'pending'` y `scheduled_for <= NOW()`
3. Envía cada mensaje según tipo:
   - WhatsApp → Twilio/WhatsApp API
   - Email → Resend/SendGrid
   - SMS → Twilio SMS
4. Actualiza estado a `sent`
5. Marca flags en `urgent_leads`:
   ```sql
   follow_up_day_1_sent = true
   follow_up_day_3_sent = true
   follow_up_day_7_sent = true
   ```
6. Crea interacción en `lead_interactions`

### **Configuración Vercel Cron**

Ya configurado en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-scheduled",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Seguridad:**

El endpoint requiere header de autorización:

```bash
curl -X GET https://tu-dominio.vercel.app/api/cron/send-scheduled \
  -H "Authorization: Bearer tu-cron-secret"
```

---

## 📱 INTEGRACIÓN CON WHATSAPP

### **Opción 1: Twilio (Recomendado)**

```bash
# Instalar
npm install twilio

# Variables de entorno
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
```

**Código en `app/api/leads/create/route.ts`:**

Ya está preparado, solo descomentar sección Twilio.

### **Opción 2: WhatsApp Business Cloud API**

Gratis, pero más complejo de configurar:

1. Crear app en Meta for Developers
2. Configurar WhatsApp Business API
3. Obtener token de acceso
4. Configurar webhooks

### **Opción 3: Servicios terceros**

- **Twilio** (más fácil)
- **360dialog**
- **MessageBird**

---

## 📧 INTEGRACIÓN CON EMAIL

### **Opción 1: Resend (Recomendado)**

```bash
npm install resend

# Variables
RESEND_API_KEY=re_xxxxx
```

### **Opción 2: SendGrid**

```bash
npm install @sendgrid/mail
```

---

## 📸 SUBIDA DE FOTOS

### **Opciones:**

1. **Vercel Blob** (recomendado si estás en Vercel)
   ```bash
   npm install @vercel/blob
   ```

2. **Supabase Storage** (ya tienes Supabase)
   - Crear bucket `property-photos`
   - Hacer público
   - Usar código comentado en `/api/upload/photos`

3. **Cloudinary** (especializado en imágenes)
   ```bash
   npm install cloudinary
   ```

4. **AWS S3** (más flexible)

---

## 🎯 TRACKING Y MÉTRICAS

### **Dashboard de Leads Urgentes**

Crear página en `/dashboard/leads-urgentes`:

```typescript
// Obtener stats
const { data } = await supabase
  .rpc('get_funnel_stats', { days_back: 30 });

// Resultado:
{
  total_leads: 150,
  leads_with_phone: 120,
  conversion_rate: 80,
  avg_estimated_value: 245000,
  by_situation: {
    divorcio: 45,
    herencia: 30,
    embargo: 25,
    ...
  },
  by_status: {
    nuevo: 50,
    contactado: 60,
    calificado: 30,
    ...
  }
}
```

### **Métricas Clave**

- **Tasa de conversión**: % que deja teléfono
- **Tiempo medio de respuesta**: Cuánto tardas en contactar
- **Tasa de cierre**: % que se convierten en clientes
- **Valor promedio**: Valoración media de propiedades
- **ROI por fuente**: Qué canal trae mejores leads

---

## 🔥 CAMPAÑAS DE ADS SUGERIDAS

### **Google Ads**

**Keywords:**
- "vender piso rápido"
- "vendo casa urgente"
- "tasación gratuita"
- "vender piso herencia"
- "vender por divorcio"

**Copy del anuncio:**
```
Título: Vende tu Casa Rápido | Valoración Gratis en 2min
Descripción: Sin comisiones ocultas. +500 agencias. Casos urgentes atendidos en 24h.
```

### **Facebook/Instagram Ads**

**Audiencia:**
- 35-65 años
- Propietarios de vivienda
- Intereses: inmobiliaria, herencias, divorcios

**Creativos:**
- Video corto (30 seg) explicando proceso
- Carrusel con casos de éxito
- Testimonios reales

**Copy:**
```
¿Necesitas vender tu casa YA?
✅ Valoración gratis en 2 minutos
✅ Sin comisiones ocultas
✅ Red de +500 agencias
```

### **LinkedIn Ads** (B2B - abogados)

Target:
- Abogados de familia
- Notarios
- Asesores fiscales

Pueden referir clientes con herencias/divorcios.

---

## 📊 EJEMPLO DE FLUJO COMPLETO

### **Día 0 (Minuto 0)**
- Usuario llega desde ad
- Completa formulario
- Recibe valoración: 250.000€
- Ve página de resultados
- **WhatsApp inmediato**: "Tu valoración está lista"

### **Día 1 (24 horas después)**
- **WhatsApp automático**: "¿Tienes dudas? Podemos ayudarte"
- Lead no responde → continúa secuencia

### **Día 3 (72 horas)**
- **WhatsApp automático**: "¿Sigues interesado? Tenemos compradores"
- Lead responde "SÍ"
- Agente recibe notificación
- Llama en 1 hora

### **Día 4**
- Reunión agendada
- Status: "reunión"

### **Día 10**
- Propuesta enviada
- Status: "propuesta"

### **Día 20**
- **CERRADO** 🎉
- Lead → Cliente

---

## 🛠️ PRÓXIMOS PASOS

### **Inmediatos (Esta semana)**

1. ✅ Ejecutar `SCHEMA_LEADS.sql` en Supabase
2. ✅ Configurar variables de entorno
3. ✅ Desplegar a producción
4. ✅ Probar formulario end-to-end
5. ✅ Configurar WhatsApp (Twilio)

### **Corto plazo (Este mes)**

1. Crear dashboard de leads urgentes
2. Configurar notificaciones para equipo
3. Integrar con sistema de llamadas (Aircall, etc.)
4. A/B testing de landing page
5. Lanzar primera campaña de Google Ads

### **Mediano plazo (Próximos 3 meses)**

1. Automatización avanzada con scoring
2. Integración con CRM principal
3. Chatbot para preguntas frecuentes
4. Portal de seguimiento para clientes
5. Sistema de referidos

---

## ❓ FAQ

### **¿Cómo pruebo el funnel sin desplegar?**

```bash
npm run dev
# Visita: http://localhost:3000/vende-rapido
```

### **¿Cómo ejecuto el cron manualmente?**

```bash
curl -X GET http://localhost:3000/api/cron/send-scheduled \
  -H "Authorization: Bearer dev-secret-change-me"
```

### **¿Cómo veo los leads capturados?**

```sql
-- En Supabase SQL Editor
SELECT * FROM urgent_leads ORDER BY created_at DESC LIMIT 10;
```

O crear página de dashboard:
```typescript
const { data } = await supabase
  .from('urgent_leads_dashboard')
  .select('*')
  .order('created_at', { ascending: false });
```

### **¿Cómo personalizo los mensajes de seguimiento?**

Edita las plantillas en `app/api/leads/create/route.ts`:

```typescript
const messages = [
  {
    template: 'day_1',
    content: `TU MENSAJE PERSONALIZADO AQUÍ`,
  },
  // ...
];
```

### **¿Puedo cambiar la valoración de IA por una fija?**

Sí, en `generateSimpleValuation()` puedes ajustar los precios por ciudad y tipo.

---

## 🎯 OBJETIVOS Y MÉTRICAS

### **Mes 1:**
- 100 leads capturados
- 60% dejan teléfono (60 leads calificados)
- 20% contactados (12 reuniones)
- 5% cierran (3 clientes)
- **Ingresos:** 3 clientes × 2.500€ comisión = 7.500€

### **Mes 3:**
- 500 leads/mes
- 70% dejan teléfono (350 leads)
- 30% contactados (105 reuniones)
- 10% cierran (35 clientes)
- **Ingresos:** 35 × 2.500€ = 87.500€/mes

### **ROI:**
- Coste por lead: 5-10€ (Google Ads)
- Valor promedio cliente: 2.500€ comisión
- ROI: 250x - 500x

---

## 📞 SOPORTE

Si necesitas ayuda:

1. Revisa los logs en Vercel
2. Consulta errores en Supabase
3. Verifica variables de entorno
4. Comprueba que el SQL se ejecutó correctamente

---

**¡Listo para captar leads! 🚀**
