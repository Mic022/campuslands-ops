/**
 * Personajes del Nivel 6: dibuja la simulación (simulacion.ts) con mallas instanciadas.
 *
 * Cada parte del cuerpo (torso, cabeza, pelo, brazos, muslos, piernas) es una sola InstancedMesh
 * para todas las personas: unas 8 llamadas de dibujo aunque haya cientos de personajes.
 * No proyectan sombra: el mapa de sombras de la escena es estático (ver FloorPlan3D).
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { M } from '../../../data/torreZenithNivel6'
import { SalaId } from '../../../types/torreZenith'
import { Agente, MAX_AGENTES, Multitud } from './simulacion'

// Medidas del cuerpo en metros reales (×M = unidades de escena)
const MUSLO = 0.44 * M
const PIERNA = 0.44 * M
const CADERA_PIE = 0.9 * M
const CADERA_SENTADO = 0.5 * M
const TORSO = 0.52 * M
const HOMBRO_X = 0.2 * M
const BRAZO = 0.52 * M
const CABEZA = 0.11 * M
const SEP_PIERNAS = 0.085 * M

type Parte = 'torso' | 'cabeza' | 'pelo' | 'brazoI' | 'brazoD' | 'musloI' | 'musloD' | 'piernaI' | 'piernaD'
const PARTES: Parte[] = ['torso', 'cabeza', 'pelo', 'brazoI', 'brazoD', 'musloI', 'musloD', 'piernaI', 'piernaD']

const colorDe = (a: Agente, p: Parte) =>
  p === 'cabeza' ? a.apariencia.piel
    : p === 'pelo' ? a.apariencia.pelo
      : p === 'torso' || p.startsWith('brazo') ? a.apariencia.camisa
        : a.apariencia.pantalon

// Matrices reutilizadas (sin crear objetos en cada fotograma)
const raiz = new THREE.Matrix4()
const tmp = new THREE.Matrix4()
const rot = new THREE.Matrix4()
const esc = new THREE.Matrix4()
const OCULTA = new THREE.Matrix4().makeScale(0, 0, 0)

/** Segmento que cuelga de un pivote y gira sobre el eje X local (ángulo negativo = hacia delante). */
function segmento(out: THREE.Matrix4, px: number, py: number, pz: number, angulo: number, largo: number, ancho: number, fondo: number) {
  out.copy(raiz)
  out.multiply(tmp.makeTranslation(px, py, pz))
  out.multiply(rot.makeRotationX(angulo))
  out.multiply(tmp.makeTranslation(0, -largo / 2, 0))
  out.multiply(esc.makeScale(ancho, largo, fondo))
  return out
}

interface PersonajesProps {
  /** Asistentes de la reserva activa de cada sala a la hora consultada (0 o ausente = sin reserva). */
  ocupantes: Partial<Record<SalaId, number>> | null
}

export const Personajes: React.FC<PersonajesProps> = ({ ocupantes }) => {
  const multitud = useMemo(() => new Multitud(), [])
  const mallas = useRef<Partial<Record<Parte, THREE.InstancedMesh>>>({})
  const colores = useRef(new Map<number, number>()) // id del agente → índice donde se pintó su color
  const color = useMemo(() => new THREE.Color(), [])
  const matriz = useMemo(() => new THREE.Matrix4(), [])

  // Cada cambio de reservas se refleja: la primera vez ya sentados, luego caminando.
  useEffect(() => {
    if (ocupantes) multitud.sincronizar(ocupantes)
  }, [ocupantes, multitud])

  const geometrias = useMemo(
    () => ({
      caja: new THREE.BoxGeometry(1, 1, 1),
      esfera: new THREE.SphereGeometry(1, 12, 10),
      gorro: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)
    }),
    []
  )
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 }), [])

  useLayoutEffect(() => {
    for (const p of PARTES) {
      const m = mallas.current[p]
      if (!m) continue
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      for (let i = 0; i < m.count; i++) m.setMatrixAt(i, OCULTA) // nada visible hasta el primer fotograma
      m.setColorAt(0, color.set('#ffffff')) // crea el buffer de color por instancia
      m.frustumCulled = false
    }
  }, [color])

  useFrame((_, dt) => {
    multitud.actualizar(dt)
    const t = performance.now() / 1000
    const agentes = multitud.agentes
    const n = Math.min(agentes.length, MAX_AGENTES)

    for (let i = 0; i < n; i++) {
      const a = agentes[i]
      const s = a.sentado
      const caminando = a.ruta.length > 0 && a.espera <= 0 && s === 0
      const swing = caminando ? Math.sin(a.fase) * 0.55 : 0
      const rebote = caminando ? Math.abs(Math.sin(a.fase)) * 0.025 * M : 0
      const respira = Math.sin(t * 1.6 + a.semilla) * 0.006 * M
      const k = a.apariencia.escala * a.presencia

      // Raíz: posición en el piso y orientación; al sentarse se echa un poco hacia atrás sobre la silla.
      const atras = s * 0.06 * M
      raiz.makeTranslation(a.pos[0] - Math.sin(a.rot) * atras, 0, a.pos[1] - Math.cos(a.rot) * atras)
      raiz.multiply(rot.makeRotationY(a.rot))
      raiz.multiply(esc.makeScale(k, k, k))

      const cadera = THREE.MathUtils.lerp(CADERA_PIE, CADERA_SENTADO, s) + rebote
      // Muslos: oscilan al caminar; sentados quedan horizontales hacia delante.
      const musloI = THREE.MathUtils.lerp(-swing, -Math.PI / 2, s)
      const musloD = THREE.MathUtils.lerp(swing, -Math.PI / 2, s)
      // Piernas (ángulo absoluto): la rodilla se dobla cuando la pierna va atrás; sentados, verticales.
      const piernaI = THREE.MathUtils.lerp(musloI + Math.max(0, Math.sin(a.fase)) * 0.7 * (caminando ? 1 : 0), 0, s)
      const piernaD = THREE.MathUtils.lerp(musloD + Math.max(0, -Math.sin(a.fase)) * 0.7 * (caminando ? 1 : 0), 0, s)

      const dibujar = (parte: Parte, m: THREE.Matrix4) => {
        const malla = mallas.current[parte]
        if (!malla) return
        malla.setMatrixAt(i, m)
        if (colores.current.get(a.id * 16 + PARTES.indexOf(parte)) !== i) {
          malla.setColorAt(i, color.set(colorDe(a, parte)))
          colores.current.set(a.id * 16 + PARTES.indexOf(parte), i)
          if (malla.instanceColor) malla.instanceColor.needsUpdate = true
        }
      }

      for (const [lado, x] of [['I', -SEP_PIERNAS], ['D', SEP_PIERNAS]] as const) {
        const muslo = lado === 'I' ? musloI : musloD
        const pierna = lado === 'I' ? piernaI : piernaD
        dibujar(`muslo${lado}`, segmento(matriz, x, cadera, 0, muslo, MUSLO, 0.15 * M, 0.16 * M))
        // La rodilla está al final del muslo.
        const ry = cadera - Math.cos(muslo) * MUSLO
        const rz = -Math.sin(muslo) * MUSLO
        dibujar(`pierna${lado}`, segmento(matriz, x, ry, rz, pierna, PIERNA, 0.12 * M, 0.13 * M))
      }

      // Torso ligeramente inclinado hacia atrás al estar sentado.
      const inclinacion = s * 0.12
      matriz.copy(raiz)
        .multiply(tmp.makeTranslation(0, cadera, 0))
        .multiply(rot.makeRotationX(inclinacion))
        .multiply(tmp.makeTranslation(0, TORSO / 2 + respira, 0))
        .multiply(esc.makeScale(0.38 * M, TORSO, 0.22 * M))
      dibujar('torso', matriz)

      // Brazos: balanceo opuesto a las piernas; sentados, apoyados hacia delante.
      const hombro = cadera + TORSO * 0.95
      const brazo = (signo: number) => THREE.MathUtils.lerp(signo * swing * 0.8, -0.75, s)
      dibujar('brazoI', segmento(matriz, -HOMBRO_X - 0.03 * M, hombro, 0, brazo(1), BRAZO, 0.09 * M, 0.1 * M))
      dibujar('brazoD', segmento(matriz, HOMBRO_X + 0.03 * M, hombro, 0, brazo(-1), BRAZO, 0.09 * M, 0.1 * M))

      // Cabeza y pelo
      const cuello = hombro + 0.08 * M + CABEZA + respira
      const giroCabeza = s > 0.5 ? Math.sin(t * 0.4 + a.semilla) * 0.25 : 0
      matriz.copy(raiz)
        .multiply(tmp.makeTranslation(0, cuello, -inclinacion * 0.1 * M))
        .multiply(rot.makeRotationY(giroCabeza))
        .multiply(esc.makeScale(CABEZA, CABEZA * 1.1, CABEZA))
      dibujar('cabeza', matriz)
      matriz.copy(raiz)
        .multiply(tmp.makeTranslation(0, cuello + CABEZA * 0.15, -0.012 * M))
        .multiply(rot.makeRotationY(giroCabeza))
        .multiply(esc.makeScale(CABEZA * 1.08, CABEZA * 1.05, CABEZA * 1.1))
      dibujar('pelo', matriz)
    }

    for (const p of PARTES) {
      const malla = mallas.current[p]
      if (!malla) continue
      for (let i = n; i < malla.count; i++) malla.setMatrixAt(i, OCULTA)
      malla.instanceMatrix.needsUpdate = true
    }
    // Si cambia el número de agentes, los índices se reasignan: se repintan colores.
    if (colores.current.size > n * PARTES.length * 2) colores.current.clear()
  })

  return (
    <group>
      {PARTES.map(p => (
        <instancedMesh
          key={p}
          ref={m => {
            if (m) mallas.current[p] = m
          }}
          args={[p === 'cabeza' ? geometrias.esfera : p === 'pelo' ? geometrias.gorro : geometrias.caja, material, MAX_AGENTES]}
        />
      ))}
    </group>
  )
}
