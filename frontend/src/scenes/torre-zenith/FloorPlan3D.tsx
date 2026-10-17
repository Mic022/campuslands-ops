import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, PerformanceMonitor } from '@react-three/drei'
import { SALAS_GEOMETRIA } from '../../data/torreZenithNivel6'
import { EstadoVisual, SalaId } from '../../types/torreZenith'
import { BuildingShell } from './BuildingShell'
import { CameraRig, ComandoCamara, Foco, POSE_INICIAL } from './CameraRig'
import { CommonAreas } from './CommonAreas'
import { SpaceBackdrop } from './SpaceBackdrop'
import { aMundoPoli, centroide, radio } from './geometria'
import { Room3D } from './Room3D'
import { Personajes } from './personas/Personajes'

interface FloorPlan3DProps {
  nombres: Record<SalaId, string>
  estados: Record<SalaId, EstadoVisual>
  seleccion: SalaId | null
  mostrarNombres: boolean
  murosVisibles: boolean
  comando: ComandoCamara | null
  /** Asistentes de la reserva activa por sala (null mientras no hay datos del servidor). */
  ocupantes: Partial<Record<SalaId, number>> | null
  mostrarPersonas: boolean
  /** false cuando el visor no está en pantalla: se deja de renderizar. */
  activo?: boolean
  onSeleccionar: (id: SalaId) => void
}

/**
 * Las luces y casi toda la geometría son estáticas: el mapa de sombras se recalcula solo al cargar
 * y mientras los muros suben o bajan, no en cada fotograma.
 */
const SombrasEstaticas: React.FC<{ version: boolean }> = ({ version }) => {
  const gl = useThree(s => s.gl)
  const restantes = useRef(90)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    restantes.current = 90 // ~1,5 s: dura la animación de altura de los muros
  }, [gl, version])
  useFrame(() => {
    if (restantes.current > 0) {
      restantes.current--
      gl.shadowMap.needsUpdate = true
    }
  })
  return null
}

/** Escena 3D del Nivel 6 de Torre Zenith: un único piso con sus salas reservables (las de GET /api/espacios). */
export const FloorPlan3D: React.FC<FloorPlan3DProps> = ({
  nombres,
  estados,
  seleccion,
  mostrarNombres,
  murosVisibles,
  comando,
  ocupantes,
  mostrarPersonas,
  activo = true,
  onSeleccionar
}) => {
  const [dpr, setDpr] = useState(1.5)
  const focos = useMemo(
    () =>
      Object.fromEntries(
        SALAS_GEOMETRIA.map(g => {
          const poli = aMundoPoli(g.poligono)
          return [g.id, { centro: centroide(poli), radio: radio(poli) }]
        })
      ) as Record<SalaId, Foco>,
    []
  )

  return (
    <Canvas
      shadows
      dpr={Math.min(dpr, window.devicePixelRatio || 1)}
      frameloop={activo ? 'always' : 'never'}
      camera={{ fov: 36, near: 0.5, far: 400, position: POSE_INICIAL.toArray() }}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
    >
      {/* Si el equipo no sostiene la tasa de fotogramas, baja la resolución a 1×. */}
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} onFallback={() => setDpr(1)} />
      <SombrasEstaticas version={murosVisibles} />
      <color attach="background" args={['#03050D']} />
      <SpaceBackdrop />

      <hemisphereLight args={['#DCE8FF', '#0B1220', 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[18, 34, 22]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight position={[-22, 9, -4]} color="#22D3EE" intensity={60} distance={45} />
      <pointLight position={[22, 9, 8]} color="#8B5CF6" intensity={60} distance={45} />

      {/* Plataforma holográfica bajo el piso: retícula acotada que se desvanece hacia el espacio */}
      <Grid
        position={[0, -0.34, -0.8]}
        args={[90, 56]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1E2A4A"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3B4C8C"
        fadeDistance={70}
        fadeStrength={2.5}
      />

      <BuildingShell murosVisibles={murosVisibles} />
      <CommonAreas murosVisibles={murosVisibles} mostrarNombres={mostrarNombres} />

      {SALAS_GEOMETRIA.map(g => (
        <Room3D
          key={g.id}
          geo={g}
          nombre={nombres[g.id]}
          estado={estados[g.id]}
          seleccionada={seleccion === g.id}
          mostrarNombre={mostrarNombres}
          murosVisibles={murosVisibles}
          onSeleccionar={onSeleccionar}
        />
      ))}

      {mostrarPersonas && <Personajes ocupantes={ocupantes} />}

      <CameraRig comando={comando} focos={focos} />
    </Canvas>
  )
}
