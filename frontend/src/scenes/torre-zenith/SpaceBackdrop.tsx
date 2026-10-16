import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

const RADIO_CIELO = 300

/** Textura equirectangular del cielo: degradado profundo, banda de Vía Láctea y nebulosas. */
function texturaCielo(): THREE.CanvasTexture {
  const w = 2048
  const h = 1024
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!

  const fondo = ctx.createLinearGradient(0, 0, 0, h)
  fondo.addColorStop(0, '#040920')
  fondo.addColorStop(0.5, '#070A1F')
  fondo.addColorStop(1, '#050716')
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, w, h)

  // Banda galáctica inclinada que da la vuelta a toda la bóveda (el edificio flota en el espacio).
  const banda = (x: number) => h * 0.5 + Math.sin((x / w) * Math.PI * 2) * h * 0.28
  const blob = (x: number, y: number, r: number, color: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(${color},${a})`)
    g.addColorStop(1, `rgba(${color},0)`)
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.globalCompositeOperation = 'lighter'
  const nubes = ['99,102,241', '139,92,246', '56,189,248', '217,70,239', '45,212,191']
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * w
    const y = banda(x) + (Math.random() - 0.5) * h * 0.22
    blob(x, y, 50 + Math.random() * 180, nubes[i % nubes.length], 0.06 + Math.random() * 0.08)
  }
  // Nebulosas aisladas más intensas.
  for (let i = 0; i < 10; i++) {
    blob(Math.random() * w, h * (0.1 + Math.random() * 0.8), 140 + Math.random() * 220, nubes[i % nubes.length], 0.2)
  }
  // Polvo de estrellas concentrado en la banda.
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * w
    const y = banda(x) + (Math.random() + Math.random() + Math.random() - 1.5) * h * 0.12
    const a = 0.2 + Math.random() * 0.6
    ctx.fillStyle = `rgba(230,236,255,${a})`
    ctx.fillRect(x, y, Math.random() < 0.95 ? 1 : 2, 1)
  }
  ctx.globalCompositeOperation = 'source-over'

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const N_COMETAS = 3

interface EstadoCometa {
  cabeza: THREE.Vector3
  dir: THREE.Vector3
  vida: number
  duracion: number
  espera: number
  largo: number
}

function nuevoCometa(espera: number): EstadoCometa {
  // Aparece en cualquier zona de la bóveda y la cruza en diagonal.
  const azimut = Math.random() * Math.PI * 2
  const elev = THREE.MathUtils.degToRad(-55 + Math.random() * 100)
  const r = RADIO_CIELO * 0.6
  const cabeza = new THREE.Vector3(Math.cos(azimut) * Math.cos(elev) * r, Math.sin(elev) * r, Math.sin(azimut) * Math.cos(elev) * r)
  const tangente = new THREE.Vector3(-Math.sin(azimut), 0, Math.cos(azimut)).multiplyScalar(Math.random() < 0.5 ? 1 : -1)
  const dir = tangente.add(new THREE.Vector3(0, -0.45 - Math.random() * 0.3, 0)).normalize()
  return { cabeza, dir, vida: 0, duracion: 1.2 + Math.random() * 1.1, espera, largo: 22 + Math.random() * 18 }
}

/** Cometas fugaces: cintas que siempre miran a la cámara, con cabeza brillante y cola que se desvanece. */
const Cometas: React.FC = () => {
  const estados = useRef<EstadoCometa[]>(Array.from({ length: N_COMETAS }, (_, i) => nuevoCometa(0.8 + i * 1.7)))
  const geos = useMemo(
    () =>
      Array.from({ length: N_COMETAS }, () => {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3))
        // RGBA por vértice: la cabeza opaca y la cola transparente.
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(16), 4))
        g.setIndex([0, 1, 2, 2, 1, 3])
        return g
      }),
    []
  )
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false
      }),
    []
  )
  const aux = useMemo(() => ({ lado: new THREE.Vector3(), vista: new THREE.Vector3(), cola: new THREE.Vector3() }), [])

  useFrame(({ camera }, dt) => {
    estados.current.forEach((c, i) => {
      const pos = geos[i].attributes.position as THREE.BufferAttribute
      const col = geos[i].attributes.color as THREE.BufferAttribute
      if (c.espera > 0) {
        c.espera -= dt
        col.array.fill(0)
        col.needsUpdate = true
        return
      }
      c.vida += dt
      if (c.vida > c.duracion) {
        estados.current[i] = nuevoCometa(1.5 + Math.random() * 4)
        return
      }
      c.cabeza.addScaledVector(c.dir, dt * 70)
      const alfa = Math.sin(Math.PI * (c.vida / c.duracion))
      aux.cola.copy(c.cabeza).addScaledVector(c.dir, -c.largo)
      aux.vista.copy(camera.position).sub(c.cabeza)
      aux.lado.crossVectors(c.dir, aux.vista).normalize()
      const anchoCabeza = 0.9
      const anchoCola = 0.05
      const v = [
        c.cabeza.clone().addScaledVector(aux.lado, anchoCabeza),
        c.cabeza.clone().addScaledVector(aux.lado, -anchoCabeza),
        aux.cola.clone().addScaledVector(aux.lado, anchoCola),
        aux.cola.clone().addScaledVector(aux.lado, -anchoCola)
      ]
      v.forEach((p, k) => pos.setXYZ(k, p.x, p.y, p.z))
      col.setXYZW(0, 1, 1, 1, alfa)
      col.setXYZW(1, 1, 1, 1, alfa)
      col.setXYZW(2, 0.55, 0.75, 1, 0)
      col.setXYZW(3, 0.55, 0.75, 1, 0)
      pos.needsUpdate = true
      col.needsUpdate = true
      geos[i].computeBoundingSphere()
    })
  })

  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={material} frustumCulled={false} renderOrder={-1} />
      ))}
    </group>
  )
}

/** Fondo espacial del visor: bóveda con nebulosas, campo de estrellas que titila y cometas. */
export const SpaceBackdrop: React.FC = () => {
  const cielo = useMemo(texturaCielo, [])
  const boveda = useRef<THREE.Mesh>(null)

  useFrame((_, dt) => {
    // Rotación sideral muy lenta para que el cielo se sienta vivo.
    if (boveda.current) boveda.current.rotation.y += dt * 0.004
  })

  return (
    <group>
      <mesh ref={boveda} renderOrder={-2}>
        <sphereGeometry args={[RADIO_CIELO, 64, 32]} />
        <meshBasicMaterial map={cielo} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <Stars radius={150} depth={80} count={5000} factor={5} saturation={0.35} fade speed={0.8} />
      <Cometas />
    </group>
  )
}
