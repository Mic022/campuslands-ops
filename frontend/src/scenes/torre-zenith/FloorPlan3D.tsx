import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { SALAS_GEOMETRIA } from '../../data/torreZenithNivel6'
import { EstadoVisual, SalaId } from '../../types/torreZenith'
import { BuildingShell } from './BuildingShell'
import { CameraRig, ComandoCamara, Foco, POSE_INICIAL } from './CameraRig'
import { CommonAreas } from './CommonAreas'
import { SpaceBackdrop } from './SpaceBackdrop'
import { aMundoPoli, centroide, radio } from './geometria'
import { Room3D } from './Room3D'

interface FloorPlan3DProps {
  nombres: Record<SalaId, string>
  estados: Record<SalaId, EstadoVisual>
  seleccion: SalaId | null
  mostrarNombres: boolean
  murosVisibles: boolean
  comando: ComandoCamara | null
  onSeleccionar: (id: SalaId) => void
}

/** Escena 3D del Nivel 6 de Torre Zenith: un único piso con sus diez salas reservables. */
export const FloorPlan3D: React.FC<FloorPlan3DProps> = ({
  nombres,
  estados,
  seleccion,
  mostrarNombres,
  murosVisibles,
  comando,
  onSeleccionar
}) => {
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
      dpr={[1, 2]}
      camera={{ fov: 36, near: 0.5, far: 400, position: POSE_INICIAL.toArray() }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#03050D']} />
      <SpaceBackdrop />

      <hemisphereLight args={['#DCE8FF', '#0B1220', 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[18, 34, 22]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
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

      <CameraRig comando={comando} focos={focos} />
    </Canvas>
  )
}
