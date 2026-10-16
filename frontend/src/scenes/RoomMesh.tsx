import React, { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Espacio } from '../types/domain'

interface RoomMeshProps {
  espacio: Espacio
  isSelected: boolean
  onSelect: (espacio: Espacio) => void
}

export const RoomMesh: React.FC<RoomMeshProps> = ({ espacio, isSelected, onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Color según estado
  const statusColor = {
    disponible: '#10B981', // Verde esmeralda
    mantenimiento: '#F59E0B', // Ámbar
    inhabilitado: '#EF4444' // Carmesí / Rojo
  }[espacio.estado]

  // Animación suave de flotación / pulso cuando tiene incidencia crítica
  useFrame((state) => {
    if (!meshRef.current) return
    if (espacio.estado === 'inhabilitado') {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.02
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group position={espacio.coordenadas3D}>
      {/* Malla principal de la sala */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(espacio)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={espacio.dimensiones3D} />
        <meshStandardMaterial
          color={hovered || isSelected ? statusColor : '#1E293B'}
          transparent
          opacity={hovered ? 0.85 : isSelected ? 0.9 : 0.65}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>

      {/* Borde sutil / Wireframe exterior */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...espacio.dimensiones3D)]} />
        <lineBasicMaterial
          color={isSelected ? '#00F2FE' : hovered ? '#38BDF8' : statusColor}
          linewidth={isSelected ? 2 : 1}
        />
      </lineSegments>

      {/* Baliza de luz superior según estado */}
      <mesh position={[0, espacio.dimensiones3D[1] / 2 + 0.15, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>
      <pointLight
        position={[0, espacio.dimensiones3D[1] / 2 + 0.25, 0]}
        color={statusColor}
        intensity={espacio.estado === 'inhabilitado' ? 2.5 : 1.2}
        distance={2.5}
      />

      {/* Tooltip 3D con Drei Html */}
      {(hovered || isSelected) && (
        <Html
          position={[0, espacio.dimensiones3D[1] / 2 + 0.6, 0]}
          center
          distanceFactor={10}
        >
          <div className="pointer-events-none px-3 py-1.5 rounded-lg glass-panel border border-slate-700 text-white shadow-xl min-w-[130px] text-center">
            <p className="text-[11px] font-bold tracking-tight text-white">{espacio.nombre}</p>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              <span className="text-[10px] font-mono text-slate-300 capitalize">
                {espacio.estado} · Cap: {espacio.capacidad}
              </span>
            </div>
            {espacio.incidenciaActivaId && (
              <span className="block mt-1 text-[9px] font-bold text-rose-400 bg-rose-950/70 rounded px-1">
                RN-04 BLOQUEADO
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}
