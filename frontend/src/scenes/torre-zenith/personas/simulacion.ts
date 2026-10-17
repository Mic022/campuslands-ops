/**
 * Simulación de los personajes del Nivel 6 (lógica pura, sin three.js).
 *
 * - Ambiente: unas personas pasean por los pasillos y otras están sentadas en barras, mesas de
 *   coworking, estudio y cafetería. Nunca entran a una sala.
 * - Reservas: cuando una sala tiene una reserva activa a la hora consultada, llegan tantas
 *   personas como asistentes (desde los ascensores), entran por la puerta y se sientan. Si hay
 *   más asistentes que sillas, el resto se queda de pie dentro. Al acabar la reserva se van.
 */
import { M, SALAS_GEOMETRIA } from '../../../data/torreZenithNivel6'
import { SalaId } from '../../../types/torreZenith'
import { V, aMundoPoli, dentro, holgado } from '../geometria'
import { ACCESOS, ASIENTOS_COMUNES, Asiento, LLEGADA, NODOS_MUNDO, camino, tramoBloqueado } from './navegacion'

export type Final = 'sentarse' | 'pararse' | 'desaparecer' | 'pasear'

export interface Apariencia {
  camisa: string
  pantalon: string
  piel: string
  pelo: string
  escala: number
}

export interface Agente {
  id: number
  tipo: 'paseante' | 'sentado' | 'reserva'
  sala?: SalaId
  pos: V
  rot: number
  ruta: V[]
  final: Final
  asiento?: Asiento
  /** Índice del asiento dentro de la sala (o de los comunes). */
  indiceAsiento?: number
  /** 0 = de pie, 1 = sentado. */
  sentado: number
  /** 0..1: aparece al llegar y se desvanece al irse. */
  presencia: number
  fase: number
  velocidad: number
  espera: number
  saliendo: boolean
  apariencia: Apariencia
  /** Desfase de la animación en reposo, para que no se muevan todos a la vez. */
  semilla: number
}

// ---------- Aleatoriedad reproducible ----------

function rng(semilla: number) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CAMISAS = ['#38BDF8', '#F472B6', '#A78BFA', '#34D399', '#FBBF24', '#F87171', '#E2E8F0', '#60A5FA', '#FB923C', '#2DD4BF', '#C084FC', '#94A3B8']
const PANTALONES = ['#1E293B', '#334155', '#1E3A8A', '#3F3F46', '#44403C', '#0F172A']
const PIELES = ['#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFDBAC', '#D4A373']
const PELOS = ['#1C1917', '#3F2A1D', '#78350F', '#A16207', '#0C0A09', '#57534E']

const elegir = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]

// ---------- Parámetros ----------

export const MAX_AGENTES = 260
const PASEANTES = 16
const PROPORCION_SENTADOS = 0.24
/** Personas de pie extra por sala cuando hay más asistentes que sillas. */
const MAX_DE_PIE = 10
const VEL_RESERVA = 1.5
const VEL_PASEO: [number, number] = [0.55, 0.85]
const DESFASE_LLEGADA = 0.45 // s entre una persona y la siguiente
const DETRAS_SILLA = 0.32
const LLEGADO = 0.06

const POLIGONOS = Object.fromEntries(SALAS_GEOMETRIA.map(g => [g.id, aMundoPoli(g.poligono)])) as Record<SalaId, V[]>

const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1])
const frente = (rot: number): V => [Math.sin(rot), Math.cos(rot)]

/** Puntos para quedarse de pie dentro de una sala, lejos de muros y sillas. */
function puntosDePie(id: SalaId, asientos: Asiento[], r: () => number): V[] {
  const g = SALAS_GEOMETRIA.find(s => s.id === id)!
  const poli = aMundoPoli(g.poligono)
  const xs = poli.map(p => p[0])
  const zs = poli.map(p => p[1])
  const out: V[] = []
  for (let i = 0; i < 400 && out.length < MAX_DE_PIE; i++) {
    const p: V = [
      Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)),
      Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs))
    ]
    if (!holgado(p, poli, 0.3)) continue
    if (asientos.some(a => dist(a.p, p) < 0.38)) continue
    if (out.some(q => dist(q, p) < 0.4)) continue
    out.push(p)
  }
  return out
}

// ---------- Multitud ----------

export class Multitud {
  agentes: Agente[] = []
  private siguienteId = 1
  private r = rng(20261016)
  private ocupadosSala: Partial<Record<SalaId, Set<number>>> = {}
  private ocupadosComunes = new Set<number>()
  private dePie: Partial<Record<SalaId, V[]>> = {}
  private iniciado = false

  constructor() {
    for (const g of SALAS_GEOMETRIA) {
      const ac = ACCESOS[g.id]
      if (ac) this.dePie[g.id] = puntosDePie(g.id, ac.asientos, this.r)
    }
    this.crearAmbiente()
  }

  private apariencia(): Apariencia {
    return {
      camisa: elegir(this.r, CAMISAS),
      pantalon: elegir(this.r, PANTALONES),
      piel: elegir(this.r, PIELES),
      pelo: elegir(this.r, PELOS),
      escala: 0.92 + this.r() * 0.16
    }
  }

  private nuevo(parcial: Partial<Agente> & Pick<Agente, 'tipo' | 'pos'>): Agente {
    const a: Agente = {
      id: this.siguienteId++,
      rot: this.r() * Math.PI * 2,
      ruta: [],
      final: 'pararse',
      sentado: 0,
      presencia: 1,
      fase: this.r() * Math.PI * 2,
      velocidad: VEL_RESERVA,
      espera: 0,
      saliendo: false,
      apariencia: this.apariencia(),
      semilla: this.r() * 100,
      ...parcial
    }
    this.agentes.push(a)
    return a
  }

  // ----- Ambiente -----

  private crearAmbiente() {
    const nodos = Object.keys(NODOS_MUNDO)
    for (let i = 0; i < PASEANTES; i++) {
      const pos = NODOS_MUNDO[elegir(this.r, nodos)]
      const a = this.nuevo({
        tipo: 'paseante',
        pos: [pos[0], pos[1]],
        velocidad: VEL_PASEO[0] + this.r() * (VEL_PASEO[1] - VEL_PASEO[0]),
        espera: this.r() * 3
      })
      this.nuevoPaseo(a)
    }
    ASIENTOS_COMUNES.forEach((asiento, i) => {
      if (this.r() > PROPORCION_SENTADOS) return
      this.ocupadosComunes.add(i)
      this.nuevo({ tipo: 'sentado', pos: [...asiento.p] as V, rot: asiento.rot, asiento, indiceAsiento: i, sentado: 1, final: 'sentarse' })
    })
  }

  private nodoMasCercano(p: V): string {
    let mejor = LLEGADA
    let d = Infinity
    for (const [id, q] of Object.entries(NODOS_MUNDO)) {
      const dd = dist(p, q)
      if (dd < d) {
        d = dd
        mejor = id
      }
    }
    return mejor
  }

  /** Paseo a un nodo al azar de la red de pasillos, con un pequeño desvío lateral para no ir en fila. */
  private nuevoPaseo(a: Agente) {
    const nodos = Object.keys(NODOS_MUNDO)
    const destino = elegir(this.r, nodos)
    const ruta = camino(this.nodoMasCercano(a.pos), destino)
    const desvio = (this.r() - 0.5) * 0.3
    const desviada = ruta.map(id => {
      const [x, z] = NODOS_MUNDO[id]
      return [x + desvio, z - desvio] as V
    })
    // El desvío solo se usa si todo el recorrido desplazado sigue libre de muros y salas.
    const libre = [a.pos, ...desviada].every((p, i, xs) => i === 0 || !tramoBloqueado(xs[i - 1], p))
    a.ruta = libre ? desviada : ruta.map(id => [...NODOS_MUNDO[id]] as V)
    a.final = 'pasear'
  }

  // ----- Reservas -----

  private asientosLibres(id: SalaId): number[] {
    const ac = ACCESOS[id]
    if (!ac) return []
    const ocupados = (this.ocupadosSala[id] ??= new Set())
    return ac.asientos.map((_, i) => i).filter(i => !ocupados.has(i))
  }

  private rutaHastaSala(id: SalaId, desde: V | null): V[] {
    const ac = ACCESOS[id]!
    const nodos = camino(desde ? this.nodoMasCercano(desde) : LLEGADA, ac.nodo)
    return [...nodos.map(n => NODOS_MUNDO[n]), ac.fuera, ac.dentro]
  }

  private rutaDesdeSala(id: SalaId): V[] {
    const ac = ACCESOS[id]!
    return [ac.dentro, ac.fuera, ...camino(ac.nodo, LLEGADA).map(n => NODOS_MUNDO[n])]
  }

  /**
   * Ajusta las personas de cada sala a los asistentes de su reserva activa.
   * `instantaneo`: la primera vez se colocan ya sentadas (la reserva ya estaba en curso).
   */
  sincronizar(ocupantes: Partial<Record<SalaId, number>>) {
    const instantaneo = !this.iniciado
    this.iniciado = true
    for (const g of SALAS_GEOMETRIA) {
      const ac = ACCESOS[g.id]
      if (!ac) continue
      const presentes = this.agentes.filter(a => a.tipo === 'reserva' && a.sala === g.id && !a.saliendo)
      const objetivo = Math.min(ocupantes[g.id] ?? 0, ac.asientos.length + (this.dePie[g.id]?.length ?? 0))

      if (objetivo > presentes.length) {
        const libres = this.asientosLibres(g.id)
        const dePieOcupados = new Set(presentes.filter(a => a.indiceAsiento === undefined).map(a => a.asiento!.p.join()))
        const dePieLibres = (this.dePie[g.id] ?? []).filter(p => !dePieOcupados.has(p.join()))
        for (let k = 0; k < objetivo - presentes.length; k++) {
          if (this.agentes.length >= MAX_AGENTES) break
          const i = libres.shift()
          const asiento: Asiento | undefined = i !== undefined ? ac.asientos[i] : dePieLibres.length ? { p: dePieLibres.shift()!, rot: 0 } : undefined
          if (!asiento) break
          if (i !== undefined) this.ocupadosSala[g.id]!.add(i)
          const final: Final = i !== undefined ? 'sentarse' : 'pararse'
          if (instantaneo) {
            this.nuevo({
              tipo: 'reserva', sala: g.id, pos: [...asiento.p] as V, rot: i !== undefined ? asiento.rot : this.r() * 6.28,
              asiento, indiceAsiento: i, sentado: i !== undefined ? 1 : 0, final
            })
          } else {
            const a = this.nuevo({
              tipo: 'reserva', sala: g.id, pos: [...NODOS_MUNDO[LLEGADA]] as V, asiento, indiceAsiento: i, final,
              presencia: 0, espera: k * DESFASE_LLEGADA
            })
            a.ruta = [...this.rutaHastaSala(g.id, null), this.aproximacion(asiento, i !== undefined, g.id)]
          }
        }
      } else if (objetivo < presentes.length) {
        // Se van primero los que llegaron de últimos (los de pie antes que los sentados).
        const orden = [...presentes].sort((x, y) => Number(x.indiceAsiento === undefined) - Number(y.indiceAsiento === undefined) || y.id - x.id)
        orden.slice(0, presentes.length - objetivo).forEach((a, k) => this.despedir(a, k * 0.25))
      }
    }
  }

  /**
   * Punto desde el que se entra al asiento: detrás de la silla, pero siempre dentro de la sala
   * (en salas pequeñas "detrás" puede quedar al otro lado del muro).
   */
  private aproximacion(asiento: Asiento, silla: boolean, sala?: SalaId): V {
    if (!silla) return asiento.p
    const f = frente(asiento.rot)
    const poli = sala ? POLIGONOS[sala] : null
    for (const k of [DETRAS_SILLA, DETRAS_SILLA / 2, 0]) {
      const p: V = [asiento.p[0] - f[0] * k, asiento.p[1] - f[1] * k]
      if (!poli || holgado(p, poli, 0.12)) return p
    }
    return asiento.p
  }

  private despedir(a: Agente, espera: number) {
    a.saliendo = true
    a.espera = Math.max(a.espera, espera)
    if (a.indiceAsiento !== undefined && a.sala) this.ocupadosSala[a.sala]?.delete(a.indiceAsiento)
    // Quien ya cruzó la puerta sale por ella; quien iba de camino vuelve por el pasillo.
    const dentroDeSala = Boolean(a.sala && dentro(a.pos, POLIGONOS[a.sala]))
    a.ruta = dentroDeSala && a.sala
      ? [this.aproximacion(a.asiento!, a.indiceAsiento !== undefined, a.sala), ...this.rutaDesdeSala(a.sala)]
      : camino(this.nodoMasCercano(a.pos), LLEGADA).map(n => NODOS_MUNDO[n])
    a.final = 'desaparecer'
  }

  // ----- Paso de simulación -----

  actualizar(dt: number) {
    dt = Math.min(dt, 0.1)
    for (const a of this.agentes) {
      // Aparecer / desvanecerse
      if (a.final === 'desaparecer' && a.ruta.length === 0) a.presencia = Math.max(0, a.presencia - dt * 2.5)
      else if (a.espera <= 0) a.presencia = Math.min(1, a.presencia + dt * 2.5)

      if (a.espera > 0) {
        a.espera -= dt
        continue
      }

      // Levantarse antes de caminar
      if (a.ruta.length && a.sentado > 0) {
        a.sentado = Math.max(0, a.sentado - dt * 2)
        continue
      }

      if (a.ruta.length) {
        const destino = a.ruta[0]
        const d = dist(a.pos, destino)
        if (d < LLEGADO) {
          a.ruta.shift()
          continue
        }
        const paso = Math.min(d, a.velocidad * dt)
        const dir: V = [(destino[0] - a.pos[0]) / d, (destino[1] - a.pos[1]) / d]
        a.pos = [a.pos[0] + dir[0] * paso, a.pos[1] + dir[1] * paso]
        a.rot = girar(a.rot, Math.atan2(dir[0], dir[1]), dt * 8)
        a.fase += (paso / M) * 3.2
        continue
      }

      // Llegó al final de la ruta
      if (a.final === 'sentarse' && a.asiento) {
        a.rot = girar(a.rot, a.asiento.rot, dt * 6)
        a.pos = acercar(a.pos, a.asiento.p, dt * 1.2)
        a.sentado = Math.min(1, a.sentado + dt * 1.6)
      } else if (a.final === 'pararse') {
        a.fase = 0
      } else if (a.final === 'pasear') {
        a.espera = 1 + this.r() * 4
        this.nuevoPaseo(a)
      }
    }
    this.agentes = this.agentes.filter(a => !(a.final === 'desaparecer' && a.ruta.length === 0 && a.presencia <= 0))
  }

  /** Cuántas personas de reserva hay (dentro o en camino) por sala; útil para pruebas. */
  conteo(): Partial<Record<SalaId, number>> {
    const c: Partial<Record<SalaId, number>> = {}
    for (const a of this.agentes) if (a.tipo === 'reserva' && a.sala && !a.saliendo) c[a.sala] = (c[a.sala] ?? 0) + 1
    return c
  }
}

function girar(actual: number, objetivo: number, k: number) {
  let d = objetivo - actual
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return actual + d * Math.min(1, k)
}

function acercar(p: V, q: V, k: number): V {
  const t = Math.min(1, k)
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
}
