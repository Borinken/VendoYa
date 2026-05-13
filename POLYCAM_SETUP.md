# 🎬 Configuración de Polycam para Tours 3D

## ¿Qué es Polycam?

Polycam es una plataforma de captura y procesamiento 3D que ofrece:
- **Plan FREE**: 10 scans 3D al mes (suficiente para empezar)
- Procesamiento en la nube (no necesitas GPU)
- API fácil de usar
- Exportación en formatos: .splat, .ply, .glb, .obj

## 📋 Pasos para Configurar

### 1. Crear Cuenta en Polycam

1. Ve a [https://poly.cam](https://poly.cam)
2. Haz clic en "Sign Up" (Registrarse)
3. Usa tu email y crea una contraseña
4. **Plan FREE**: 10 scans/mes gratis ✅
5. No necesitas agregar tarjeta de crédito

### 2. Obtener API Key

1. Inicia sesión en [https://poly.cam](https://poly.cam)
2. Ve a **Settings** (Configuración)
3. Haz clic en **API Keys**
4. Clic en "Create New API Key"
5. Dale un nombre: `VendoYa CRM`
6. Copia la API Key que aparece (empieza con `pk_...`)

⚠️ **IMPORTANTE**: Guarda esta key en un lugar seguro. Solo se muestra una vez.

### 3. Configurar Variables de Entorno

Agrega la API Key a tu archivo `.env.local`:

```bash
# Polycam API (Tours 3D)
POLYCAM_API_KEY=pk_tu_api_key_aqui
```

### 4. Verificar Instalación

Una vez configurado:

1. Ve al dashboard: **🎬 Tours 3D**
2. Selecciona una propiedad
3. Sube 20-100 fotos
4. Haz clic en "Procesar Tour 3D"
5. El procesamiento toma **10-30 minutos**

## 📊 Límites del Plan Free

| Característica | Plan Free |
|----------------|-----------|
| Scans por mes | **10** |
| Fotos por scan | Hasta 500 |
| Calidad | Alta |
| Formatos export | Todos (.splat, .ply, .glb) |
| API Access | ✅ Sí |
| Soporte | Email |

Si necesitas más de 10 tours al mes, puedes:
- Esperar al siguiente mes (se reinicia)
- Actualizar a plan Pro ($15/mes, scans ilimitados)

## 🔄 Webhook para Notificaciones (Opcional)

Polycam puede enviarte una notificación cuando el procesamiento termine:

1. En Polycam Dashboard → **Webhooks**
2. Agrega esta URL: `https://tu-dominio.vercel.app/api/polycam/webhook`
3. Selecciona evento: `capture.completed`
4. Guarda el **Webhook Secret**

Agrega a `.env.local`:
```bash
POLYCAM_WEBHOOK_SECRET=whsec_tu_secret_aqui
```

## 🎯 Cómo Funciona el Flujo

1. **Usuario sube fotos** (20-100 imágenes)
2. **API envía fotos a Polycam** (`POST /api/properties/process-3d-tour`)
3. **Polycam procesa** (10-30 minutos en la nube)
4. **Webhook notifica** cuando termina (opcional)
5. **Usuario ve tour 3D** en el visor

## 🆘 Solución de Problemas

### Error: "Invalid API Key"
- Verifica que copiaste la key completa
- La key debe empezar con `pk_`
- Reinicia el servidor Next.js

### Error: "Rate limit exceeded"
- Has alcanzado el límite de 10 scans/mes
- Espera al siguiente mes
- O actualiza a plan Pro

### Procesamiento muy lento
- Normal: 10-30 minutos para 50-100 fotos
- Depende de la cantidad de fotos
- Revisa el status en Polycam Dashboard

## 🔗 Links Útiles

- [Polycam Website](https://poly.cam)
- [Polycam API Docs](https://docs.poly.cam/api)
- [Pricing Plans](https://poly.cam/pricing)
- [Support](https://poly.cam/support)

## 💡 Tips para Mejores Resultados

### Al tomar fotos:
- **Superposición**: 60-80% entre fotos consecutivas
- **Iluminación**: Uniforme, sin sombras fuertes
- **Cantidad**: 50-100 fotos ideales
- **Ángulos**: Varía altura y posición
- **Estabilidad**: Evita fotos borrosas

### Propiedades ideales:
- Espacios con buena iluminación natural
- Evitar superficies reflectantes (espejos)
- Evitar objetos en movimiento
- Capturar todo el espacio uniformemente

## 🎓 Ejemplo de Uso en Código

```typescript
// Ya implementado en: app/api/properties/process-3d-tour/route.ts

const response = await fetch('/api/properties/process-3d-tour', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    propertyId: 'uuid-propiedad',
    photos: [
      { url: 'https://...', fileName: 'foto1.jpg', index: 0 },
      // ... más fotos
    ]
  })
});

const result = await response.json();
console.log(result.captureId); // ID para tracking
```

---

**¿Necesitas ayuda?** Revisa la [documentación completa](./GUIA_TOURS_3D.md) o contacta soporte.
