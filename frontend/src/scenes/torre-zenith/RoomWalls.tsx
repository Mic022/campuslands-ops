import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ALTURA_MURO, ALTURA_PUERTA, GROSOR_MURO } from '../../data/torreZenithNivel6'
import { MuroTramo, useAlturaAnimada } from './BuildingShell'
import { Mampara, Tramo, V, Vano, rotacionLargo } from './geometria'

interface RoomWallsProps {
  tramos: Tramo[]
  vanos: Vano[]
  mamparas: Mampara[]
  materialMuro: THREE.Material
  materialAcento: THREE.Material
  materialLed: THREE.Material
  materialVidrio: THREE.Material
  visibles: boolean
  abiertas: boolean
}

/** Hoja de puerta con bisagra en un extremo del vano; se abre al pasar el cursor o seleccionar. */
const Puerta: React.FC<{ vano: Vano; abierta: boolean; material: THREE.Material }> = ({ vano, abierta, material }) => {
  const ref = useRef<THREE.Mesh>(null)
  const angulo = useRef(0.2)
  const bisagra: V = [vano.centro[0] - (vano.dir[0] * vano.ancho) / 2, vano.centro[1] - (vano.dir[1] * vano.ancho) / 2]

  useFrame((_, dt) => {
    if (!ref.current) return
    angulo.current += ((abierta ? 1.35 : 0.2) - angulo.current) * (1 - Math.exp(-dt * 5))
    const a = angulo.current
    const d: V = [
      vano.dir[0] * Math.cos(a) + vano.normal[0] * Math.sin(a),
      vano.dir[1] * Math.cos(a) + vano.normal[1] * Math.sin(a)
    ]
    const largo = vano.ancho * 0.96
    ref.current.position.set(bisagra[0] + (d[0] * largo) / 2, ALTURA_PUERTA / 2, bisagra[1] + (d[1] * largo) / 2)
    ref.current.rotation.set(0, rotacionLargo(d), 0)
  })

  return (
    <mesh ref={ref} material={material} castShadow>
      <boxGeometry args={[vano.ancho * 0.96, ALTURA_PUERTA, 0.035]} />
    </mesh>
  )
}

export const RoomWalls: React.FC<RoomWallsProps> = ({
  tramos,
  vanos,
  mamparas,
  materialMuro,
  materialAcento,
  materialLed,
  materialVidrio,
  visibles,
  abiertas
}) => {
  const grupo = useAlturaAnimada(visibles)
  const dinteles = useMemo<Tramo[]>(
    () =>
      vanos.map(v => ({
        a: [v.centro[0] - (v.dir[0] * v.ancho) / 2, v.centro[1] - (v.dir[1] * v.ancho) / 2],
        b: [v.centro[0] + (v.dir[0] * v.ancho) / 2, v.centro[1] + (v.dir[1] * v.ancho) / 2]
      })),
    [vanos]
  )

  return (
    <group ref={grupo}>
      {tramos.map((t, i) => (
        <group key={i}>
          <MuroTramo tramo={t} alto={ALTURA_MURO} grosor={GROSOR_MURO} material={materialMuro} />
          {/* Franja de color de la sala, a ambos lados del muro */}
          <MuroTramo tramo={t} alto={0.07} grosor={GROSOR_MURO + 0.014} y={ALTURA_MURO * 0.52} material={materialAcento} sombra={false} />
          {/* Indicador luminoso de estado en la corona del muro */}
          <MuroTramo tramo={t} alto={0.035} grosor={GROSOR_MURO + 0.02} y={ALTURA_MURO} material={materialLed} sombra={false} />
        </group>
      ))}
      {dinteles.map((t, i) => (
        <group key={`d${i}`}>
          <MuroTramo tramo={t} alto={ALTURA_MURO - ALTURA_PUERTA} grosor={GROSOR_MURO} y={ALTURA_PUERTA} material={materialMuro} />
          <MuroTramo tramo={t} alto={0.035} grosor={GROSOR_MURO + 0.02} y={ALTURA_MURO} material={materialLed} sombra={false} />
        </group>
      ))}
      {vanos.map((v, i) => (
        <Puerta key={`p${i}`} vano={v} abierta={abiertas} material={materialVidrio} />
      ))}
      {mamparas.map((m, i) => (
        <MuroTramo key={`m${i}`} tramo={m} alto={ALTURA_MURO} grosor={0.04} material={materialVidrio} sombra={false} />
      ))}
    </group>
  )
}
