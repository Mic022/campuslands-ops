/**
 * Utilidades geométricas en coordenadas de escena [x, z] y generadores de mobiliario.
 * Rotaciones: ángulo Y de three.js; un objeto con rotación θ "mira" hacia (sin θ, cos θ).
 */
import {
  Dir,
  Distribucion,
  GROSOR_MURO,
  M,
  P,
  Puerta,
  aMundo
} from '../../data/torreZenithNivel6'

export type V = [number, number]

export const DIRS: Record<Dir, V> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }

export const aMundoPoli = (poli: P[]): V[] => poli.map(aMundo)

export const rectAPoli = ([x1, y1, x2, y2]: [number, number, number, number]): V[] =>
  aMundoPoli([[x1, y1], [x2, y1], [x2, y2], [x1, y2]])

const sum = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]]
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k]
const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1])

export const mirar = (desde: V, hacia: V) => Math.atan2(hacia[0] - desde[0], hacia[1] - desde[1])
/** Rotación Y para una caja cuyo largo (eje X local) siga la dirección d. */
export const rotacionLargo = (d: V) => -Math.atan2(d[1], d[0])

export function dentro(p: V, poli: V[]): boolean {
  let c = false
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, zi] = poli[i]
    const [xj, zj] = poli[j]
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c
  }
  return c
}

function distSegmento(p: V, a: V, b: V) {
  const ab: V = [b[0] - a[0], b[1] - a[1]]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2)))
  return dist(p, sum(a, mul(ab, t)))
}

/** Dentro del polígono y al menos a `margen` de cada muro. */
export function holgado(p: V, poli: V[], margen: number): boolean {
  if (!dentro(p, poli)) return false
  for (let i = 0; i < poli.length; i++) {
    if (distSegmento(p, poli[i], poli[(i + 1) % poli.length]) < margen) return false
  }
  return true
}

export function centroide(poli: V[]): V {
  let a = 0, cx = 0, cz = 0
  for (let i = 0; i < poli.length; i++) {
    const [x0, z0] = poli[i]
    const [x1, z1] = poli[(i + 1) % poli.length]
    const f = x0 * z1 - x1 * z0
    a += f
    cx += (x0 + x1) * f
    cz += (z0 + z1) * f
  }
  return [cx / (3 * a), cz / (3 * a)]
}

export function caja(poli: V[]) {
  const xs = poli.map(p => p[0])
  const zs = poli.map(p => p[1])
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
}

export function radio(poli: V[]) {
  const c = centroide(poli)
  return Math.max(...poli.map(p => dist(p, c)))
}

// ---------- Muros con vanos de puerta ----------

export interface Tramo { a: V; b: V }
export interface Vano { centro: V; dir: V; normal: V; ancho: number }

/**
 * Levanta los muros de un recinto: cada lado se desplaza medio grosor hacia dentro
 * para que dos recintos vecinos nunca compartan (ni atraviesen) el mismo muro.
 */
export function muros(poli: V[], puertas: Puerta[], ladosLibres: number[] = []) {
  const tramos: Tramo[] = []
  const vanos: Vano[] = []
  for (let i = 0; i < poli.length; i++) {
    if (ladosLibres.includes(i)) continue
    const a = poli[i]
    const b = poli[(i + 1) % poli.length]
    const largo = dist(a, b)
    if (largo < 1e-3) continue
    const d: V = [(b[0] - a[0]) / largo, (b[1] - a[1]) / largo]
    const medio = sum(a, mul(d, largo / 2))
    let n: V = [-d[1], d[0]]
    if (!dentro(sum(medio, mul(n, 0.05)), poli)) n = [d[1], -d[0]]
    const off = mul(n, GROSOR_MURO / 2)
    const a2 = sum(a, off)

    const huecos = puertas
      .filter(p => p.lado === i)
      .map(p => {
        const ancho = (p.ancho ?? 0.9) * M
        const c = p.en * largo
        vanos.push({ centro: sum(a2, mul(d, c)), dir: d, normal: n, ancho })
        return [c - ancho / 2, c + ancho / 2] as [number, number]
      })
      .sort((x, y) => x[0] - y[0])

    let cursor = 0
    for (const [h0, h1] of [...huecos, [largo, largo] as [number, number]]) {
      if (h0 - cursor > 0.02) tramos.push({ a: sum(a2, mul(d, cursor)), b: sum(a2, mul(d, h0)) })
      cursor = Math.max(cursor, h1)
    }
  }
  return { tramos, vanos }
}

// ---------- Mobiliario ----------

export type Mueble =
  | { k: 'silla'; p: V; rot: number; color: string }
  | { k: 'mesa'; p: V; rot: number; w: number; d: number; color?: string }
  | { k: 'pantalla'; p: V; rot: number; w: number; y: number }
  | { k: 'tarima'; p: V; rot: number; w: number; d: number }
  | { k: 'monitor'; p: V; rot: number }
  | { k: 'hex'; p: V; r: number }
  | { k: 'redonda'; p: V; r: number }

export interface Mampara { a: V; b: V }

const SILLA_PASO = 0.66 * M
const LIBRE_PUERTA = 1.1 * M

const lejosDePuertas = (p: V, vanos: Vano[]) => vanos.every(v => dist(p, v.centro) > v.ancho / 2 + LIBRE_PUERTA)

interface Contexto {
  poli: V[]
  vanos: Vano[]
  capacidad: number
  color: string
}

/** Escritorio de pared + pantalla: el frente de un aula o sala. */
function pantallaEnMuro(poli: V[], dirMuro: Dir, ancho: number, y = 1.15 * M): Mueble {
  const b = caja(poli)
  const c: V = [(b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2]
  const d = DIRS[dirMuro]
  const semi = d[0] !== 0 ? (b.maxX - b.minX) / 2 : (b.maxZ - b.minZ) / 2
  const p = sum(c, mul(d, semi - GROSOR_MURO - 0.04))
  return { k: 'pantalla', p, rot: mirar(p, c), w: ancho, y }
}

function aula(ctx: Contexto, frente: Dir): Mueble[] {
  const { poli, vanos, capacidad, color } = ctx
  const b = caja(poli)
  const f = mul(DIRS[frente], -1) // del frente hacia el fondo
  const u: V = [Math.abs(f[1]), Math.abs(f[0])]
  const ancho = u[0] ? b.maxX - b.minX : b.maxZ - b.minZ
  const centro: V = [(b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2]
  const fondoMedio = u[0] ? (b.maxZ - b.minZ) / 2 : (b.maxX - b.minX) / 2
  const frente0 = sum(centro, mul(f, -fondoMedio))

  const out: Mueble[] = [pantallaEnMuro(poli, frente, Math.min(ancho * 0.4, 2.2 * M))]
  const escritorio = sum(frente0, mul(f, 1.3 * M))
  out.push({ k: 'mesa', p: escritorio, rot: mirar(escritorio, sum(escritorio, f)), w: 1.4 * M, d: 0.7 * M })
  out.push({ k: 'silla', p: sum(frente0, mul(f, 0.75 * M)), rot: mirar(frente0, sum(frente0, f)), color: '#475569' })

  // Filas curvas que miran a un foco detrás del frente, como en el plano.
  const foco = sum(frente0, mul(f, -ancho * 0.7))
  let restante = capacidad
  for (let r = ancho * 0.7 + 2.4 * M; restante > 0 && r < ancho * 0.7 + fondoMedio * 2; r += 1.45 * M) {
    const n = Math.floor((Math.PI * r) / SILLA_PASO)
    const candidatas: { phi: number; silla: V; mesa: V }[] = []
    for (let k = -n; k < n; k++) {
      const phi = ((k + 0.5) * SILLA_PASO) / r
      if (Math.abs(phi) > 1.2) continue
      const dir = sum(mul(f, Math.cos(phi)), mul(u, Math.sin(phi)))
      const mesa = sum(foco, mul(dir, r))
      const silla = sum(foco, mul(dir, r + 0.42 * M))
      if (holgado(mesa, poli, 0.32 * M) && holgado(silla, poli, 0.32 * M) && lejosDePuertas(silla, vanos)) {
        candidatas.push({ phi, silla, mesa })
      }
    }
    candidatas.sort((x, y) => Math.abs(x.phi) - Math.abs(y.phi))
    for (const c of candidatas.slice(0, restante)) {
      const rot = mirar(c.silla, foco)
      out.push({ k: 'mesa', p: c.mesa, rot, w: SILLA_PASO * 0.96, d: 0.45 * M })
      out.push({ k: 'silla', p: c.silla, rot, color })
    }
    restante -= Math.min(restante, candidatas.length)
  }
  return out
}

function reuniones(ctx: Contexto, eje: 'x' | 'z', pantalla: Dir): Mueble[] {
  const { poli, capacidad, color } = ctx
  const b = caja(poli)
  const c: V = [(b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2]
  const largo = eje === 'x' ? b.maxX - b.minX : b.maxZ - b.minZ
  const ancho = eje === 'x' ? b.maxZ - b.minZ : b.maxX - b.minX
  const L: V = eje === 'x' ? [1, 0] : [0, 1]
  const T: V = [L[1], L[0]]
  const mesaLargo = largo - 2.0 * M
  const mesaAncho = Math.min(1.2 * M, ancho * 0.35)

  const out: Mueble[] = [
    { k: 'mesa', p: c, rot: rotacionLargo(L) + Math.PI / 2, w: mesaAncho, d: mesaLargo, color: '#E2E8F0' },
    pantallaEnMuro(poli, pantalla, Math.min(ancho * 0.6, 1.9 * M))
  ]
  const porLado = Math.min(Math.floor(mesaLargo / (0.72 * M)), Math.floor(capacidad / 2))
  for (let i = 0; i < porLado; i++) {
    const t = -mesaLargo / 2 + (mesaLargo * (i + 0.5)) / porLado
    for (const lado of [-1, 1]) {
      const p = sum(sum(c, mul(L, t)), mul(T, lado * (mesaAncho / 2 + 0.32 * M)))
      out.push({ k: 'silla', p, rot: mirar(p, sum(c, mul(L, t))), color })
    }
  }
  if (capacidad > porLado * 2) {
    const lejos = mul(DIRS[pantalla], -1)
    const extremo = sum(c, mul(lejos, mesaLargo / 2 + 0.34 * M))
    out.push({ k: 'silla', p: extremo, rot: mirar(extremo, c), color })
  }
  return out
}

function cabinas(ctx: Contexto, n: number, eje: 'x' | 'z', fondo: Dir): { muebles: Mueble[]; mamparas: Mampara[] } {
  const { poli, capacidad, color } = ctx
  const b = caja(poli)
  const muebles: Mueble[] = []
  const mamparas: Mampara[] = []
  const porCabina = Math.ceil(capacidad / n)
  const fd = DIRS[fondo]
  for (let i = 0; i < n; i++) {
    const [x0, x1, z0, z1] =
      eje === 'x'
        ? [b.minX + ((b.maxX - b.minX) * i) / n, b.minX + ((b.maxX - b.minX) * (i + 1)) / n, b.minZ, b.maxZ]
        : [b.minX, b.maxX, b.minZ + ((b.maxZ - b.minZ) * i) / n, b.minZ + ((b.maxZ - b.minZ) * (i + 1)) / n]
    if (i > 0) mamparas.push(eje === 'x' ? { a: [x0, b.minZ], b: [x0, b.maxZ] } : { a: [b.minX, z0], b: [b.maxX, z0] })
    const c: V = [(x0 + x1) / 2, (z0 + z1) / 2]
    const semi = fd[0] !== 0 ? (x1 - x0) / 2 : (z1 - z0) / 2
    const anchoCab = fd[0] !== 0 ? z1 - z0 : x1 - x0
    const mesa = sum(c, mul(fd, semi - GROSOR_MURO - 0.33 * M))
    const rotMesa = mirar(mesa, sum(mesa, fd))
    muebles.push({ k: 'mesa', p: mesa, rot: rotMesa, w: Math.min(anchoCab - 0.3 * M, 1.6 * M), d: 0.6 * M, color: '#E2E8F0' })
    muebles.push({ k: 'monitor', p: sum(mesa, mul(fd, 0.12 * M)), rot: mirar(mesa, c) })
    const perp: V = [Math.abs(fd[1]), Math.abs(fd[0])]
    for (let s = 0; s < porCabina; s++) {
      const t = porCabina === 1 ? 0 : (s - (porCabina - 1) / 2) * 0.62 * M
      const p = sum(sum(mesa, mul(fd, -0.62 * M)), mul(perp, t))
      muebles.push({ k: 'silla', p, rot: rotMesa, color })
    }
  }
  return { muebles, mamparas }
}

function auditorio(ctx: Contexto): Mueble[] {
  const { poli, vanos, capacidad, color } = ctx
  const b = caja(poli)
  const zc = (b.minZ + b.maxZ) / 2 + 0.6
  const tarimaFondo = 1.9 * M
  const tarima: V = [b.maxX - GROSOR_MURO - tarimaFondo / 2, zc]
  const largoTarima = (b.maxZ - b.minZ) * 0.62
  const out: Mueble[] = [
    { k: 'tarima', p: tarima, rot: 0, w: tarimaFondo, d: largoTarima },
    { k: 'pantalla', p: [b.maxX - GROSOR_MURO - 0.04, zc], rot: -Math.PI / 2, w: 4.2 * M, y: 1.75 * M },
    { k: 'mesa', p: [tarima[0] - 0.2 * M, zc + largoTarima * 0.3], rot: -Math.PI / 2, w: 0.6 * M, d: 0.5 * M, color: '#0F172A' }
  ]
  let restante = capacidad
  const paso = 0.56 * M
  for (let x = tarima[0] - tarimaFondo / 2 - 1.6 * M; restante > 0 && x > b.minX; x -= 0.95 * M) {
    const fila: V[] = []
    for (let z = b.minZ; z < b.maxZ; z += paso) {
      if (Math.abs(z - zc) < 0.55 * M) continue // pasillo central
      const p: V = [x, z]
      if (holgado(p, poli, 0.4 * M) && lejosDePuertas(p, vanos)) fila.push(p)
    }
    fila.sort((p, q) => Math.abs(p[1] - zc) - Math.abs(q[1] - zc))
    for (const p of fila.slice(0, restante)) out.push({ k: 'silla', p, rot: Math.PI / 2, color })
    restante -= Math.min(restante, fila.length)
  }
  return out
}

/** Mobiliario de una sala según su distribución. */
export function amueblar(
  poli: V[],
  vanos: Vano[],
  distribucion: Distribucion,
  capacidad: number,
  color: string
): { muebles: Mueble[]; mamparas: Mampara[] } {
  const ctx = { poli, vanos, capacidad, color }
  switch (distribucion.tipo) {
    case 'aula':
      return { muebles: aula(ctx, distribucion.frente), mamparas: [] }
    case 'reuniones':
      return { muebles: reuniones(ctx, distribucion.eje, distribucion.pantalla), mamparas: [] }
    case 'auditorio':
      return { muebles: auditorio(ctx), mamparas: [] }
    case 'cabinas':
      return cabinas(ctx, distribucion.cabinas, distribucion.eje, distribucion.fondo)
  }
}

// ---------- Mobiliario de áreas comunes ----------

const GRIS = '#64748B'

export function mesaHex(c: V): Mueble[] {
  const r = 0.55
  const out: Mueble[] = [{ k: 'hex', p: c, r }]
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + Math.PI / 6
    const p = sum(c, [Math.cos(a) * (r + 0.2), Math.sin(a) * (r + 0.2)])
    out.push({ k: 'silla', p, rot: mirar(p, c), color: GRIS })
  }
  return out
}

export function mesaLarga(rect: [number, number, number, number]): Mueble[] {
  const [a, b] = [aMundo([rect[0], rect[1]]), aMundo([rect[2], rect[3]])]
  const w = Math.abs(b[0] - a[0])
  const d = Math.abs(b[1] - a[1])
  const c: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const L: V = w >= d ? [1, 0] : [0, 1]
  const T: V = [L[1], L[0]]
  const largo = Math.max(w, d)
  const fondo = Math.max(Math.min(w, d), 0.7 * M)
  const out: Mueble[] = [{ k: 'mesa', p: c, rot: w >= d ? Math.PI / 2 : 0, w: fondo, d: largo, color: '#CBD5E1' }]
  const n = Math.floor(largo / (0.75 * M))
  for (let i = 0; i < n; i++) {
    const t = -largo / 2 + (largo * (i + 0.5)) / n
    for (const lado of [-1, 1]) {
      const eje = sum(c, mul(L, t))
      const p = sum(eje, mul(T, lado * (fondo / 2 + 0.3 * M)))
      out.push({ k: 'silla', p, rot: mirar(p, eje), color: GRIS })
    }
  }
  return out
}

export function mesaCafe(c: V): Mueble[] {
  const r = 0.3
  const out: Mueble[] = [{ k: 'redonda', p: c, r }]
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4
    const p = sum(c, [Math.cos(a) * (r + 0.2), Math.sin(a) * (r + 0.2)])
    out.push({ k: 'silla', p, rot: mirar(p, c), color: '#94A3B8' })
  }
  return out
}
