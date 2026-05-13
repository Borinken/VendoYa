# 🚀 VENDOYA.ES - CONFIGURACIÓN COMPLETA

## ✅ LO QUE SE HA IMPLEMENTADO

### 1. **Sistema de Autenticación Supabase** ✅
- ✅ Página de login (`/login`)
- ✅ Página de registro (`/signup`)
- ✅ Middleware de protección de rutas
- ✅ API de logout
- ✅ Integración con Supabase Auth
- ✅ Botón de cerrar sesión en sidebar

### 2. **Sistema de Pagos con Stripe** ✅
- ✅ Página de pricing (`/pricing`)
- ✅ 3 planes configurados (Básico 49€, Profesional 99€, Empresas 199€)
- ✅ API de checkout
- ✅ Webhooks de Stripe
- ✅ Facturación mensual y anual (20% descuento)
- ✅ Librería Stripe configurada

### 3. **Páginas Legales (RGPD Compliant)** ✅
- ✅ Política de Privacidad (`/privacy`)
- ✅ Términos y Condiciones (`/terms`)
- ✅ Política de Cookies (`/cookies`)
- ✅ Aviso Legal (`/legal`)

### 4. **Dominio** ✅
- ✅ vendoya.es configurado en Vercel
- ✅ SSL activo
- ✅ Variables de entorno actualizadas

---

## 🔧 CONFIGURACIÓN PENDIENTE

### **PASO 1: Configurar Stripe (15 minutos)**

#### 1.1 Crear cuenta de Stripe
1. Ve a https://dashboard.stripe.com/register
2. Crea una cuenta con tu email
3. Completa la verificación empresarial

#### 1.2 Obtener API Keys
1. Ve a https://dashboard.stripe.com/apikeys
2. Copia las siguientes keys:
   - **Publishable key** (empieza con `pk_test_` o `pk_live_`)
   - **Secret key** (empieza con `sk_test_` o `sk_live_`)

#### 1.3 Crear Productos en Stripe
1. Ve a https://dashboard.stripe.com/products
2. Crea 3 productos:

**Producto 1: Plan Básico**
- Nombre: Plan Básico
- Precio: 49 EUR/mes
- Copia el **Price ID** (empieza con `price_`)

**Producto 2: Plan Profesional** 
- Nombre: Plan Profesional
- Precio: 99 EUR/mes
- Copia el **Price ID**

**Producto 3: Plan Empresas**
- Nombre: Plan Empresas
- Precio: 199 EUR/mes
- Copia el **Price ID**

#### 1.4 Configurar Webhook
1. Ve a https://dashboard.stripe.com/webhooks
2. Click en "Add endpoint"
3. URL del endpoint: `https://vendoya.es/api/stripe/webhook`
4. Selecciona estos eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copia el **Webhook Secret** (empieza con `whsec_`)

#### 1.5 Añadir variables en Vercel
```bash
# Opción 1: Por CLI
vercel env add STRIPE_SECRET_KEY production
# Pega tu sk_test_xxx o sk_live_xxx

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# Pega tu pk_test_xxx o pk_live_xxx

vercel env add STRIPE_WEBHOOK_SECRET production
# Pega tu whsec_xxx

vercel env add STRIPE_PRICE_BASICO production
# Pega el price_xxx del Plan Básico

vercel env add STRIPE_PRICE_PROFESIONAL production
# Pega el price_xxx del Plan Profesional

vercel env add STRIPE_PRICE_EMPRESAS production
# Pega el price_xxx del Plan Empresas
```

**Opción 2: Por Dashboard de Vercel**
1. Ve a https://vercel.com/borinkens-projects/vendoya-crm/settings/environment-variables
2. Añade cada variable manualmente

---

### **PASO 2: Activar Modo Producción en Stripe**

Cuando estés listo para cobrar de verdad:

1. Ve a https://dashboard.stripe.com/
2. Activa tu cuenta (completa verificación bancaria)
3. Cambia las keys de `test` a `live` en Vercel
4. Actualiza el webhook con las keys de producción

---

## 📊 ESTRUCTURA DEL PROYECTO

```
vendoya-crm/
├── app/
│   ├── login/page.tsx          # ✅ Login con Supabase
│   ├── signup/page.tsx         # ✅ Registro con creación de agencia
│   ├── pricing/page.tsx        # ✅ Página de planes
│   ├── privacy/page.tsx        # ✅ RGPD
│   ├── terms/page.tsx          # ✅ T&C
│   ├── cookies/page.tsx        # ✅ Cookies
│   ├── legal/page.tsx          # ✅ Aviso legal
│   ├── api/
│   │   ├── auth/logout/        # ✅ Cerrar sesión
│   │   └── stripe/
│   │       ├── checkout/       # ✅ Crear sesión de pago
│   │       └── webhook/        # ✅ Recibir eventos de Stripe
│   └── dashboard/              # ✅ Protegido con middleware
├── middleware.ts               # ✅ Protección de rutas
├── lib/stripe.ts               # ✅ Configuración de Stripe
└── components/Sidebar.tsx      # ✅ Con botón logout
```

---

## 🎯 FLUJO DE USUARIO

### Nuevo Usuario:
1. Visita https://vendoya.es
2. Click en "Empezar Gratis" → `/signup`
3. Completa formulario (crea agencia automáticamente)
4. Redirigido a `/dashboard` (14 días de trial)
5. Para suscribirse: `/pricing` → selecciona plan → pago con Stripe
6. Webhook actualiza suscripción en BD

### Usuario Existente:
1. Visita https://vendoya.es/login
2. Ingresa credenciales
3. Accede al dashboard

---

## 🔐 SEGURIDAD IMPLEMENTADA

- ✅ Contraseñas hasheadas por Supabase
- ✅ Middleware protege rutas de dashboard
- ✅ JWT tokens para sesiones
- ✅ HTTPS/SSL en producción
- ✅ Variables de entorno protegidas
- ✅ Webhook signature verification (Stripe)
- ✅ RGPD compliant

---

## 🧪 TESTING

### Probar Autenticación:
```bash
# 1. Crear usuario de prueba
# Ve a /signup y crea una cuenta con tu email

# 2. Verificar que se creó en Supabase
# Dashboard → Authentication → Users

# 3. Probar login
# /login con las mismas credenciales

# 4. Verificar protección de rutas
# Intenta acceder a /dashboard sin login → redirige a /login
```

### Probar Stripe (modo test):
```bash
# 1. Ve a /pricing
# 2. Selecciona un plan
# 3. Usa tarjeta de prueba: 4242 4242 4242 4242
#    - Fecha: cualquier futura
#    - CVC: cualquier 3 dígitos
#    - ZIP: cualquier código
# 4. Completa pago → debe redirigir a dashboard
```

---

## 📦 DEPLOYMENT

### Variables de Entorno en Producción:

**Ya configuradas:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_MASTER_KEY`
- `CRON_SECRET`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://vendoya.es`

**Por configurar (Stripe):**
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASICO`
- `STRIPE_PRICE_PROFESIONAL`
- `STRIPE_PRICE_EMPRESAS`

### Hacer Deployment:
```bash
# Automático con push a GitHub
git push origin main

# O manual
vercel --prod
```

---

## 📝 PRÓXIMOS PASOS RECOMENDADOS

### Corto plazo (1-2 días):
1. ✅ Configurar Stripe (PASO 1 arriba)
2. ⏳ Crear usuarios de prueba
3. ⏳ Probar flujo completo de registro → pago
4. ⏳ Customizar emails de bienvenida (Supabase)

### Medio plazo (1 semana):
5. ⏳ Añadir Google Analytics
6. ⏳ Configurar Sentry para error tracking
7. ⏳ Crear página de FAQ
8. ⏳ Blog/recursos para SEO

### Largo plazo (1 mes):
9. ⏳ Programa de referidos
10. ⏳ Sistema de onboarding
11. ⏳ Portal de facturación para clientes
12. ⏳ App móvil (PWA)

---

## 🆘 TROUBLESHOOTING

### Error: "No session" en dashboard
**Solución:** El usuario no está logueado. Redirigir a `/login`

### Error: "Stripe not configured"
**Solución:** Faltan variables de entorno de Stripe en Vercel

### Error: Build failed
**Solución:** Verificar que `.npmrc` existe con `legacy-peer-deps=true`

### Error: Webhook failed
**Solución:** 
1. Verificar que el webhook secret es correcto
2. Verificar que la URL es `https://vendoya.es/api/stripe/webhook`
3. Ver logs en Dashboard de Stripe

---

## 📞 SOPORTE

- **Email:** info@vendoya.es
- **Dashboard Vercel:** https://vercel.com/borinkens-projects/vendoya-crm
- **Dashboard Supabase:** https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq
- **Dashboard Stripe:** https://dashboard.stripe.com/

---

## ✅ CHECKLIST PRE-LANZAMIENTO

- [x] Dominio vendoya.es configurado
- [x] SSL activo
- [x] Autenticación funcionando
- [x] Páginas legales publicadas
- [ ] Stripe configurado y probado
- [ ] Google Analytics añadido
- [ ] Email de bienvenida customizado
- [ ] Al menos 5 usuarios de prueba
- [ ] Landing page optimizada para conversión
- [ ] FAQ section
- [ ] Botón de chat/soporte

---

**Última actualización:** Mayo 13, 2026  
**Estado:** 🟢 LISTO PARA CONFIGURAR STRIPE
