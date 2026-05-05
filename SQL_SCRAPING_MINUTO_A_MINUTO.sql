-- ========================================
-- CONFIGURACIÓN SCRAPING MINUTO A MINUTO
-- Ejecutar en: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new
-- ========================================

-- Habilitar auto-sync y configurar intervalo de 1 minuto
INSERT INTO system_config (config_key, config_value, description, updated_at) VALUES
('auto_sync_properties', 'true', 'Sincronización automática de propiedades habilitada', NOW()),
('sync_interval_minutes', '1', 'Intervalo de sincronización en minutos (1 = cada minuto)', NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar configuración
SELECT config_key, config_value, description 
FROM system_config 
WHERE config_key IN ('auto_sync_properties', 'sync_interval_minutes')
ORDER BY config_key;
