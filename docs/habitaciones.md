# Habitaciones (módulo de VendoYa)

App para gestionar alquiler por habitaciones: pisos, contratos con PDF, inventario con fotos, cobros, suministros, incidencias, permisos (gestión y subarriendo), soporte y portal del inquilino. Vive aislada en `app/habitaciones/app/**`, `components/hab/**`, `lib/hab/**` y tablas `hab_*`. No modifica nada existente de VendoYa (solo se añadieron dependencias a `package.json`).

Rutas: `/habitaciones/app/login`, `/registro`, panel (`/habitaciones/app/...`), portal público del inquilino `/habitaciones/t/<token>`, acceso demo `/habitaciones/app/demo`.

## 1. Lo que debe hacer Héctor, en este orden
1. **Supabase > Authentication > Providers > Email**: activa **Confirm email** (las invitaciones comprueban el correo confirmado).
2. **Supabase > SQL Editor**: abre `supabase/migrations/habitaciones_ALL.sql` (es 001 + 002 + 003 en el orden correcto), pégalo ENTERO y ejecútalo **una sola vez**. Los tres archivos sueltos (`habitaciones_001.sql`, `habitaciones_002_candidatos.sql`, `habitaciones_003_cierre.sql`) tienen el mismo contenido por si prefieres ir paso a paso. Si da error, copia el mensaje y no sigas.
   Validado contra una base Supabase local limpia: se aplica sin errores (35 tablas, catálogo de 18 cláusulas, 2 buckets privados), es re-ejecutable, y pasan 113 pruebas SQL de RLS y 11 del `supabaseRepo` (ver `scripts/dev/hab-rls/LEEME.md`).
3. **Regístrate** en `https://vendoya.es/habitaciones/app/registro` con tu correo (y confírmalo). Después, en Authentication > Users copia tu `user_id` y ejecuta en el SQL Editor, sustituyendo el marcador:
   `insert into hab_platform_admins (user_id) values ('TU_USER_ID');`
   (Sin esa fila nadie es administrador de plataforma; no hay credenciales fijas.)
4. **Vercel > Project > Settings > Environment Variables** (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (esta última solo en servidor; sin ella no suben fotos ni documentos los enlaces públicos ni se vacían los ficheros borrados). **No** pongas `NEXT_PUBLIC_HAB_DEMO`: en producción se ignora y avisa. Redespliega.
5. **Email automático del contrato firmado (opcional, recomendado)** con Resend:
   1. Crea una cuenta gratuita en resend.com.
   2. Resend > Domains > Add Domain: `vendoya.es`. Resend te da registros DNS (SPF, DKIM y opcionalmente DMARC): añádelos en el panel DNS de tu dominio y pulsa «Verify» hasta que salga *Verified*.
   3. Resend > API Keys > Create API Key (permiso «Sending access»). Copia la clave (empieza por `re_`).
   4. Vercel > Environment Variables (Production): `RESEND_API_KEY` = esa clave y `HAB_MAIL_FROM` = `Vendoya <contacto@vendoya.es>` (dirección del dominio verificado en Resend; recibe por reenvío ImprovMX). Opcional: `NEXT_PUBLIC_SITE_URL` = `https://vendoya.es`. Redespliega.
   5. Prueba: firma un contrato de ejemplo con dos correos tuyos y mira que llegan; en Contratos > Firma electrónica verás «enviado» o «fallido» por parte.
   Sin estas variables todo funciona igual, pero el contrato firmado no se envía solo por email: cada firmante ve «Descargar contrato» y «Enviar por WhatsApp», y el propietario usa «Reenviar a las partes» en Contratos. Tampoco se pide el código de 6 dígitos (se firma con enlace único + consentimiento).
6. **Prueba con dos cuentas** (dueño y otra distinta) que cada una solo ve lo suyo; crea un enlace de inquilino y ábrelo en una ventana privada.
7. Opcional, limpieza programada: llama a `POST https://vendoya.es/habitaciones/cleanup` desde un cron (p. ej. Vercel Cron) cada hora, y programa `select hab_purge_applications()` con pg_cron (comentado en la 002; no está activado).
8. **Aviso sobre algo ajeno al módulo:** `app/api/credentials/route.ts` (existente) guarda y lee credenciales con service_role SIN comprobar sesión: cualquiera que conozca la URL puede escribir en `system_config`. No lo toqué salvo para que el build no falle sin variables; conviene protegerlo antes de abrir el sitio.

## 2. Variables de entorno (solo nombres)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: las mismas que ya usa VendoYa.
- `SUPABASE_SERVICE_ROLE_KEY`: solo servidor. Se usa únicamente en `lib/hab/server-admin.ts`, llamado desde: subida de fotos del inquilino (`t/[token]/upload`), descarga del contrato (`t/[token]/contract`), subida de documentos del candidato (`a/[token]/upload`) y vaciado de ficheros borrados (`cleanup`). Todas validan un token o solo procesan la cola ya marcada por la base de datos, y llevan límite de frecuencia.
- `RESEND_API_KEY`, `HAB_MAIL_FROM` (y opcional `NEXT_PUBLIC_SITE_URL`): solo servidor; envío automático de emails (código de firma y contrato sellado) con fetch directo a Resend, sin dependencia nueva. Opcionales.
- `NEXT_PUBLIC_HAB_DEMO=1`: solo para pruebas locales. Se ignora y lanza error claro si `NODE_ENV=production`.

## 3. Probar en demo (sin claves)
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-local NEXT_PUBLIC_HAB_DEMO=1 npm run dev -- -p 3010
```
Abre `/habitaciones/app/login` y pulsa «Entrar como administrador (demo)» (o `/habitaciones/app/demo`). Banner fijo «Modo demo: datos de ejemplo» con cambio entre Propietario, Inmobiliaria, Subarrendador, Inquilino y Administrador. «Reiniciar datos» restaura el ejemplo. Enlace de inquilino de demostración: `/habitaciones/t/demo-lucia`. Los datos viven en localStorage; el demo refleja las reglas de RLS (cada rol ve solo lo suyo). Comprobaciones puras: `npx tsx scripts/dev/hab-check.ts`.

## 4. Qué hay
Pestañas: Resumen, Pisos y habitaciones, Candidatos, Contratos (asistente por pasos, validadores DNI/NIE/CIF, anexos de inventario/fotos y condiciones, PDF A4 con pdf-lib, vista previa, descargar, imprimir, compartir por WhatsApp con Web Share o wa.me, subir firmado), Inquilinos (enlace personal, WhatsApp, QR), Inventario, Cobros, Suministros, Incidencias, Reportes (recharts + CSV anual), Avisos, Permisos y equipo, Ajustes (canal de inquilinos, exportar, borrar), Soporte (ticket + WhatsApp al +34 604 34 73 63, constante en `lib/hab/config.ts`), Vender, Plataforma (solo administrador; 404 si no lo eres) y la vista de Inquilino.

Dependencias añadidas a package.json: `pdf-lib`, `qrcode`, `@types/qrcode`. Cambios en archivos existentes (pedidos por Héctor): `app/login/page.tsx` (quitada la credencial fija admin/1234) y tres rutas existentes (`app/api/credentials`, `app/api/cron/sync-properties`, `app/api/scraping/secure`) donde el cliente de Supabase se crea al primer uso en vez de al importar el módulo, para que `npm run build` no falle sin variables de entorno.

## 5. Decisiones de diseño que conviene conocer
- **Incidencias privadas por organización**: una inmobiliaria con permiso de gestión NO ve las incidencias del propietario ni al revés (cumple «nunca compartido entre orgs»). Si prefieres compartirlas con quien gestiona el piso, es un cambio de una política (`hab_can_see_incident`).
- Un contrato/inventario/cobro solo es visible con acceso VIGENTE al piso: al revocar una concesión, el subarrendador deja de ver contratos, cobros, incidencias y suministros de ese piso.
- Tope de renta: solo aviso (RDL 29/2026, convalidación sin verificar), nunca bloqueo.
- Subarriendo: solo con concesión `sublet` en estado `granted`, con documento de consentimiento y tope (constraint en la base).
- Sin sexo ni nacionalidad en ningún campo, filtro o tabla; sin puntuación de personas (lo comprueba `hab-check.ts`).

## 6. Qué NO está verificado
- Las tres migraciones y `supabase-repo.ts` se validaron contra una base Supabase LOCAL (no contra tu proyecto en la nube): RLS con varias organizaciones, subarrendador antes y después de revocar, inquilino por token, tablas de solo inserción y catálogo de solo lectura. Aun así, haz la prueba con dos cuentas reales en tu proyecto.
- Subida de ficheros: solo valida tipo MIME declarado y tamaño; falta antivirus o validación de contenido.
- Borrado de ficheros: la base marca (`hab_storage_trash`) y `POST /habitaciones/cleanup` los quita de storage; hasta que se llame, los bytes siguen ahí.
- Incidencias privadas por organización (una inmobiliaria no ve las del propietario). Cambiar esto es una política (`hab_can_see_incident`).
- Sin firma electrónica (v1: imprimir, firmar a mano y subir foto o escaneo). **v2 prevista**: firma en pantalla (firma simple) con sello de fecha y evidencias (IP, agente, hash del PDF), sin construir.
- Pruebas: solo funciones puras (`hab-check.ts`) y recorridos manuales en navegador (modo demo).

**Cerrado en la migración 003:** plantillas de condiciones en base de datos, límite de frecuencia compartido en base de datos (`hab_rate_hit`), enlace seguro de solo lectura del contrato con descarga (caduca a 90 días y se revoca), página pública de la referencia (`/habitaciones/r/<token>`), corte de acceso a ficheros y a fichas de inquilino al revocar un permiso, y borrado de ficheros al borrar cuenta o solicitud.

## 6a. Firma electrónica simple (pendiente de revisión por abogado)
Es una **firma electrónica simple** (Reglamento UE 910/2014, art. 25). **No es firma cualificada** ni está validada por terceros; su valor probatorio queda sujeto a valoración judicial. Sigue existiendo la opción de imprimir, firmar a mano y subir el escaneo.
- Flujo: el propietario genera el PDF en el asistente (paso 8, «Preparar para firma en pantalla») y en Contratos > «Firma electrónica» crea un enlace por firmante (propietario/gestor e inquilino), válido 7 días, de un solo uso (solo se guarda el hash), con máximo 6 intentos por hora. Lo envía por WhatsApp (`wa.me`) o lo copia.
- El firmante abre `/habitaciones/f/<token>` (móvil primero): ve el contrato, marca «He leído y acepto», escribe su nombre, dibuja la firma y firma. Si hay email configurado en el servidor, además confirma con un código de 6 dígitos que se le envía por email.
- Cada firma se guarda en `hab_signatures` (solo insertar; sin permisos de actualizar ni borrar desde la app): nombre, fecha y hora UTC, IP, navegador, hash SHA-256 del documento, ruta de la imagen de la firma y el texto de consentimiento. Cuando firman todas las partes, el contrato pasa a `active` y se genera con pdf-lib el PDF sellado (hoja de firmas con las imágenes + hoja «Certificado de firma»), que queda en storage privado.
- Envío del contrato firmado: con Resend configurado, un email por parte (inquilino siempre; propietario solo si marca «Enviar copia automática a mi email» en Ajustes), con enlace de descarga de 30 días (regenerable) y el PDF adjunto si pesa menos de 5 MB; el envío se registra (enviado/fallido, sin contenido), se reintenta una vez y un fallo no bloquea la firma. Sin Resend: «Descargar contrato» y «Enviar por WhatsApp» en la pantalla final y «Reenviar a las partes» en Contratos. Si el email del inquilino falta en su ficha, se pide antes de crear el enlace.
- **WhatsApp 100 % automático** (que el contrato salga solo por WhatsApp) exige la API de WhatsApp Business, de pago: NO está hecho; es una mejora futura.
- **Para subir el nivel (mejora futura, no construido):** firma avanzada o cualificada con un prestador cualificado de servicios de confianza (por ejemplo Cl@ve, certificado de la FNMT o un proveedor cualificado del listado de la UE), sellado de tiempo cualificado, y revisión de un abogado sobre el valor probatorio y los textos.

## 6b. Pisos completos
`hab_properties.rental_mode` = `rooms` (por defecto) o `whole`. Un piso entero tiene una sola unidad (una fila de `hab_rooms` llamada «Piso entero», con un disparador que impide añadir más), así que contratos, inventario, cobros, incidencias y candidatos funcionan igual. El tope de renta solo aplica por habitaciones. El alta de piso pregunta «¿Lo alquilas por habitaciones o entero?» con «Por habitaciones» preseleccionado. La demo incluye «Cervantes 8, 4ºD (piso entero)».

## 7. Pendiente con abogado (no verificado)
Contenido y orden de las cláusulas (todas `reviewed_by_lawyer=false`; el PDF lleva marca de agua «BORRADOR · cláusulas pendientes de revisión por abogado»), causa y límites de duración del contrato de temporada, tope de renta (RDL 29/2026), referencia a la LAU o al Código Civil según el caso, penalización por falta de preaviso, fianza por comunidad (Andalucía: Ley 5/2025), **derechos de los inquilinos al vender un inmueble alquilado (incluido el alquiler por habitaciones)**, y base legal para pedir ingresos y nóminas a candidatos.

## 8. WhatsApp: fase 1 y fase 2
Dos canales distintos: (A) soporte de la plataforma, número de Héctor, solo para propietarios e inmobiliarias; (B) canal de inquilinos, con el número de cada organización (Ajustes). **Fase 1 (hecha)**: sin API; enlaces `wa.me` con mensaje prellenado y enlace personal con token (32 bytes, solo se guarda el hash, caducidad 90 días, revocable y regenerable).

**Fase 2 (NO construida)**: WhatsApp Cloud API con webhook de entrada que identifique al inquilino por su teléfono (`hab_tenants.phone`) y cree la incidencia automáticamente, con respuesta marcada como «asistente automático». Requiere cuenta Meta Business verificada, plantillas aprobadas, número dedicado y coste por conversación.
- Pros frente a la fase 1: el inquilino escribe desde su chat de siempre, sin enlace; alta automática de incidencias; respuestas inmediatas.
- Contras: coste por conversación, verificación y plantillas de Meta, número dedicado, riesgo de identificar mal a quien escribe desde otro teléfono, más RGPD (tratamiento por Meta), mantenimiento del webhook.

## 9. Candidatos (Fase 5)
Migración aparte: `supabase/migrations/habitaciones_002_candidatos.sql` (ejecutar DESPUÉS de la 001, a mano; NO aplicada). Si no está aplicada, la pestaña queda vacía sin romper el resto.
- Pestaña **Candidatos** (propietario/gestor): criterios publicados por habitación (documentos que se piden + texto objetivo visible para el candidato), enlace de solicitud por habitación (14 días, token de 32 bytes con solo el hash guardado), ficha con respuestas declaradas, documentos con casilla manual «documento visto y coherente» (con fecha y autor), «contacto verificado» manual (no se usan servicios externos de verificación), comparación lado a lado solo de datos declarados y en el mismo orden, **Aprobar y crear contrato** (crea inquilino y contrato en borrador y elimina los datos de la solicitud que ya no hacen falta), **Rechazar** con motivo de lista neutra (documentación incompleta, no cumple los criterios publicados, fechas no encajan, otra candidatura seleccionada) y nota libre, registro de cada decisión en `hab_audit_log`, borrado inmediato y mensaje de resultado en texto neutro por `wa.me`. Aviso fijo: «Decide siempre una persona. Aplica los mismos criterios a todos los candidatos. No uses sexo, nacionalidad ni otras características protegidas.»
- Ruta pública **/habitaciones/a/[token]** (sin login): formulario por pasos (móvil primero) con borrador guardable, criterios y responsable de los datos visibles, consentimiento con casilla SIN marcar y subida de documentos (route handler con `service_role` solo en servidor tras validar el token). Enlace demo: `/habitaciones/a/demo-cand`.
- Solo preguntas neutras y verificables. **No se pregunta ni se guarda**: sexo, nacionalidad, origen, religión, estado civil, hijos o embarazo, salud o discapacidad, orientación u opiniones, fecha de nacimiento ni DNI (estos dos solo al completar el contrato tras aprobar). La base impone una lista blanca de claves de respuesta (`hab_application_save`) y `hab-check.ts` falla si aparece algún campo prohibido en el esquema, el SQL, el formulario o el panel.
- Retención: `retention_until` = 90 días tras rechazo, retirada o expiración; `hab_purge_applications()` borra lo vencido (programable con pg_cron, comentado y NO activado). Los ficheros de storage de solicitudes borradas hay que retirarlos aparte.
- No compartido entre organizaciones: RLS por org y acceso vigente a la habitación.
- Referencias de arrendador anterior: el propietario pide la referencia con un enlace propio y el arrendador anterior responde en `/habitaciones/r/<token>` (tiempo de alquiler, puntualidad, estado del inmueble y comentario breve; la base solo admite esas claves). Enlace demo: `/habitaciones/r/demo-ref`.
- **Por qué no hay puntuación ni ranking automático**: decidir sobre el acceso a una vivienda con tratamiento automatizado entra en el art. 22 del RGPD (decisiones individuales automatizadas) y los sistemas de IA que evalúan el acceso a servicios esenciales como la vivienda se consideran de alto riesgo en el Reglamento europeo de IA (anexo III, 5(b)). Para hacer otra cosa haría falta una evaluación de impacto (EIPD), base legal y revisión de un abogado. **Sin verificar con abogado**: la base legal de pedir ingresos y nóminas.

## 10. Vender
Pestaña ligera: formulario corto por piso guardado en `hab_sale_interests` (RLS por organización; lectura para el administrador de plataforma), enlaces a `/vende-rapido` y `/vende-rapido/valoracion` (sin tocarlas) y WhatsApp a soporte con nombre del piso, ciudad y plazo (sin datos personales). Aviso fijo: «Si vendes un inmueble con inquilinos, los contratos en vigor pueden afectar a la venta; consulta con un abogado. Cualquier valoración es orientativa.» Sin precio ni valoración automáticos.
