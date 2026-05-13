-- Tabla para almacenar tours 3D de propiedades
CREATE TABLE IF NOT EXISTS property_3d_tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- URLs de archivos
  splat_file_url TEXT, -- Archivo .splat o .ply procesado
  preview_image_url TEXT, -- Imagen de previsualización
  
  -- Metadata
  photo_count INTEGER NOT NULL,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_error TEXT,
  
  -- Estadísticas del tour
  file_size_mb DECIMAL(10,2),
  quality_score DECIMAL(3,2), -- 0.00 a 1.00
  view_count INTEGER DEFAULT 0,
  
  -- Control
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabla para almacenar las fotos originales usadas para crear el tour
CREATE TABLE IF NOT EXISTS property_3d_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID REFERENCES property_3d_tours(id) ON DELETE CASCADE,
  
  -- Información de la foto
  photo_url TEXT NOT NULL,
  photo_index INTEGER NOT NULL, -- Orden de la foto
  file_size_kb INTEGER,
  width INTEGER,
  height INTEGER,
  
  -- Metadata EXIF
  camera_model TEXT,
  taken_at TIMESTAMPTZ,
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_3d_tours_property ON property_3d_tours(property_id);
CREATE INDEX idx_3d_tours_status ON property_3d_tours(processing_status);
CREATE INDEX idx_3d_photos_tour ON property_3d_photos(tour_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_3d_tour_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_3d_tour_updated_at
  BEFORE UPDATE ON property_3d_tours
  FOR EACH ROW
  EXECUTE FUNCTION update_3d_tour_updated_at();

-- Vista para obtener tours con información de propiedad
CREATE OR REPLACE VIEW property_3d_tours_view AS
SELECT 
  t.id,
  t.property_id,
  t.splat_file_url,
  t.preview_image_url,
  t.photo_count,
  t.processing_status,
  t.file_size_mb,
  t.quality_score,
  t.view_count,
  t.created_at,
  p.title AS property_title,
  p.city AS property_city,
  p.data->>'address' AS property_address,
  COUNT(ph.id) AS uploaded_photos
FROM property_3d_tours t
LEFT JOIN properties p ON t.property_id = p.id
LEFT JOIN property_3d_photos ph ON t.id = ph.tour_id
GROUP BY t.id, p.id, p.title, p.city, p.data;

COMMENT ON TABLE property_3d_tours IS 'Almacena tours 3D creados con Gaussian Splatting para propiedades inmobiliarias';
COMMENT ON TABLE property_3d_photos IS 'Fotos originales usadas para generar los tours 3D';
