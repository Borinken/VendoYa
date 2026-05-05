-- =====================================================
-- CONFIGURACIÓN DE TWILIO WHATSAPP
-- =====================================================
-- Ejecuta este script en Supabase SQL Editor
-- O ingresa estos valores manualmente en /dashboard/config

-- Tus credenciales de Twilio:
-- Account SID: ACc3e5774a1190b865c73ad5e03c25f883
-- Auth Token: [Tu Auth Token - no lo compartas públicamente]
-- WhatsApp Number: whatsapp:+14155238886
-- Tu número: +34604347363

-- Insertar o actualizar credenciales
INSERT INTO system_config (config_key, config_value, is_encrypted, description) 
VALUES 
  ('twilio_account_sid', 'ACc3e5774a1190b865c73ad5e03c25f883', true, 'Twilio Account SID'),
  ('twilio_auth_token', '', true, 'Twilio Auth Token - INGRESAR MANUALMENTE'),
  ('twilio_whatsapp_number', 'whatsapp:+14155238886', false, 'Número de WhatsApp de Twilio'),
  ('default_recipient_whatsapp', 'whatsapp:+34604347363', false, 'Tu número de WhatsApp para notificaciones')
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- =====================================================
-- CONTENT TEMPLATES DISPONIBLES
-- =====================================================
-- Para usar templates, guarda estos ContentSid en la configuración:

INSERT INTO system_config (config_key, config_value, is_encrypted, description) 
VALUES 
  ('whatsapp_template_appointment', 'HXb5b62575e6e4ff6129ad7c8efe1f983e', false, 'Template: Appointment Reminders - Variables: date, time'),
  ('whatsapp_template_properties', '', false, 'Template personalizado para propiedades - Crear en Twilio'),
  ('whatsapp_template_welcome', '', false, 'Template de bienvenida - Crear en Twilio')
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- =====================================================
-- INSTRUCCIONES
-- =====================================================
-- 1. Copia tu Auth Token de Twilio Console
-- 2. Ve a: https://vendoya-rkfk24ifj-borinkens-projects.vercel.app/dashboard/config
-- 3. Pega el Auth Token en el campo correspondiente
-- 4. Guarda los cambios
-- 5. ¡Listo para enviar WhatsApp!

-- Para probar manualmente desde terminal:
-- curl -X POST https://vendoya-rkfk24ifj-borinkens-projects.vercel.app/api/whatsapp/send \
--   -H "Content-Type: application/json" \
--   -d '{"phone": "+34604347363", "message": "🏠 Prueba desde Vendoya CRM"}'
