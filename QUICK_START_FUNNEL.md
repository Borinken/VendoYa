# ⚡ QUICK START - FUNNEL DE CAPTACIÓN

## 🎯 QUÉ ES

Funnel automatizado que capta propietarios con problemas urgentes (divorcio, herencia, embargo, etc.) y los convierte en leads calificados con seguimiento automático por WhatsApp.

## ✅ YA ESTÁ CREADO

- [x] Landing page `/vende-rapido`
- [x] Formulario multi-paso (dirección, situación, fotos, contacto)
- [x] Valoración con IA (Groq)
- [x] Página de resultados `/vende-rapido/valoracion/[id]`
- [x] APIs completas
- [x] Sistema de seguimiento automático (días 1, 3, 7)
- [x] Schema SQL para Supabase

## 🚀 PARA ACTIVARLO

### 1. Ejecutar SQL (5 min)

```bash
# 1. Abrir Supabase SQL Editor
https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new

# 2. Copiar contenido de SCHEMA_LEADS.sql
# 3. Pegar y ejecutar
```

### 2. Desplegar (2 min)

```bash
cd /Users/LeslyHector/vendoya-crm

git add .
git commit -m "Funnel de captación de leads urgentes"
git push origin main
vercel --prod
```

### 3. Probar (1 min)

Visita: https://vendoya-6do7vkzvd-borinkens-projects.vercel.app/vende-rapido

## 📱 CONFIGURAR WHATSAPP (Opcional pero recomendado)

### Opción A: Twilio (Más fácil)

1. Crear cuenta: https://console.twilio.com
2. Obtener WhatsApp Sandbox: +1 415 523 8886
3. Agregar a Vercel env vars:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_WHATSAPP_NUMBER=+14155238886
   ```
4. Re-desplegar

### Opción B: Sin WhatsApp (funcionará sin enviar mensajes)

El sistema seguirá funcionando, pero no enviará WhatsApp. Los leads se guardarán en el CRM.

## 📊 CÓMO FUNCIONA

```
Usuario ve anuncio
    ↓
Llena formulario (dirección + situación + fotos)
    ↓
IA genera valoración automática
    ↓
Ve página de resultados con valor estimado
    ↓
Deja teléfono para recibir info
    ↓
Lead guardado en CRM con etiqueta "caso complejo"
    ↓
WhatsApp inmediato con valoración
    ↓
Seguimiento automático días 1, 3, 7
```

## 🎯 CAMPAÑAS SUGERIDAS

### Google Ads

```
Keywords: "vender piso rápido", "vendo casa urgente", "tasación gratuita"
Presupuesto inicial: 20€/día
Landing: /vende-rapido?utm_source=google&utm_medium=cpc
```

### Facebook/Instagram

```
Audiencia: 35-65 años, propietarios
Creativos: Video 30seg + carrusel testimonios
Presupuesto: 15€/día
Landing: /vende-rapido?utm_source=facebook&utm_medium=paid
```

## 📈 OBJETIVOS MES 1

- 100 leads capturados
- 60% dejan teléfono (60 leads calificados)
- 20% contactados (12 reuniones)
- 5% cierran (3 clientes × 2.500€ = 7.500€)

**ROI:** Coste 5-10€/lead → Valor 2.500€/cliente = **250-500x ROI**

## 📁 ARCHIVOS IMPORTANTES

- `SCHEMA_LEADS.sql` - Base de datos
- `FUNNEL_CAPTACION_GUIA.md` - Documentación completa
- `app/vende-rapido/page.tsx` - Landing page
- `app/api/leads/create/route.ts` - Lógica principal
- `app/api/cron/send-scheduled/route.ts` - Automatización

## 🔍 VER LEADS CAPTURADOS

### Opción 1: SQL directo

```sql
SELECT * FROM urgent_leads ORDER BY created_at DESC LIMIT 10;
```

### Opción 2: Dashboard (crear después)

```typescript
// En /dashboard/leads-urgentes
const { data } = await supabase
  .from('urgent_leads_dashboard')
  .select('*')
  .order('created_at', { ascending: false });
```

## ⚙️ AUTOMATIZACIÓN

Ya configurado en `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/send-scheduled",
    "schedule": "*/15 * * * *"  // Cada 15 minutos
  }]
}
```

Envía automáticamente los mensajes programados de WhatsApp/Email.

## 🆘 TROUBLESHOOTING

### "No se crea el lead"
- Verifica que ejecutaste el SQL en Supabase
- Revisa variables SUPABASE_SERVICE_ROLE_KEY

### "No se envía WhatsApp"
- Es normal si no configuraste Twilio
- Los leads se guardan igual en el CRM

### "Error en valoración IA"
- Verifica GROQ_API_KEY en .env.local
- Tiene fallback a valoración simple sin IA

## 📞 PRÓXIMOS PASOS

1. ✅ Ejecutar SQL
2. ✅ Desplegar
3. ✅ Probar funnel
4. 🔄 Configurar WhatsApp (opcional)
5. 🔄 Lanzar primera campaña de ads
6. 🔄 Crear dashboard de leads
7. 🔄 Entrenar equipo de ventas

---

**¿Listo? Ejecuta el SQL y despliega. En 10 minutos tienes el funnel funcionando.** 🚀
