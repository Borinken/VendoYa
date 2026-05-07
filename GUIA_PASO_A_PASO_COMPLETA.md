# 📖 GUÍA COMPLETA PASO A PASO - Setup Email System

## PARTE 1: EJECUTAR SQL EN SUPABASE (5 minutos) ⚡

### 🔑 PASO 1.1: Iniciar sesión en Supabase
1. Abre tu navegador
2. Ve a: **https://supabase.com/dashboard**
3. Inicia sesión con tu cuenta
4. Deberías ver la lista de tus proyectos

### 📊 PASO 1.2: Abrir SQL Editor
1. Busca tu proyecto **"iuqumqztkzpfefkgguuq"** en la lista
2. Haz clic en el proyecto para abrirlo
3. En el menú lateral izquierdo, busca el ícono **"SQL Editor"** 
   - Tiene un ícono que parece </> o un símbolo de código
4. Haz clic en **"SQL Editor"**
5. Haz clic en el botón **"+ New query"** (arriba a la derecha)

### 📝 PASO 1.3: Copiar el SQL
1. En tu Mac, abre la terminal y ejecuta:
   ```bash
   open -a TextEdit /Users/LeslyHector/vendoya-crm/SISTEMA_EMAIL_SUPABASE.sql
   ```
   
2. O abre el archivo directamente desde VS Code (ya lo tienes)

3. Selecciona **TODO** el contenido (Cmd+A)

4. Copia (Cmd+C)

### 🚀 PASO 1.4: Pegar y ejecutar
1. Vuelve a la pestaña del navegador con Supabase SQL Editor
2. Haz clic en el área de texto grande (donde dice "Write your SQL query here")
3. Pega el código copiado (Cmd+V)
4. Verás todo el código SQL en el editor
5. Haz clic en el botón **"RUN"** (esquina inferior derecha)
   - O presiona **Cmd + Enter**

### ✅ PASO 1.5: Verificar que funcionó
Deberías ver un mensaje de éxito:
- **"Success. No rows returned"** o
- Una lista de confirmaciones de cada tabla creada

Para verificar las tablas:
1. En el menú lateral izquierdo, haz clic en **"Table Editor"** (ícono de tabla)
2. Deberías ver las nuevas tablas:
   - ✅ **email_logs**
   - ✅ **tasks**
   - ✅ **email_accounts**

Si aparecen estas 3 tablas, ¡PASO 1 COMPLETADO! 🎉

---

## PARTE 2: CONFIGURAR GMAIL OAUTH EN GOOGLE CLOUD (15 minutos) 🔐

### 🌐 PASO 2.1: Abrir Google Cloud Console
1. Abre: **https://console.cloud.google.com**
2. Inicia sesión con tu cuenta de Google
3. Si es tu primera vez, acepta los términos y condiciones

### 📦 PASO 2.2: Crear un proyecto nuevo
1. En la parte superior, verás el nombre del proyecto actual (o "Select a project")
2. Haz clic en el selector de proyectos (arriba junto al logo de Google Cloud)
3. Se abre un modal, haz clic en **"NEW PROJECT"** (arriba a la derecha)
4. Rellena:
   - **Project name**: `VendoYa CRM`
   - **Location**: Deja el predeterminado (No organization)
5. Haz clic en **"CREATE"**
6. Espera 10-20 segundos a que se cree
7. Verás una notificación, haz clic en **"SELECT PROJECT"**

### 🔌 PASO 2.3: Activar Gmail API
1. En el menú lateral izquierdo (hamburguesa ☰), busca:
   - **"APIs & Services"** → **"Library"**
   - O usa el buscador de arriba y escribe "Gmail API"

2. Haz clic en **"Gmail API"**
   - Es un cuadro con el logo de Gmail

3. Haz clic en el botón azul **"ENABLE"**
   - Espera 5 segundos

4. Verás "API enabled" ✅

### 👤 PASO 2.4: Configurar OAuth Consent Screen
1. En el menú lateral izquierdo:
   - **"APIs & Services"** → **"OAuth consent screen"**

2. Selecciona **"External"** (círculo de opción)
   - Esto es gratis para hasta 100 usuarios
   - **NO selecciones "Internal"** (requiere Google Workspace)

3. Haz clic en **"CREATE"**

4. **Página 1: OAuth consent screen**
   - **App name**: `VendoYa CRM`
   - **User support email**: Selecciona tu email del dropdown
   - **App logo**: Déjalo en blanco (opcional)
   - **App domain**: Déjalo en blanco (opcional)
   - **Authorized domains**: Déjalo en blanco (opcional)
   - **Developer contact information**: Escribe tu email
   - Haz clic en **"SAVE AND CONTINUE"**

5. **Página 2: Scopes**
   - Haz clic en **"ADD OR REMOVE SCOPES"**
   - Se abre un panel lateral
   - En el buscador de arriba, busca: `gmail`
   - Marca estas 3 casillas (checkboxes):
     * ✅ `https://www.googleapis.com/auth/gmail.readonly`
     * ✅ `https://www.googleapis.com/auth/gmail.modify`
     * ✅ `https://www.googleapis.com/auth/gmail.labels`
   - Haz clic en **"UPDATE"** (abajo del panel)
   - Haz clic en **"SAVE AND CONTINUE"**

6. **Página 3: Test users**
   - Haz clic en **"+ ADD USERS"**
   - Escribe tu email de Gmail (el que usarás para recibir leads)
   - Presiona Enter
   - Haz clic en **"ADD"**
   - Haz clic en **"SAVE AND CONTINUE"**

7. **Página 4: Summary**
   - Revisa que todo esté correcto
   - Haz clic en **"BACK TO DASHBOARD"**

### 🔑 PASO 2.5: Crear OAuth Credentials
1. En el menú lateral izquierdo:
   - **"APIs & Services"** → **"Credentials"**

2. Arriba, haz clic en **"+ CREATE CREDENTIALS"**
   - Selecciona **"OAuth client ID"**

3. Se abre un formulario:
   - **Application type**: Selecciona **"Web application"** del dropdown
   - **Name**: `VendoYa CRM Web Client`

4. En **"Authorized redirect URIs"**:
   - Haz clic en **"+ ADD URI"**
   - Pega: `https://vendoya-netk9cj8a-borinkens-projects.vercel.app/api/auth/gmail/callback`
   - Haz clic en **"+ ADD URI"** otra vez
   - Pega: `http://localhost:3000/api/auth/gmail/callback`

5. Haz clic en **"CREATE"** (abajo)

6. **¡IMPORTANTE!** Aparece un modal con tus credenciales:
   - **Client ID**: Algo como `123456789-abc...apps.googleusercontent.com`
   - **Client Secret**: Algo como `GOCSPX-abc123...`
   
   **⚠️ COPIA ESTOS DOS VALORES INMEDIATAMENTE**
   - Haz clic en el ícono de copiar junto a cada uno
   - Pégalos en una nota o archivo temporal
   - Los necesitarás en el siguiente paso

7. Haz clic en **"OK"** para cerrar el modal

### 💾 PASO 2.6: Guardar credenciales y obtener Access Token
1. Abre la terminal en tu Mac

2. Ve a tu proyecto:
   ```bash
   cd /Users/LeslyHector/vendoya-crm
   ```

3. Ejecuta el script:
   ```bash
   node obtener-gmail-token.js
   ```

4. El script te pedirá:
   ```
   Client ID: 
   ```
   - Pega el **Client ID** que copiaste en el paso 2.5
   - Presiona Enter

5. Luego te pedirá:
   ```
   Client Secret:
   ```
   - Pega el **Client Secret** que copiaste
   - Presiona Enter

6. El script generará una **URL muy larga**:
   ```
   1. Abre esta URL en tu navegador:
   https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=...
   ```
   - **Copia toda la URL** (puede ser muy larga)
   - Pégala en tu navegador y presiona Enter

7. **En el navegador**:
   - Verás "Google hasn't verified this app"
   - Haz clic en **"Advanced"** (abajo)
   - Haz clic en **"Go to VendoYa CRM (unsafe)"**
   - Verás la pantalla de permisos
   - Revisa los permisos (lectura de Gmail, modificar, labels)
   - Haz clic en **"Continue"**

8. Google te mostrará un **código** (algo como `4/0Adeu5BW...`)
   - Selecciona el código completo
   - Copia (Cmd+C)

9. **Vuelve a la terminal**:
   ```
   Pega el código aquí:
   ```
   - Pega el código
   - Presiona Enter

10. **¡Listo!** Verás:
    ```
    ✅ ¡Token obtenido exitosamente!
    📋 GUARDA ESTOS VALORES:
    Access Token: ya29.a0AfB_...
    Refresh Token: 1//0gK...
    Expira en: 2026-05-06T09:50:00.000Z
    💾 Guardando en .env.local...
    ✅ Variables guardadas en .env.local
    ```

---

## PARTE 3: PROBAR QUE TODO FUNCIONA 🎉

### 🧪 PASO 3.1: Verificar base de datos
1. Abre: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/editor
2. Haz clic en tabla **email_logs** - debe estar vacía
3. Haz clic en tabla **tasks** - debe estar vacía
4. Haz clic en tabla **email_accounts** - debe estar vacía
5. ✅ Si las 3 tablas existen, ¡perfecto!

### 📧 PASO 3.2: Probar sincronización de Gmail
1. En tu terminal:
   ```bash
   cd /Users/LeslyHector/vendoya-crm
   npm run dev
   ```

2. Espera a que inicie (verás: "Ready on http://localhost:3000")

3. En **otra terminal** (nueva pestaña):
   ```bash
   cd /Users/LeslyHector/vendoya-crm
   
   # Reemplaza TU_EMAIL con tu Gmail
   curl -X POST http://localhost:3000/api/email/sync \
     -H "Content-Type: application/json" \
     -d "{
       \"email\": \"TU_EMAIL@gmail.com\",
       \"maxResults\": 5
     }"
   ```

4. Deberías ver algo como:
   ```json
   {
     "success": true,
     "processed": 3,
     "created": 2,
     "updated": 1,
     "summary": "Procesados 3 emails..."
   }
   ```

5. Vuelve a Supabase y refresca la tabla **email_logs**
   - Deberías ver los emails procesados ✅

### 🎊 PASO 3.3: Verificar en el Dashboard
1. Abre: http://localhost:3000/dashboard/contacts
2. Deberías ver los contactos extraídos de los emails
3. Ve a: http://localhost:3000/dashboard (dashboard principal)
4. Deberías ver estadísticas actualizadas

---

## 🚀 AUTOMATIZACIÓN OPCIONAL (10 minutos)

### Opción A: Cron de Vercel (Recomendado)
1. Crea archivo `vercel.json` en la raíz del proyecto:
   ```json
   {
     "crons": [{
       "path": "/api/email/sync",
       "schedule": "*/15 * * * *"
     }]
   }
   ```

2. Despliega:
   ```bash
   vercel --prod
   ```

3. Vercel ejecutará la sincronización cada 15 minutos automáticamente

### Opción B: GitHub Actions (Alternativa)
Ya está configurado en `.github/workflows/email-sync.yml`

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### ❌ Error: "table already exists"
- **Solución**: Las tablas ya están creadas, todo bien ✅

### ❌ Error: "relation contacts does not exist"
- **Solución**: Verifica que la tabla `contacts` existe en Supabase
- Si no existe, créala primero

### ❌ Error: "Invalid token" en Gmail
- **Solución**: El token expiró, ejecuta `node obtener-gmail-token.js` de nuevo

### ❌ Error: "Access blocked: This app's request is invalid"
- **Solución**: Verifica que agregaste tu email a "Test users" en OAuth consent screen

### ❌ No se procesan emails
- **Verifica**:
  1. El archivo `.env.local` tiene las variables de Gmail
  2. El servidor está corriendo (`npm run dev`)
  3. Tu email está en test users de Google Cloud
  4. El access token no expiró (dura 1 hora)

---

## 📞 NECESITAS AYUDA

Si algo no funciona:
1. Revisa los logs en la terminal
2. Verifica las variables en `.env.local`
3. Comprueba que Gmail API está habilitada
4. Verifica que tu email está en test users

¡Ya está todo configurado para recibir leads automáticamente! 🎉
