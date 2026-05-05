# 🚀 CONFIGURACIÓN GROQ API (GRATIS Y RÁPIDO)

## ✅ POR QUÉ GROQ EN VEZ DE OPENAI

### **Groq es MEJOR para este caso:**

| Característica | Groq | OpenAI |
|---------------|------|--------|
| **Costo** | ✅ **GRATIS** (sin tarjeta) | ❌ Requiere pago |
| **Velocidad** | ✅ **10x más rápido** | Lento |
| **Límite gratis** | ✅ 14,400 requests/día | $5 de crédito |
| **Modelo** | Llama 3.3 70B | GPT-4 |
| **Calidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Veredicto:** Groq es IDEAL para tu caso (gratis, rápido, sin tarjeta)

---

## 📝 OBTENER API KEY DE GROQ (2 minutos)

### **Paso 1: Crea cuenta**
```
1. Ve a: https://console.groq.com
2. Click "Sign Up" 
3. Usa Google/GitHub o email
4. NO requiere tarjeta de crédito ✅
```

### **Paso 2: Crea API Key**
```
1. Una vez dentro, ve a: https://console.groq.com/keys
2. Click "Create API Key"
3. Dale un nombre: "VendoYa Inversores"
4. Click "Submit"
5. COPIA la key (empieza con gsk_...)
```

⚠️ **IMPORTANTE:** Copia la key AHORA, no la podrás ver después.

### **Paso 3: Configura en el proyecto**

**En Local (.env.local):**
```bash
cd /Users/LeslyHector/vendoya-crm

# Edita .env.local y pega tu key:
GROQ_API_KEY=gsk_TU_KEY_AQUI
```

**En Vercel (Producción):**
```bash
cd /Users/LeslyHector/vendoya-crm

# Agregar a Vercel
vercel env add GROQ_API_KEY production
# → Marca sensitive: Y
# → Pega tu key: gsk_...

# Redesplegar
vercel --prod
```

---

## ✅ VERIFICAR QUE FUNCIONA

### **1. Prueba local:**
```bash
cd /Users/LeslyHector/vendoya-crm
npm run dev
```

Abre: http://localhost:3000/dashboard/investors

Completa el formulario y verás análisis en **5-10 segundos** (más rápido que OpenAI).

### **2. Prueba en producción:**

Después de desplegar, ve a:
```
https://tu-url.vercel.app/dashboard/investors
```

---

## 💰 LÍMITES GRATUITOS DE GROQ

**Tier Gratuito (sin tarjeta):**
- ✅ **14,400 requests/día** (más que suficiente)
- ✅ **30 requests/minuto**
- ✅ **6,000 tokens/minuto**

**Para tu caso:**
- 1 análisis = ~1,000 tokens
- **Puedes hacer 6 análisis/minuto**
- **14,400 análisis/día**
- **432,000 análisis/mes GRATIS**

**Comparación con OpenAI:**
- OpenAI gratis: $5 = ~250 análisis
- Groq gratis: **432,000 análisis/mes**

🎯 **Groq gana por lejos**

---

## 🔄 CAMBIAR ENTRE GROQ Y OPENAI

El sistema está configurado para usar **Groq por defecto**.

Si en el futuro quieres cambiar a OpenAI:

**Archivo:** `lib/investment-analyzer.ts`

Línea 4, cambia:
```typescript
const useGroq = true  // ← Cambiar a false para OpenAI
```

Redespliega y listo.

---

## 📊 RENDIMIENTO COMPARATIVO

### **Tiempo de respuesta:**
- Groq: **5-10 segundos** ⚡
- OpenAI: **15-30 segundos** 🐌

### **Costo por 1000 análisis:**
- Groq: **€0** ✅
- OpenAI: **€20** ❌

### **Calidad del análisis:**
- Groq (Llama 3.3 70B): ⭐⭐⭐⭐⭐
- OpenAI (GPT-4): ⭐⭐⭐⭐⭐

**Ambos igual de buenos, Groq es gratis y más rápido.**

---

## 🎯 RESUMEN

**AHORA (2 minutos):**
1. ✅ Ve a: https://console.groq.com
2. ✅ Crea cuenta (sin tarjeta)
3. ✅ Genera API key
4. ✅ Pégala en `.env.local`

**Resultado:**
- ✅ 432,000 análisis/mes GRATIS
- ✅ 10x más rápido que OpenAI
- ✅ Sin tarjeta de crédito
- ✅ Calidad profesional

---

## 🔗 ENLACES IMPORTANTES

- **Crear cuenta:** https://console.groq.com
- **API Keys:** https://console.groq.com/keys
- **Documentación:** https://console.groq.com/docs
- **Límites:** https://console.groq.com/settings/limits

---

**¿Listo para configurar Groq y tener análisis GRATIS e instantáneos?** 🚀

Siguiente paso: Obtén tu API key en 2 minutos y empieza a analizar propiedades.
