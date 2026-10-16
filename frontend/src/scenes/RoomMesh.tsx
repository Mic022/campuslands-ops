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
  const beaconRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Paleta holográfica según estado
  const statusColors = {
    disponible: {
      base: '#00FF9D',
      emissive: '#00FF9D',
      line: '#00F5FF',
      hex: '#00FF9D'
    },
    mantenimiento: {
      base: '#FFB703',
      emissive: '#FFB703',
      line: '#FFB703',
      hex: '#FFB703'
    },
    inhabilitado: {
      base: '#FF2A55',
      emissive: '#FF2A55',
      line: '#FF2A55',
      hex: '#FF2A55'
    }
  }[espacio.estado]

  const dim = espacio.dimensiones3D || [2.5, 1.2, 2.2]
  const pos = espacio.coordenadas3D || [0, 0.6, 0]

  // Animación del pulso holográfico y la baliza
  useFrame((state) => {
    const time = state.clock.elapsedTime
    if (beaconRef.current) {
      beaconRef.current.position.y = (dim[1] / 2) + 0.25 + Math.sin(time * 3) * 0.08
    }

    if (meshRef.current) {
      if (espacio.estado === 'inhabilitado') {
        const pulse = 1 + Math.sin(time * 5) * 0.025
        meshRef.current.scale.set(pulse, pulse, pulse)
      } else if (hovered) {
        meshRef.current.scale.set(1.02, 1.02, 1.02)
      } else {
        meshRef.current.scale.set(1, 1, 1)
      }
    }
  })

  return (
    <group position={pos}>
      {/* Malla volumétrica de la sala */}
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
        <boxGeometry args={dim} />
        <meshPhysicalMaterial
          color={hovered || isSelected ? statusColors.base : '#0A1226'}
          emissive={statusColors.emissive}
          emissiveIntensity={hovered || isSelected ? 0.45 : espacio.estado === 'inhabilitado' ? 0.35 : 0.08}
          transparent
          opacity={hovered ? 0.85 : isSelected ? 0.9 : 0.65}
          roughness={0.15}
          metalness={0.7}
          clearcoat={0.6}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Aristas Neón Iridiscentes */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...dim)]} />
        <lineBasicMaterial
          color={isSelected ? '#00F5FF' : hovered ? '#FFFFFF' : statusColors.line}
          linewidth={isSelected ? 2 : 1}
          transparent
          opacity={isSelected ? 1 : 0.75}
        />
      </lineSegments>

      {/* Baliza Holográfica Levitante */}
      <mesh ref={beaconRef} position={[0, dim[1] / 2 + 0.25, 0]}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color={statusColors.hex} wireframe={false} />
      </mesh>

      {/* Punto de Luz Focal */}
      <pointLight
        position={[0, dim[1] / 2 + 0.35, 0]}
        color={statusColors.hex}
        intensity={espacio.estado === 'inhabilitado' ? 3.5 : hovered ? 2.5 : 1.4}
        distance={3.2}
      />

      {/* Tooltip Drei HTML Futurista */}
      {(hovered || isSelected) && (
        <Html
          position={[0, dim[1] / 2 + 0.8, 0]}
          center
          distanceFactor={10}
        >
          <div className="pointer-events-none px-3.5 py-2 rounded-xl holo-panel text-white shadow-2xl min-w-[150px] text-center border border-white/20">
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 block uppercase">
              {espacio.id} · PISO {espacio.piso ?? 1}
            </span>
            <p className="text-xs font-extrabold text-white mt-0.5 leading-snug">
              {espacio.nombre}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColors.hex, boxShadow: `0 0 10px ${statusColors.hex}` }}
              />
              <span className="text-[10px] font-mono capitalize text-slate-300">
                {espacio.estado} · Cap: {espacio.capacidad}
              </span>
            </div>
            {espacio.incidenciaActivaId && (
              <span className="inline-block mt-1 text-[9px] font-mono font-bold text-rose-400 bg-rose-950/90 border border-rose-500/50 px-1.5 py-0.5 rounded">
                ⚠ RN-04 BLOQUEADO
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}
