# 🏠 Vendoya CRM - CRM Inmobiliario

Sistema CRM completo para agencias inmobiliarias desarrollado con Next.js 14, TypeScript, Tailwind CSS y Supabase.

## 🚀 Características

- ✅ **Gestión de Propiedades** - CRUD completo de inmuebles
- ✅ **Gestión de Contactos** - Leads, propietarios, compradores, inquilinos
- ✅ **Contratos** - Generación y gestión de contratos
- ✅ **Alquileres** - Gestión integral de alquileres activos
- ✅ **Dashboard** - Estadísticas y métricas en tiempo real
- ✅ **Responsive** - Diseño adaptado a móvil, tablet y desktop

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta de Supabase (gratis en https://supabase.com)
- Cuenta de Vercel (gratis en https://vercel.com)

## 🛠️ Instalación y Configuración

### 1. Clonar e instalar dependencias

```bash
cd vendoya-crm
npm install
```

### 2. Configurar Supabase

1. Ve a https://supabase.com y crea un nuevo proyecto
2. En el panel de Supabase, ve a **SQL Editor**
3. Copia y pega el contenido de `supabase-schema.sql`
4. Ejecuta el script para crear todas las tablas

5. Obtén tus credenciales:
   - Ve a **Settings** > **API**
   - Copia `URL` y `anon public` key

### 3. Configurar variables de entorno

Edita el archivo `.env.local` con tus credenciales:

```bash
# Reemplaza con tus credenciales reales de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# URL de la aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador.

## 🌐 Desplegar en Vercel con dominio vendoya.es

### Desde la terminal:

```bash
# 1. Login en Vercel
vercel login

# 2. Desplegar
vercel --prod

# 3. Configurar dominio
vercel alias set <url-deployment> vendoya.es
```

## 📁 Estructura del Proyecto

```
vendoya-crm/
├── app/
│   ├── dashboard/              # Dashboard principal
│   │   ├── page.tsx           # Página principal con stats
│   │   └── layout.tsx         # Layout con sidebar
│   ├── api/                   # API routes
│   └── page.tsx               # Redirect a dashboard
├── components/
│   ├── Sidebar.tsx            # Sidebar de navegación
│   └── ui/                    # Componentes UI reutilizables
├── lib/
│   ├── supabase.ts            # Cliente de Supabase + tipos
│   └── utils.ts               # Utilidades
└── supabase-schema.sql        # Schema de base de datos
```

## 🗄️ Base de Datos (Supabase)

El schema incluye: agencies, users, contacts, properties, contracts, rentals, incidents, activities, capture_filters, captured_properties

## 🎨 Tecnologías

- Next.js 14 + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Vercel

---

Desarrollado con ❤️ para revolucionar el mercado inmobiliario español
