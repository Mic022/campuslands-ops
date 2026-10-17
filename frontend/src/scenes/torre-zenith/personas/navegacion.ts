/**
 * Navegación de los personajes del Nivel 6 (lógica pura, sin React ni three.js).
 *
 * - Red de pasillos (data/rutasNivel6.ts) con camino más corto (Dijkstra).
 * - Acceso a cada sala: punto fuera y dentro de su puerta, enlazado al nodo de pasillo más
 *   cercano cuyo tramo no cruce ningún obstáculo.
 * - Asientos: los de cada sala (mismo mobiliario que dibuja Room3D) y los de las zonas comunes.
 */
import {
  CONTORNO,
  JARDINERAS,
  MESAS_CAFE,
  MESAS_HEX,
  MESAS_LARGAS,
  MOSTRADORES,
  NUCLEOS,
  RECINTOS_APOYO,
  SALAS_GEOMETRIA,
  aMundo
} from '../../../data/torreZenithNivel6'
import { ARISTAS, NODOS, NODO_LLEGADA } from '../../../data/rutasNivel6'
import { SalaId } from '../../../types/torreZenith'
import { V, aMundoPoli, amueblar, dentro, mesaCafe, mesaHex, mesaLarga, muros, rectAPoli } from '../geometria'

export interface Asiento {
  p: V
  /** Hacia dónde mira la persona sentada (rotación Y, como las sillas). */
  rot: number
}

export interface AccesoSala {
  id: SalaId
  fuera: V
  dentro: V
  nodo: string
  asientos: Asiento[]
}

const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1])

// ---------- Obstáculos ----------

interface Obstaculo {
  nombre: string
  poli: V[]
}

const contorno = aMundoPoli(CONTORNO)

function obstaculos(): Obstaculo[] {
  return [
    ...SALAS_GEOMETRIA.map(g => ({ nombre: `sala:${g.id}`, poli: aMundoPoli(g.poligono) })),
    ...NUCLEOS.map((n, i) => ({ nombre: `nucleo:${n.tipo}${i}`, poli: rectAPoli(n.rect) })),
    ...RECINTOS_APOYO.map(r => ({ nombre: `recinto:${r.nombre}`, poli: aMundoPoli(r.poligono) })),
    ...MOSTRADORES.map((m, i) => ({ nombre: `mostrador${i}`, poli: rectAPoli(m) })),
    ...JARDINERAS.map((j, i) => ({ nombre: `jardinera${i}`, poli: rectAPoli(j) }))
  ]
}

const OBSTACULOS = obstaculos()

/** Qué obstáculo bloquea el punto (o 'fuera' si sale del edificio); null si el punto es libre. */
export function bloqueo(p: V, ignorar?: string): string | null {
  if (!dentro(p, contorno)) return 'fuera del edificio'
  for (const o of OBSTACULOS) if (o.nombre !== ignorar && dentro(p, o.poli)) return o.nombre
  return null
}

/** Primer obstáculo que cruza el tramo a→b (muestreado cada 0,08 unidades), o null. */
export function tramoBloqueado(a: V, b: V, ignorar?: string): string | null {
  const pasos = Math.max(2, Math.ceil(dist(a, b) / 0.08))
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos
    const motivo = bloqueo([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], ignorar)
    if (motivo) return motivo
  }
  return null
}

// ---------- Red de pasillos ----------

export const NODOS_MUNDO: Record<string, V> = Object.fromEntries(
  Object.entries(NODOS).map(([k, p]) => [k, aMundo(p) as V])
)

const vecinos: Record<string, { a: string; d: number }[]> = {}
for (const [a, b] of ARISTAS) {
  const d = dist(NODOS_MUNDO[a], NODOS_MUNDO[b])
  ;(vecinos[a] ??= []).push({ a: b, d })
  ;(vecinos[b] ??= []).push({ a, d })
}

export const LLEGADA = NODO_LLEGADA

/** Camino más corto entre dos nodos (lista de ids, incluidos extremos). */
export function camino(desde: string, hasta: string): string[] {
  if (desde === hasta) return [desde]
  const d: Record<string, number> = { [desde]: 0 }
  const previo: Record<string, string> = {}
  const pendientes = new Set(Object.keys(NODOS_MUNDO))
  while (pendientes.size) {
    let u: string | null = null
    for (const n of pendientes) if (d[n] !== undefined && (u === null || d[n] < d[u])) u = n
    if (u === null) break
    pendientes.delete(u)
    if (u === hasta) break
    for (const { a, d: w } of vecinos[u] ?? []) {
      const alt = d[u] + w
      if (d[a] === undefined || alt < d[a]) {
        d[a] = alt
        previo[a] = u
      }
    }
  }
  if (d[hasta] === undefined) return []
  const ruta = [hasta]
  while (ruta[0] !== desde) ruta.unshift(previo[ruta[0]])
  return ruta
}

export const nodosConectados = () => Object.keys(vecinos)

/** Nodo más cercano a p con línea libre de obstáculos (ignorando, si se indica, la propia sala). */
export function nodoAccesible(p: V, ignorar?: string): string | null {
  const orden = Object.entries(NODOS_MUNDO).sort((x, y) => dist(x[1], p) - dist(y[1], p))
  for (const [id, q] of orden) if (vecinos[id] && !tramoBloqueado(q, p, ignorar)) return id
  return null
}

// ---------- Salas ----------

const SEPARACION_PUERTA = 0.55

function construirAccesos(): Partial<Record<SalaId, AccesoSala>> {
  const out: Partial<Record<SalaId, AccesoSala>> = {}
  for (const g of SALAS_GEOMETRIA) {
    const poli = aMundoPoli(g.poligono)
    const { vanos } = muros(poli, g.puertas, g.ladosFachada)
    const { muebles } = amueblar(poli, vanos, g.distribucion, g.capacidad, g.color)
    const asientos = muebles.flatMap(m => (m.k === 'silla' ? [{ p: m.p, rot: m.rot }] : []))

    // De las puertas de la sala, la que tenga un nodo de pasillo más cerca.
    let mejor: AccesoSala | null = null
    let mejorD = Infinity
    for (const v of vanos) {
      const fuera: V = [v.centro[0] - v.normal[0] * SEPARACION_PUERTA, v.centro[1] - v.normal[1] * SEPARACION_PUERTA]
      const adentro: V = [v.centro[0] + v.normal[0] * SEPARACION_PUERTA, v.centro[1] + v.normal[1] * SEPARACION_PUERTA]
      const nodo = nodoAccesible(fuera, `sala:${g.id}`)
      if (!nodo) continue
      const d = dist(NODOS_MUNDO[nodo], fuera)
      if (d < mejorD) {
        mejorD = d
        mejor = { id: g.id, fuera, dentro: adentro, nodo, asientos }
      }
    }
    if (mejor) out[g.id] = mejor
  }
  return out
}

export const ACCESOS = construirAccesos()

// ---------- Zonas comunes ----------

/** Sillas de las barras, mesas de coworking, estudio y cafetería (nunca de una sala). */
export const ASIENTOS_COMUNES: Asiento[] = [
  ...MESAS_HEX.flatMap(p => mesaHex(aMundo(p))),
  ...MESAS_LARGAS.flatMap(mesaLarga),
  ...MESAS_CAFE.flatMap(p => mesaCafe(aMundo(p)))
].flatMap(m => (m.k === 'silla' ? [{ p: m.p, rot: m.rot }] : []))
