# 🎉 VENDOYA CRM - TODO LISTO

## ✅ LO QUE YA ESTÁ FUNCIONANDO:

1. **Diseño Completo**: Tema oscuro con colores verdes emerald
2. **Dashboard**: Estadísticas, gráficos, tablas
3. **Propiedades**: CRUD completo
4. **Contactos**: Gestión de contactos
5. **Captura Automática**: Sistema de scraping con filtros
6. **Documentos**: Acceso a archivos locales sin subirlos
7. **WhatsApp**: Integración con Twilio lista
8. **Scraping**: Anti-detección con Puppeteer
9. **Despliegue**: En producción en Vercel

## 🔧 ÚLTIMO PASO (1 MINUTO):

### **Configura la Base de Datos:**

1. **El SQL ya está copiado en tu portapapeles**
2. **Ya se abrió Supabase en tu navegador** (https://supabase.com/dashboard/project/dvwpyjcmmtjybvtahcmr/sql/new)
3. **Pega el SQL** (Cmd+V)
4. **Click en "RUN"**
5. **Listo!**

## 🌐 ACCEDE A TU CRM:

**URL Principal:** https://vendoya-hwxuip8lq-borinkens-projects.vercel.app

### Páginas disponibles:

- `/` - Landing page con información
- `/dashboard` - Panel principal
- `/dashboard/capture` - Captura automática de propiedades
- `/dashboard/config` - Configuración (agregar Auth Token aquí)
- `/dashboard/documents` - Acceso a archivos locales

## 🔑 AGREGAR TU AUTH TOKEN DE TWILIO:

1. Ve a: https://vendoya-hwxuip8lq-borinkens-projects.vercel.app/dashboard/config
2. Verás precargado:
   - **Account SID**: ACc3e5774a1190b865c73ad5e03c25f883
   - **WhatsApp Number**: +14155238886
3. **Solo falta que ingreses tu Auth Token de Twilio**
4. Click en "Guardar Cambios"

## 📱 PROBAR WHATSAPP:

### Opción 1: Desde el CRM
1. Ve a `/dashboard/capture`
2. Crea un nuevo filtro
3. Activa "Notificar por WhatsApp"
4. Pon tu número: +34604347363
5. Ejecuta la captura

### Opción 2: Desde Terminal
```bash
curl -X POST https://vendoya-hwxuip8lq-borinkens-projects.vercel.app/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+34604347363", "message": "🏠 Prueba desde Vendoya CRM"}'
```

## 🏠 CONFIGURAR CAPTURA DE PROPIEDADES:

1. Ve a `/dashboard/capture`
2. Click en "Nuevo Filtro"
3. Configura:
   - **Portal**: Idealista / Fotocasa / RealAdvisor
   - **Operación**: Venta / Alquiler
   - **Tipo**: Piso / Casa / Oficina
   - **Ciudad**: Madrid, Barcelona, etc
   - **Precio**: Mínimo y máximo
   - **WhatsApp**: Activa y pon tu número
4. Guarda y activa el filtro
5. Click en "▶ Ejecutar Ahora"

## 🎯 FUNCIONES DEL SCRAPING:

- ✅ **Anti-detección**: User-agents rotativos, delays aleatorios, sin flags de webdriver
- ✅ **Multi-portal**: Idealista, Fotocasa, RealAdvisor
- ✅ **Filtros avanzados**: Ciudad, tipo, operación, precio, superficie
- ✅ **Notificaciones WhatsApp**: Instantáneas cuando aparecen propiedades
- ✅ **Histórico**: Guarda todas las propiedades encontradas

## 📂 DOCUMENTOS LOCALES:

1. Ve a `/dashboard/documents`
2. Click en "Seleccionar Carpeta"
3. Elige una carpeta de tu Mac
4. Navega, busca, descarga archivos
5. **Sin subir nada al servidor** - todo queda en tu computadora

## 🔒 SEGURIDAD:

- ✅ Service Role Key configurada en Vercel (oculta)
- ✅ Auth Token se guarda encriptado en Supabase
- ✅ Scraping con anti-detección profesional
- ✅ Archivos locales nunca se suben al servidor

## 📊 RESUMEN DE CREDENCIALES:

### Supabase:
- URL: https://dvwpyjcmmtjybvtahcmr.supabase.co
- Anon Key: Configurada ✅
- Service Role Key: Configurada ✅

### Twilio (Tu información):
- Account SID: ACc3e5774a1190b865c73ad5e03c25f883 ✅
- Auth Token: **AGREGAR EN /dashboard/config** ⏳
- WhatsApp From: +14155238886 ✅
- WhatsApp To: +34604347363 ✅
- Template ID: HXb5b62575e6e4ff6129ad7c8efe1f983e ✅

### Vercel:
- Proyecto: vendoya-crm
- Scope: borinkens-projects
- URL: https://vendoya-hwxuip8lq-borinkens-projects.vercel.app ✅

## 🚀 PRÓXIMOS PASOS:

1. ✅ Ejecutar SQL en Supabase (AHORA)
2. ⏳ Agregar Auth Token en /dashboard/config
3. 🧪 Probar WhatsApp
4. 🏠 Crear tu primer filtro de captura
5. 🎉 ¡Disfrutar tu CRM!

---

**¿Necesitas ayuda?** Todo el código está en `/Users/LeslyHector/vendoya-crm/`
