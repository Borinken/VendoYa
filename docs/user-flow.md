# 🔐 FLUJO DE CONFIGURACIÓN - SISTEMA EMAIL

## ⚙️ PASO 1: CONFIGURACIÓN INICIAL (ADMIN - UNA SOLA VEZ)

**Quién:** Tú (administrador de la app)
**Dónde:** Google Cloud Console + archivo .env.local
**Cuándo:** Una sola vez al inicio

### Pasos:
1. Ir a https://console.cloud.google.com
2. Crear proyecto "VendoYa CRM"
3. Activar Gmail API
4. Crear credenciales OAuth (Client ID y Secret)
5. Agregar credenciales al archivo .env.local:
   ```
   GMAIL_CLIENT_ID="123456-abc.apps.googleusercontent.com"
   GMAIL_CLIENT_SECRET="GOCSPX-xyz123..."
   ```
6. Desplegar a Vercel

**✅ Esto solo se hace UNA VEZ**

---

## 👤 PASO 2: CADA USUARIO CONECTA SU GMAIL

**Quién:** Cada usuario de tu CRM
**Dónde:** Dashboard de tu app en /dashboard/email-config
**Cuándo:** Cada usuario lo hace una vez

### Flujo del usuario:
1. Usuario entra a tu CRM
2. Va a **"📧 Configurar Email"** en el menú
3. Ingresa su email personal: `juan@gmail.com`
4. Click en **"Conectar Gmail"**
5. Se abre ventana de Google
6. Usuario **se loguea en Google** (si no está logueado)
7. Google pregunta: "¿Permitir que VendoYa CRM acceda a tu Gmail?"
8. Usuario click en **"Permitir"**
9. ✅ Listo! Su Gmail está conectado

### ⚠️ IMPORTANTE:
- El usuario **NO ingresa contraseña en tu app**
- El usuario **autoriza a través de Google** (OAuth)
- Esto es más seguro y cumple con las políticas de Google
- Cada usuario conecta SU PROPIA cuenta Gmail
- Las credenciales se guardan en tu base de datos (tabla email_accounts)

---

## 🔄 SINCRONIZACIÓN AUTOMÁTICA

Una vez conectado, el sistema:
1. Lee emails automáticamente del Gmail del usuario
2. Extrae contactos con IA
3. Crea leads en el CRM
4. Genera tareas de seguimiento

**Todo automático 24/7**

---

## 📊 RESUMEN

| Concepto | Quién | Dónde | Frecuencia |
|----------|-------|-------|------------|
| Credenciales de la APP | Admin | Google Cloud Console + .env | Una vez |
| Conexión de Gmail | Usuario final | Dashboard /email-config | Una vez por usuario |
| Sincronización | Automático | Sistema | 24/7 |
