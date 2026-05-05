# 🏠 PÁGINA DE PROPIEDADES - GUÍA COMPLETA

## ✅ ¿QUÉ SE HA CREADO?

Se ha creado una página completa de **Propiedades Capturadas** en tu CRM Vendoya con las siguientes funcionalidades:

### 📍 **URL**: `/dashboard/properties`

---

## 🎯 FUNCIONALIDADES PRINCIPALES

### 1️⃣ **Credenciales de Plataformas**
Configura las credenciales de autenticación para cada plataforma de scraping:

- **Idealista**:
  - API Key
  - Secret

- **Fotocasa**:
  - Usuario
  - Contraseña

- **RealAdvisor**:
  - API Key

**Acceso**: Click en el botón "Credenciales" en la esquina superior derecha.

---

### 2️⃣ **Sincronización Automática**
Sistema de sincronización 24/7 que busca nuevas propiedades automáticamente:

- ✅ **Activa/Desactiva** la sincronización con un botón
- ⏱️ **Configura el intervalo**: 15 min, 30 min, 1 hora, 3 horas
- 🔄 **Sincronización manual**: Botón "Sincronizar Ahora" para ejecutar inmediatamente
- 📊 **Estadísticas**: Muestra el total de propiedades capturadas

**Cómo funciona**:
1. Ejecuta todos los filtros activos de la página `/dashboard/capture`
2. Busca propiedades nuevas en todas las plataformas
3. Las guarda en la base de datos evitando duplicados
4. Evalúa las alarmas configuradas
5. Envía notificaciones WhatsApp si cumplen condiciones

---

### 3️⃣ **Sistema de Alarmas Inteligentes**
Crea alarmas que te notifican automáticamente cuando se encuentren propiedades que cumplan tus requisitos:

**Configuración de Alarma**:
- 📝 **Nombre**: Ej. "Pisos baratos en Madrid"
- 💰 **Precio Máximo**: Filtra por precio
- 🛏️ **Habitaciones Mínimas**: Ej. 2 habitaciones mínimo
- 📐 **Superficie Mínima**: Ej. 80 m² mínimo
- 📍 **Ciudades**: Filtra por ciudades específicas
- 🏢 **Tipos de Propiedad**: Piso, casa, chalet, etc.

**Notificaciones WhatsApp**:
- ✅ Activa/desactiva notificaciones por alarma
- 📱 Número de WhatsApp personalizado
- 📨 Mensaje automático con detalles de la propiedad:
  - Título y descripción
  - Precio y superficie
  - Habitaciones y baños
  - Ciudad y dirección
  - Enlace directo a la propiedad

**Acceso**: Click en "Nueva Alarma" para crear una.

---

### 4️⃣ **Vista de Propiedades Capturadas**
Lista visual de todas las propiedades encontradas:

**Cada tarjeta muestra**:
- 📷 Imagen de la propiedad (si está disponible)
- 🏷️ Fuente (Idealista, Fotocasa, RealAdvisor)
- 📊 Estado (Nueva, Vista, Interesada, Contactada, Importada, Descartada)
- 📝 Título de la propiedad
- 📍 Ubicación (ciudad)
- 💰 Precio
- 📐 Superficie (m²)
- 🛏️ Habitaciones
- 🚿 Baños
- 📅 Fecha de captura
- 📱 Indicador de notificación WhatsApp enviada

**Acciones disponibles**:
- 🔗 **Ver**: Abre la propiedad en la plataforma original
- 📊 **Cambiar estado**: Dropdown para marcar como vista, interesada, etc.
- 🗑️ **Eliminar**: Borra la propiedad de la lista

---

### 5️⃣ **Filtros Avanzados**
Busca y filtra propiedades fácilmente:

- 🔍 **Búsqueda por texto**: Busca por título, ciudad, dirección
- 📊 **Filtro por estado**: Todas, nuevas, vistas, interesadas, contactadas, importadas, descartadas
- 🏢 **Filtro por fuente**: Todas, Idealista, Fotocasa, RealAdvisor
- 📈 **Contador**: Muestra el total de propiedades filtradas

---

## 🚀 FLUJO DE TRABAJO RECOMENDADO

### Paso 1: Configurar Credenciales
```
1. Ve a /dashboard/properties
2. Click en "Credenciales"
3. Ingresa las API Keys de cada plataforma
4. Guarda los cambios
```

### Paso 2: Crear Filtros de Búsqueda
```
1. Ve a /dashboard/capture
2. Crea filtros (Ej: "Pisos en Madrid < 300k€")
3. Activa los filtros que quieras usar
```

### Paso 3: Configurar Alarmas
```
1. Vuelve a /dashboard/properties
2. Click en "Nueva Alarma"
3. Define las condiciones (precio, habitaciones, etc.)
4. Activa notificaciones WhatsApp
5. Ingresa tu número de WhatsApp
6. Guarda la alarma
```

### Paso 4: Activar Sincronización Automática
```
1. En /dashboard/properties
2. Activa "Sincronización Automática"
3. Selecciona el intervalo (recomendado: 30 min)
4. ¡El sistema trabajará 24/7 por ti!
```

### Paso 5: Gestionar Propiedades
```
1. Revisa las nuevas propiedades en /dashboard/properties
2. Marca las que te interesan cambiando el estado
3. Click en "Ver" para ir a la propiedad original
4. Contacta al propietario
5. Marca como "Contactada" o "Importada"
```

---

## 📊 ARQUITECTURA TÉCNICA

### Base de Datos (Supabase)
```sql
-- Tabla: captured_properties
- id, source, source_id, source_url
- data (JSONB con todos los detalles)
- status, match_score
- first_seen_at, notified_at

-- Tabla: property_alarms
- id, name, conditions (JSONB)
- notify_whatsapp, whatsapp_number
- is_active, last_triggered_at

-- Tabla: system_config
- auto_sync_properties (true/false)
- sync_interval_minutes (15, 30, 60, 180)
- idealista_api_key, fotocasa_username, etc.
```

### APIs Creadas
```
POST /api/scraping/sync-all
- Ejecuta sincronización de todos los filtros activos
- Busca nuevas propiedades
- Evalúa alarmas
- Envía notificaciones WhatsApp

POST /api/whatsapp/send
- Envía mensajes de WhatsApp
- Usa credenciales de Twilio
```

---

## 🔒 SEGURIDAD

- ✅ Credenciales encriptadas en base de datos
- ✅ Service Role Key oculta en Vercel
- ✅ Autenticación requerida para todas las rutas
- ✅ Validación de datos en todos los endpoints

---

## 📱 NOTIFICACIONES WHATSAPP

**Formato del mensaje automático**:
```
🏠 *Nueva Propiedad Encontrada!*

📍 Madrid
💰 285.000 €
📐 95 m²
🛏️ 3 habitaciones
🏢 IDEALISTA

🔗 https://idealista.com/...
```

---

## 🎯 CASOS DE USO

### Caso 1: Inversor Inmobiliario
```
Alarma: "Pisos baratos en Madrid"
- Precio máximo: 200.000 €
- Habitaciones mínimas: 2
- Notificación: WhatsApp activada
Resultado: Recibe alertas inmediatas de oportunidades
```

### Caso 2: Agente Inmobiliario
```
Alarma: "Chalets de lujo en Barcelona"
- Precio máximo: 800.000 €
- Superficie mínima: 200 m²
- Tipo: Chalet
Resultado: Captura automática de propiedades premium
```

### Caso 3: Comprador de Primera Vivienda
```
Alarma: "Pisos accesibles"
- Precio máximo: 150.000 €
- Habitaciones mínimas: 2
- Ciudad: Valencia
Resultado: Encuentra vivienda asequible rápidamente
```

---

## 📝 SQL A EJECUTAR

Ejecuta este SQL en Supabase para crear la tabla de alarmas:

```sql
-- Ya está en: /Users/LeslyHector/vendoya-crm/ALARMAS_PROPIEDADES.sql
```

**Pasos**:
1. Ve a: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new
2. Copia el contenido de `ALARMAS_PROPIEDADES.sql`
3. Pega y ejecuta
4. ✅ Tabla creada

---

## 🆘 SOPORTE

Si algo no funciona:
1. Verifica credenciales de plataformas
2. Revisa que los filtros estén activos
3. Confirma que la sincronización automática esté activa
4. Revisa logs en Vercel: https://vercel.com/borinkens-projects/vendoya-crm

---

**¡Tu CRM ahora tiene captura automática 24/7 con notificaciones WhatsApp inteligentes!** 🎉
