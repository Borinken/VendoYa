'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { Loader2 } from 'lucide-react'

interface GaussianSplatViewerProps {
  splatUrl: string
  className?: string
}

// Componente para cargar y renderizar el splat
function SplatMesh({ url }: { url: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Aquí cargaríamos el archivo .splat o .ply
    // Por ahora mostramos un placeholder
    setLoading(false)
  }, [url])

  useFrame((state) => {
    if (meshRef.current) {
      // Animación suave si es necesario
      meshRef.current.rotation.y += 0.001
    }
  })

  if (loading) {
    return null
  }

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#4ade80" />
    </mesh>
  )
}

export default function GaussianSplatViewer({ 
  splatUrl, 
  className = '' 
}: GaussianSplatViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Cargando tour 3D...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center px-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [5, 2, 5], fov: 50 }}
        onCreated={() => setIsLoading(false)}
        className="w-full h-full"
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        
        <SplatMesh url={splatUrl} />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={20}
        />
        
        <Environment preset="apartment" />
      </Canvas>

      {/* Controles de UI */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="text-white text-xs font-medium">
          🖱️ Click + Arrastrar para rotar • Scroll para zoom
        </p>
      </div>
    </div>
  )
}
