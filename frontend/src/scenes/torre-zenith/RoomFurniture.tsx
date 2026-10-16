import React, { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { M } from '../../data/torreZenithNivel6'
import { Mueble } from './geometria'

interface Pieza {
  x: number
  y: number
  z: number
  rot: number
  sx: number
  sy: number
  sz: number
  color?: string
}

interface PiezasProps {
  piezas: Pieza[]
  forma?: 'caja' | 'hex' | 'cilindro'
  color?: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
}

/** Una sola malla instanciada para todas las piezas iguales (sillas, mesas...). */
export const Piezas: React.FC<PiezasProps> = ({
  piezas,
  forma = 'caja',
  color = '#ffffff',
  emissive,
  emissiveIntensity = 0,
  roughness = 0.7,
  metalness = 0.05
}) => {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const malla = ref.current
    if (!malla) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    piezas.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z)
      o.rotation.set(0, p.rot, 0)
      o.scale.set(p.sx, p.sy, p.sz)
      o.updateMatrix()
      malla.setMatrixAt(i, o.matrix)
      if (p.color) malla.setColorAt(i, c.set(p.color))
    })
    malla.instanceMatrix.needsUpdate = true
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true
    malla.computeBoundingSphere()
  }, [piezas])

  if (!piezas.length) return null
  return (
    <instancedMesh key={piezas.length} ref={ref} args={[undefined, undefined, piezas.length]} castShadow receiveShadow>
      {forma === 'caja' && <boxGeometry />}
      {forma === 'hex' && <cylinderGeometry args={[1, 1, 1, 6]} />}
      {forma === 'cilindro' && <cylinderGeometry args={[1, 1, 1, 24]} />}
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={roughness}
        metalness={metalness}
      />
    </instancedMesh>
  )
}

const ASIENTO = 0.46 * M
const MESA_H = 0.74 * M

/** Convierte la lista de muebles en piezas instanciadas agrupadas por material. */
export const RoomFurniture: React.FC<{ muebles: Mueble[] }> = ({ muebles }) => {
  const grupos = useMemo(() => {
    const asientos: Pieza[] = []
    const respaldos: Pieza[] = []
    const bases: Pieza[] = []
    const tableros: Pieza[] = []
    const patas: Pieza[] = []
    const pantallas: Pieza[] = []
    const tarimas: Pieza[] = []
    const hex: Pieza[] = []
    const redondas: Pieza[] = []
    const pedestales: Pieza[] = []

    for (const m of muebles) {
      if (m.k === 'silla') {
        const [x, z] = m.p
        const fx = Math.sin(m.rot)
        const fz = Math.cos(m.rot)
        asientos.push({ x, y: ASIENTO, z, rot: m.rot, sx: 0.46 * M, sy: 0.06 * M, sz: 0.46 * M, color: m.color })
        respaldos.push({
          x: x - fx * 0.21 * M, y: ASIENTO + 0.24 * M, z: z - fz * 0.21 * M,
          rot: m.rot, sx: 0.44 * M, sy: 0.42 * M, sz: 0.05 * M, color: m.color
        })
        bases.push({ x, y: ASIENTO / 2, z, rot: m.rot, sx: 0.07 * M, sy: ASIENTO, sz: 0.07 * M })
      } else if (m.k === 'mesa') {
        const [x, z] = m.p
        tableros.push({ x, y: MESA_H, z, rot: m.rot, sx: m.w, sy: 0.04 * M, sz: m.d, color: m.color ?? '#F1F5F9' })
        // Dos patas tipo panel en los extremos del eje X local.
        const lx = Math.cos(m.rot)
        const lz = -Math.sin(m.rot)
        for (const s of [-1, 1]) {
          const off = s * (m.w / 2 - 0.04 * M)
          patas.push({ x: x + lx * off, y: MESA_H / 2, z: z + lz * off, rot: m.rot, sx: 0.04 * M, sy: MESA_H, sz: m.d * 0.85 })
        }
      } else if (m.k === 'pantalla') {
        const [x, z] = m.p
        pantallas.push({ x, y: m.y, z, rot: m.rot, sx: m.w, sy: m.w * 0.5625, sz: 0.05 * M })
      } else if (m.k === 'monitor') {
        const [x, z] = m.p
        pantallas.push({ x, y: MESA_H + 0.25 * M, z, rot: m.rot, sx: 0.6 * M, sy: 0.36 * M, sz: 0.03 * M })
      } else if (m.k === 'tarima') {
        const [x, z] = m.p
        tarimas.push({ x, y: 0.22 * M, z, rot: m.rot, sx: m.w, sy: 0.44 * M, sz: m.d })
      } else if (m.k === 'hex' || m.k === 'redonda') {
        const [x, z] = m.p
        ;(m.k === 'hex' ? hex : redondas).push({ x, y: MESA_H, z, rot: Math.PI / 6, sx: m.r, sy: 0.04 * M, sz: m.r })
        pedestales.push({ x, y: MESA_H / 2, z, rot: 0, sx: 0.06, sy: MESA_H, sz: 0.06 })
      }
    }
    return { asientos, respaldos, bases, tableros, patas, pantallas, tarimas, hex, redondas, pedestales }
  }, [muebles])

  return (
    <group>
      <Piezas piezas={grupos.asientos} roughness={0.8} />
      <Piezas piezas={grupos.respaldos} roughness={0.8} />
      <Piezas piezas={grupos.bases} color="#334155" metalness={0.5} roughness={0.4} />
      <Piezas piezas={grupos.tableros} roughness={0.55} />
      <Piezas piezas={grupos.patas} color="#94A3B8" metalness={0.4} roughness={0.4} />
      <Piezas piezas={grupos.pantallas} color="#0B1220" emissive="#2563EB" emissiveIntensity={0.55} roughness={0.25} />
      <Piezas piezas={grupos.tarimas} color="#1E293B" roughness={0.6} />
      <Piezas piezas={grupos.hex} forma="hex" color="#E2E8F0" roughness={0.5} />
      <Piezas piezas={grupos.redondas} forma="cilindro" color="#D6C3A5" roughness={0.6} />
      <Piezas piezas={grupos.pedestales} forma="cilindro" color="#334155" metalness={0.5} roughness={0.4} />
    </group>
  )
}
