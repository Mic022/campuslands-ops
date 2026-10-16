/**
 * Geometría del Nivel 6 de Torre Zenith (planta de 2560 m²).
 *
 * Todas las coordenadas están en PÍXELES medidos sobre el plano arquitectónico de
 * referencia (x hacia la derecha, y hacia abajo) y se convierten a unidades de escena
 * con `aMundo`. Así cualquier ajuste se hace comparando directamente con el plano.
 *
 * Escala: el contorno mide ≈347 000 px² para 2560 m² → 1 px ≈ 0,086 m.
 * Con PX = 1/20, una unidad de escena ≈ 1,72 m.
 */
import { SalaId } from '../types/torreZenith'

export type P = [number, number]
export type Dir = 'n' | 's' | 'e' | 'w'

export const PX = 1 / 20
const ORIGEN: P = [600, 352]
/** Unidades de escena por metro real. */
export const M = 0.582

export const ALTURA_MURO = 3.0 * M
export const ALTURA_FACHADA = 3.2 * M
export const ALTURA_PUERTA = 2.1 * M
export const GROSOR_MURO = 0.12

export const aMundo = ([x, y]: P): P => [(x - ORIGEN[0]) * PX, (y - ORIGEN[1]) * PX]

/** Puntos de un arco del plano (ángulos en grados, 0° = este, 90° = norte). */
export function arco(centro: P, radio: number, desde: number, hasta: number, segmentos: number): P[] {
  const pts: P[] = []
  for (let i = 0; i <= segmentos; i++) {
    const a = ((desde + ((hasta - desde) * i) / segmentos) * Math.PI) / 180
    pts.push([centro[0] + radio * Math.cos(a), centro[1] - radio * Math.sin(a)])
  }
  return pts
}

// ---------- Contorno del piso ----------

const CENTRO_ARCO: P = [975, 225]
const RADIO_ARCO = 140
const SEG_ARCO = 24

/** Fachada exterior, en sentido horario sobre el plano. */
export const CONTORNO: P[] = [
  [38, 222],
  [370, 222],
  [370, 195],
  [655, 195],
  [655, 225],
  ...arco(CENTRO_ARCO, RADIO_ARCO, 180, 0, SEG_ARCO), // fachada curva: auditorio + cafetería
  [1115, 335],
  [1165, 335],
  [1165, 410],
  [1000, 410],
  [1000, 620],
  [553, 620],
  [553, 448],
  [370, 448],
  [370, 418],
  [38, 418]
]

// ---------- Salas reservables ----------

export interface Puerta {
  /** Índice del lado del polígono (del punto i al i+1). */
  lado: number
  /** Posición a lo largo del lado, 0..1. */
  en: number
  /** Ancho libre en metros. */
  ancho?: number
}

export type Distribucion =
  | { tipo: 'aula'; frente: Dir }
  | { tipo: 'reuniones'; eje: 'x' | 'z'; pantalla: Dir }
  | { tipo: 'auditorio' }
  | { tipo: 'cabinas'; cabinas: number; eje: 'x' | 'z'; fondo: Dir }

export interface GeometriaSala {
  id: SalaId
  /** Nombre de respaldo si el backend aún no respondió (la fuente es backend/app/config/salas.py). */
  nombre: string
  color: string
  poligono: P[]
  puertas: Puerta[]
  /** Lados que coinciden con la fachada: no se levanta muro interior. */
  ladosFachada?: number[]
  distribucion: Distribucion
  capacidad: number
  /** Desplazamiento (unidades, eje z) de la etiqueta para que no choque con salas vecinas. */
  desplazarEtiqueta?: number
}

const POLI_AUDITORIO: P[] = [...arco(CENTRO_ARCO, RADIO_ARCO, 180, 90, 12), [975, 225]]

export const SALAS_GEOMETRIA: GeometriaSala[] = [
  {
    id: 'salon-sputnik',
    nombre: 'Salón Sputnik',
    color: '#C79BEA',
    poligono: [[38, 222], [188, 222], [188, 300], [170, 318], [38, 318]],
    puertas: [{ lado: 2, en: 0.5, ancho: 1.0 }],
    ladosFachada: [0, 4],
    distribucion: { tipo: 'aula', frente: 'n' },
    capacidad: 30
  },
  {
    id: 'salon-artemis',
    nombre: 'Salón Artemis',
    color: '#F2B35E',
    poligono: [[38, 322], [166, 322], [188, 344], [188, 418], [38, 418]],
    puertas: [{ lado: 1, en: 0.5, ancho: 1.0 }],
    ladosFachada: [3, 4],
    distribucion: { tipo: 'aula', frente: 's' },
    capacidad: 32
  },
  {
    id: 'salon-apolo',
    nombre: 'Salón Apolo',
    color: '#6EC6E6',
    poligono: [[194, 222], [345, 222], [345, 318], [216, 318], [194, 296]],
    puertas: [{ lado: 3, en: 0.5, ancho: 1.0 }, { lado: 2, en: 0.15, ancho: 1.0 }],
    ladosFachada: [0],
    distribucion: { tipo: 'aula', frente: 'n' },
    capacidad: 30
  },
  {
    id: 'skylab',
    nombre: 'Skylab',
    color: '#B4475C',
    poligono: [[236, 362], [358, 362], [358, 418], [236, 418]],
    puertas: [{ lado: 0, en: 0.88, ancho: 1.0 }],
    ladosFachada: [2],
    distribucion: { tipo: 'aula', frente: 'w' },
    capacidad: 20
  },
  {
    id: 'salon-cosmos',
    nombre: 'Salón Cosmos',
    color: '#86C77A',
    poligono: [[648, 352], [742, 352], [742, 425], [648, 425]],
    puertas: [{ lado: 1, en: 0.3, ancho: 1.0 }],
    distribucion: { tipo: 'reuniones', eje: 'x', pantalla: 'w' },
    capacidad: 12
  },
  {
    id: 'sala-verde',
    nombre: 'Sala Verde',
    color: '#3DD13D',
    poligono: [[680, 478], [720, 478], [720, 540], [680, 540]],
    puertas: [
      { lado: 3, en: 1 / 6, ancho: 0.8 },
      { lado: 3, en: 3 / 6, ancho: 0.8 },
      { lado: 3, en: 5 / 6, ancho: 0.8 }
    ],
    distribucion: { tipo: 'cabinas', cabinas: 3, eje: 'z', fondo: 'e' },
    capacidad: 6
  },
  {
    id: 'auditorio',
    nombre: 'Auditorio',
    color: '#4F7A3A',
    poligono: POLI_AUDITORIO,
    puertas: [{ lado: 13, en: 0.14, ancho: 1.6 }],
    ladosFachada: Array.from({ length: 12 }, (_, i) => i),
    distribucion: { tipo: 'auditorio' },
    capacidad: 60
  },
  {
    id: 'sala-azul',
    nombre: 'Sala Azul',
    color: '#2F6FE4',
    poligono: [[862, 229], [884, 229], [884, 288], [862, 288]],
    puertas: [{ lado: 2, en: 0.5, ancho: 0.8 }],
    distribucion: { tipo: 'cabinas', cabinas: 1, eje: 'x', fondo: 'n' },
    capacidad: 2,
    desplazarEtiqueta: -0.7
  },
  {
    id: 'sala-blanca',
    nombre: 'Sala Blanca',
    color: '#F1F5F9',
    poligono: [[887, 229], [934, 229], [934, 288], [887, 288]],
    puertas: [{ lado: 2, en: 0.3, ancho: 0.9 }],
    distribucion: { tipo: 'reuniones', eje: 'z', pantalla: 'n' },
    capacidad: 6,
    desplazarEtiqueta: 0.7
  },
  {
    id: 'sala-amarilla',
    nombre: 'Sala Amarilla',
    color: '#F5D90A',
    poligono: [[918, 380], [980, 380], [980, 410], [918, 410]],
    puertas: [{ lado: 0, en: 0.25, ancho: 0.8 }, { lado: 0, en: 0.75, ancho: 0.8 }],
    distribucion: { tipo: 'cabinas', cabinas: 2, eje: 'x', fondo: 's' },
    capacidad: 2
  }
]

// ---------- Áreas comunes (no reservables) ----------

/** Núcleos macizos: ascensores, escaleras, baños, ductos. */
export const NUCLEOS: { rect: [number, number, number, number]; tipo: 'ascensor' | 'escalera' | 'banos' }[] = [
  { rect: [385, 232, 452, 280], tipo: 'ascensor' },
  { rect: [478, 232, 545, 282], tipo: 'escalera' },
  { rect: [556, 230, 642, 290], tipo: 'banos' },
  { rect: [374, 354, 458, 418], tipo: 'banos' },
  { rect: [466, 352, 550, 416], tipo: 'escalera' },
  { rect: [556, 352, 640, 418], tipo: 'banos' },
  { rect: [836, 229, 859, 288], tipo: 'banos' },
  { rect: [1100, 340, 1160, 405], tipo: 'escalera' },
  { rect: [723, 476, 752, 546], tipo: 'escalera' }
]

/** Recintos de apoyo con muros y puerta (oficinas, bodega, recepción). */
export const RECINTOS_APOYO: { nombre: string; poligono: P[]; puertas: Puerta[] }[] = [
  { nombre: 'Bodega', poligono: [[194, 360], [232, 360], [232, 418], [194, 418]], puertas: [{ lado: 0, en: 0.5, ancho: 0.9 }] },
  { nombre: 'Oficina', poligono: [[922, 418], [998, 418], [998, 455], [922, 455]], puertas: [{ lado: 3, en: 0.5, ancho: 0.9 }] },
  { nombre: 'Sala de dirección', poligono: [[922, 459], [998, 459], [998, 552], [922, 552]], puertas: [{ lado: 3, en: 0.3, ancho: 0.9 }] },
  { nombre: 'Recepción', poligono: [[686, 556], [742, 556], [742, 618], [686, 618]], puertas: [{ lado: 0, en: 0.5, ancho: 1.2 }] }
]

/** Nombres de zonas comunes que se rotulan en el suelo. */
export const ZONAS: { nombre: string; en: P }[] = [
  { nombre: 'Lobby · Ascensores', en: [512, 318] },
  { nombre: 'Coworking', en: [875, 470] },
  { nombre: 'Cafetería', en: [1045, 250] },
  { nombre: 'Zona de estudio', en: [612, 590] },
  { nombre: 'Circulación ala oeste', en: [280, 340] }
]

/** Mesas hexagonales de coworking (centro). */
export const MESAS_HEX: P[] = [
  [692, 318], [740, 318], [788, 318], [836, 318], [882, 318], [930, 318],
  [780, 390], [860, 390], [780, 440], [860, 440], [780, 490], [860, 490], [780, 545], [860, 545]
]

/** Mesas largas de trabajo: [x1, y1, x2, y2] en px; las sillas van a ambos lados del eje largo. */
export const MESAS_LARGAS: [number, number, number, number][] = [
  // franja de escritorios norte del coworking
  [664, 248, 700, 262], [706, 248, 744, 262], [752, 248, 790, 262], [796, 248, 828, 262],
  // zona de estudio
  [566, 446, 664, 454], [566, 486, 664, 494], [566, 526, 664, 534], [566, 566, 664, 574],
  // barra de fachada sur del coworking
  [790, 596, 916, 602],
  // barra de fachada norte del lobby
  [384, 204, 640, 210]
]

/** Mesas redondas de cafetería. */
export const MESAS_CAFE: P[] = [
  [1000, 150], [1030, 150], [1060, 150], [1000, 182], [1030, 182], [1060, 182], [1085, 210], [1040, 120]
]

/** Barras de cocina y mostradores: [x1, y1, x2, y2]. */
export const MOSTRADORES: [number, number, number, number][] = [
  [992, 296, 1012, 332], [1046, 296, 1064, 332], [1098, 270, 1112, 330], [1004, 236, 1040, 248]
]

/** Jardineras. */
export const JARDINERAS: [number, number, number, number][] = [
  [720, 283, 795, 289], [254, 352, 276, 358], [827, 396, 833, 546]
]
