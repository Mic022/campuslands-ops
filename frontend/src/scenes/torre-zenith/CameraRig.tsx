import React, { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { SalaId } from '../../types/torreZenith'

export type PeticionCamara =
  | { tipo: 'reiniciar' | '3d' | 'superior' | 'acercar' | 'alejar' }
  | { tipo: 'enfocar'; salaId: SalaId }
/** `n` cambia en cada petición para que repetir la misma acción vuelva a animar. */
export type ComandoCamara = PeticionCamara & { n: number }

export interface Foco {
  centro: [number, number]
  radio: number
}

const CENTRO = new THREE.Vector3(0, 0, -0.8)
const DIST_MIN = 5
const DIST_MAX = 120
const LIMITE = { x: 27, z: 13 }
const PLANTA = { ancho: 57, fondo: 27 }
const POLAR_3D = 0.82 // ~47° desde la vertical

/** Pose isométrica de inicio (desde el sur) para el primer render, antes de conocer el lienzo. */
export const POSE_INICIAL = new THREE.Vector3(0, 52, 56).add(CENTRO)

/** Pose que encuadra toda la planta según el aspecto del lienzo. */
function encuadre(camara: THREE.PerspectiveCamera, planta: boolean): THREE.Vector3 {
  const tv = Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2)
  const th = tv * camara.aspect
  const polar = planta ? 0.0002 : POLAR_3D
  const fondoVisto = PLANTA.fondo * (planta ? 1 : Math.cos(polar) + 0.35)
  const d = THREE.MathUtils.clamp(Math.max(PLANTA.ancho / 2 / th, fondoVisto / 2 / tv) * 1.06, DIST_MIN, DIST_MAX)
  return new THREE.Vector3(0, Math.cos(polar) * d, Math.sin(polar) * d).add(CENTRO)
}

/** OrbitControls con límites y transiciones suaves hacia poses pedidas desde la UI. */
export const CameraRig: React.FC<{ comando: ComandoCamara | null; focos: Record<SalaId, Foco> }> = ({ comando, focos }) => {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const destino = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)

  // Primer encuadre con el aspecto real del lienzo.
  useEffect(() => {
    camera.position.copy(encuadre(camera as THREE.PerspectiveCamera, false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const c = controls.current
    if (!comando || !c) return
    const target = c.target.clone()
    const offset = camera.position.clone().sub(target)
    const enPlanta = offset.clone().normalize().y > 0.985

    switch (comando.tipo) {
      case 'reiniciar':
      case '3d':
        destino.current = { pos: encuadre(camera as THREE.PerspectiveCamera, false), target: CENTRO.clone() }
        break
      case 'superior':
        destino.current = { pos: encuadre(camera as THREE.PerspectiveCamera, true), target: CENTRO.clone() }
        break
      case 'acercar':
      case 'alejar': {
        const f = comando.tipo === 'acercar' ? 0.7 : 1.4
        const d = THREE.MathUtils.clamp(offset.length() * f, DIST_MIN, DIST_MAX)
        destino.current = { pos: target.clone().add(offset.setLength(d)), target }
        break
      }
      case 'enfocar': {
        const foco = focos[comando.salaId]
        if (!foco) return
        const nuevoTarget = new THREE.Vector3(foco.centro[0], 0, foco.centro[1])
        const d = THREE.MathUtils.clamp(foco.radio * 3 + 7, 9, 32)
        // Conserva el ángulo actual (planta o perspectiva) y solo se acerca a la sala.
        const dir = enPlanta ? new THREE.Vector3(0, 1, 0.0002) : offset.clone().normalize()
        if (!enPlanta && dir.y < 0.55) dir.setY(0.55).normalize()
        destino.current = { pos: nuevoTarget.clone().add(dir.multiplyScalar(d)), target: nuevoTarget }
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comando?.n])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    if (destino.current) {
      const k = 1 - Math.exp(-dt * 4.5)
      camera.position.lerp(destino.current.pos, k)
      c.target.lerp(destino.current.target, k)
      if (camera.position.distanceTo(destino.current.pos) < 0.03 && c.target.distanceTo(destino.current.target) < 0.03) {
        destino.current = null
      }
    }
    // El objetivo nunca sale de la planta: la cámara no se pierde al desplazarse.
    const cx = THREE.MathUtils.clamp(c.target.x, -LIMITE.x, LIMITE.x)
    const cz = THREE.MathUtils.clamp(c.target.z, -LIMITE.z, LIMITE.z)
    const delta = new THREE.Vector3(cx - c.target.x, -c.target.y, cz - c.target.z)
    if (delta.lengthSq() > 0) {
      c.target.add(delta)
      camera.position.add(delta)
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={CENTRO}
      enableDamping
      dampingFactor={0.08}
      minDistance={DIST_MIN}
      maxDistance={DIST_MAX}
      maxPolarAngle={1.22}
      screenSpacePanning={false}
      onStart={() => {
        destino.current = null
      }}
    />
  )
}
