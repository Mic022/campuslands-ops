import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { ALTURA_FACHADA, CONTORNO } from '../../data/torreZenithNivel6'
import { Tramo, V, aMundoPoli, rotacionLargo } from './geometria'
import { formaDe, texturaBaldosa } from './materiales'

const LOSA = 0.3

/** Caja alineada con un tramo de muro. */
export const MuroTramo: React.FC<{
  tramo: Tramo
  alto: number
  grosor: number
  y?: number
  material: THREE.Material
  sombra?: boolean
}> = ({ tramo, alto, grosor, y = 0, material, sombra = true }) => {
  const { a, b } = tramo
  const largo = Math.hypot(b[0] - a[0], b[1] - a[1])
  const rot = rotacionLargo([(b[0] - a[0]) / largo, (b[1] - a[1]) / largo])
  return (
    <mesh
      position={[(a[0] + b[0]) / 2, y + alto / 2, (a[1] + b[1]) / 2]}
      rotation={[0, rot, 0]}
      material={material}
      castShadow={sombra}
      receiveShadow
    >
      <boxGeometry args={[largo, alto, grosor]} />
    </mesh>
  )
}

/** Hace crecer o bajar un grupo (muros) con una transición suave. */
export function useAlturaAnimada(visible: boolean, minimo = 0.12) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    const objetivo = visible ? 1 : minimo
    const s = ref.current.scale
    s.y += (objetivo - s.y) * (1 - Math.exp(-dt * 7))
  })
  return ref
}

/** Losa del piso y fachada perimetral acristalada. */
export const BuildingShell: React.FC<{ murosVisibles: boolean }> = ({ murosVisibles }) => {
  const contorno = useMemo(() => aMundoPoli(CONTORNO), [])
  const grupoFachada = useAlturaAnimada(murosVisibles, 0.06)

  const losa = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(formaDe(contorno), { depth: LOSA, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    g.translate(0, -LOSA, 0)
    return g
  }, [contorno])

  const mats = useMemo(
    () => ({
      piso: new THREE.MeshStandardMaterial({ color: '#3A4558', map: texturaBaldosa(), roughness: 0.82, metalness: 0.05 }),
      zocalo: new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.6, metalness: 0.3 }),
      vidrio: new THREE.MeshPhysicalMaterial({
        color: '#7DD3FC', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false
      }),
      perfil: new THREE.MeshStandardMaterial({ color: '#94A3B8', roughness: 0.35, metalness: 0.7 })
    }),
    []
  )

  const { tramos, montantes } = useMemo(() => {
    const tramos: Tramo[] = []
    const montantes: V[] = []
    for (let i = 0; i < contorno.length; i++) {
      const a = contorno[i]
      const b = contorno[(i + 1) % contorno.length]
      tramos.push({ a, b })
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1])
      const n = Math.max(1, Math.round(largo / 1.6))
      for (let k = 0; k < n; k++) montantes.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
    }
    return { tramos, montantes }
  }, [contorno])

  const linea = useMemo(
    () => [...contorno, contorno[0]].map(([x, z]) => new THREE.Vector3(x, 0.02, z)),
    [contorno]
  )

  return (
    <group>
      <mesh geometry={losa} material={mats.piso} receiveShadow />
      <Line points={linea} color="#38BDF8" lineWidth={1.6} transparent opacity={0.9} />

      <group ref={grupoFachada}>
        {tramos.map((t, i) => (
          <group key={i}>
            <MuroTramo tramo={t} alto={0.14} grosor={0.16} material={mats.zocalo} />
            <MuroTramo tramo={t} alto={ALTURA_FACHADA - 0.22} grosor={0.04} y={0.14} material={mats.vidrio} sombra={false} />
            <MuroTramo tramo={t} alto={0.08} grosor={0.18} y={ALTURA_FACHADA - 0.08} material={mats.perfil} />
          </group>
        ))}
        {montantes.map(([x, z], i) => (
          <mesh key={i} position={[x, ALTURA_FACHADA / 2, z]} material={mats.perfil} castShadow>
            <boxGeometry args={[0.07, ALTURA_FACHADA, 0.07]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
