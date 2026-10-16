import React, { useMemo } from 'react'
import { Edges, Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  ALTURA_MURO,
  GROSOR_MURO,
  JARDINERAS,
  M,
  MESAS_CAFE,
  MESAS_HEX,
  MESAS_LARGAS,
  MOSTRADORES,
  NUCLEOS,
  RECINTOS_APOYO,
  ZONAS,
  aMundo
} from '../../data/torreZenithNivel6'
import { MuroTramo, useAlturaAnimada } from './BuildingShell'
import { Mueble, aMundoPoli, mesaCafe, mesaHex, mesaLarga, muros } from './geometria'
import { formaDe } from './materiales'
import { Piezas, RoomFurniture } from './RoomFurniture'

const rectAMundo = (r: [number, number, number, number]) => {
  const [x1, z1] = aMundo([r[0], r[1]])
  const [x2, z2] = aMundo([r[2], r[3]])
  return { cx: (x1 + x2) / 2, cz: (z1 + z2) / 2, w: Math.abs(x2 - x1), d: Math.abs(z2 - z1) }
}

/** Escalera: peldaños que suben a lo largo del lado largo del núcleo. */
const Escalera: React.FC<{ r: ReturnType<typeof rectAMundo>; material: THREE.Material }> = ({ r, material }) => {
  const largoX = r.w >= r.d
  const n = 10
  const largo = largoX ? r.w : r.d
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const t = -largo / 2 + (largo * (i + 0.5)) / n
        const h = (ALTURA_MURO * 0.85 * (i + 1)) / n
        return (
          <mesh
            key={i}
            position={[r.cx + (largoX ? t : 0), h / 2, r.cz + (largoX ? 0 : t)]}
            material={material}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[largoX ? largo / n : r.w * 0.9, h, largoX ? r.d * 0.9 : largo / n]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Núcleos de servicio, recintos de apoyo y mobiliario de las zonas comunes (no reservables). */
export const CommonAreas: React.FC<{ murosVisibles: boolean; mostrarNombres: boolean }> = ({
  murosVisibles,
  mostrarNombres
}) => {
  const grupoMuros = useAlturaAnimada(murosVisibles)

  const mats = useMemo(
    () => ({
      nucleo: new THREE.MeshStandardMaterial({ color: '#2B3546', roughness: 0.75, metalness: 0.15 }),
      peldano: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7 }),
      muro: new THREE.MeshStandardMaterial({ color: '#8C98AA', roughness: 0.85 }),
      pisoApoyo: new THREE.MeshStandardMaterial({ color: '#4B5567', roughness: 0.9 }),
      mostrador: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.3 }),
      matera: new THREE.MeshStandardMaterial({ color: '#3F3F46', roughness: 0.9 })
    }),
    []
  )

  const recintos = useMemo(
    () =>
      RECINTOS_APOYO.map(r => {
        const poli = aMundoPoli(r.poligono)
        return { ...r, poli, forma: new THREE.ShapeGeometry(formaDe(poli)), ...muros(poli, r.puertas) }
      }),
    []
  )

  const muebles = useMemo<Mueble[]>(
    () => [
      ...MESAS_HEX.flatMap(p => mesaHex(aMundo(p))),
      ...MESAS_LARGAS.flatMap(mesaLarga),
      ...MESAS_CAFE.flatMap(p => mesaCafe(aMundo(p)))
    ],
    []
  )

  const follaje = useMemo(
    () =>
      JARDINERAS.map(j => {
        const r = rectAMundo(j)
        return { x: r.cx, y: 0.5 * M, z: r.cz, rot: 0, sx: r.w - 0.04, sy: 0.22 * M, sz: r.d - 0.04, color: '#4D7C0F' }
      }),
    []
  )

  return (
    <group>
      {/* Núcleos: ascensores, baños y escaleras */}
      {NUCLEOS.map((n, i) => {
        const r = rectAMundo(n.rect)
        if (n.tipo === 'escalera') return <Escalera key={i} r={r} material={mats.peldano} />
        return (
          <mesh key={i} position={[r.cx, ALTURA_MURO / 2, r.cz]} material={mats.nucleo} castShadow receiveShadow>
            <boxGeometry args={[r.w, ALTURA_MURO, r.d]} />
            <Edges color="#64748B" />
          </mesh>
        )
      })}

      {/* Recintos de apoyo */}
      {recintos.map(r => (
        <group key={r.nombre}>
          <mesh geometry={r.forma} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} material={mats.pisoApoyo} receiveShadow />
        </group>
      ))}
      <group ref={grupoMuros}>
        {recintos.flatMap(r =>
          r.tramos.map((t, i) => (
            <MuroTramo key={`${r.nombre}-${i}`} tramo={t} alto={ALTURA_MURO} grosor={GROSOR_MURO} material={mats.muro} />
          ))
        )}
      </group>

      {/* Mostradores de cocina y jardineras */}
      {MOSTRADORES.map((m, i) => {
        const r = rectAMundo(m)
        return (
          <mesh key={i} position={[r.cx, 0.95 * M * 0.5, r.cz]} material={mats.mostrador} castShadow receiveShadow>
            <boxGeometry args={[r.w, 0.95 * M, r.d]} />
          </mesh>
        )
      })}
      {JARDINERAS.map((j, i) => {
        const r = rectAMundo(j)
        return (
          <mesh key={i} position={[r.cx, 0.2 * M, r.cz]} material={mats.matera} castShadow receiveShadow>
            <boxGeometry args={[r.w, 0.4 * M, r.d]} />
          </mesh>
        )
      })}
      <Piezas piezas={follaje} roughness={0.95} />

      <RoomFurniture muebles={muebles} />

      {/* Rótulos de zonas comunes */}
      {mostrarNombres &&
        ZONAS.map(z => {
          const [x, zz] = aMundo(z.en)
          return (
            <Html key={z.nombre} position={[x, 0.05, zz]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap text-[9px] font-mono uppercase tracking-[0.18em] text-slate-400/80">
                {z.nombre}
              </span>
            </Html>
          )
        })}
    </group>
  )
}
