/**
 * Único acceso a datos de la aplicación: todo va contra el backend FastAPI (/api).
 *
 * Conserva los nombres de funciones que usan los componentes y traduce los campos
 * snake_case del backend a los tipos de types/domain.ts (docs/integracion-frontend.md §2 y §3).
 * Las reglas de negocio las decide el backend: aquí no se valida nada, solo se propaga
 * su respuesta {codigo, mensaje} como ApiError.
 */
import {
  AreaResolutora,
  CategoriaIncidencia,
  Espacio,
  EstadoRecurso,
  Incidencia,
  Prestamo,
  PrioridadIncidencia,
  Recurso,
  ReglasConfig,
  Reserva,
  TriajeIAResponse
} from '../types/domain'

export class ApiError extends Error {
  codigo: string
  status: number
  detalles?: { campo: string; mensaje: string }[]

  constructor(status: number, codigo: string, mensaje: string, detalles?: { campo: string; mensaje: string }[]) {
    super(mensaje)
    this.status = status
    this.codigo = codigo
    this.detalles = detalles
  }
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${ruta}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
    })
  } catch {
    throw new ApiError(0, 'RED', 'No hay conexión con el servidor.')
  }
  const cuerpo = await res.json().catch(() => null)
  if (!res.ok) {
    if (!cuerpo || res.status === 502 || res.status === 504) {
      throw new ApiError(res.status, 'RED', 'El servidor no está disponible.')
    }
    const detalles = cuerpo.detalles as { campo: string; mensaje: string }[] | undefined
    const mensaje = detalles?.length
      ? `${cuerpo.mensaje}: ${detalles.map(d => `${d.campo} (${d.mensaje})`).join(', ')}`
      : cuerpo.mensaje || 'Error inesperado.'
    throw new ApiError(res.status, cuerpo.codigo || `HTTP-${res.status}`, mensaje, detalles)
  }
  return cuerpo as T
}

const post = <T>(ruta: string, cuerpo?: unknown) =>
  pedir<T>(ruta, { method: 'POST', body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
const patch = <T>(ruta: string, cuerpo: unknown) => pedir<T>(ruta, { method: 'PATCH', body: JSON.stringify(cuerpo) })

// ---------- Formas del backend ----------

interface EspacioApi { id: string; nombre: string; tipo: Espacio['tipo']; aforo: number; aforo_permitido?: number; estado: Espacio['estado']; ubicacion: string | null }
interface RecursoApi { id: string; tipo: string; nombre: string | null; serial: string | null; estado: EstadoRecurso; espacio_id: string | null }
interface ReservaApi { id: number; espacio_id: string; solicitante: string; inicio: string; fin: string; asistentes: number; estado: Reserva['estado']; creada_en: string }
interface PrestamoApi { id: number; recurso_id: string; solicitante: string; salida: string; devolucion_esperada: string; devolucion_real: string | null; estado: Prestamo['estado'] }
interface IncidenciaApi {
  id: number; titulo: string; descripcion: string
  categoria: CategoriaIncidencia | null; prioridad: PrioridadIncidencia | null; area_responsable: AreaResolutora | null
  estado: Incidencia['estado']; espacio_id: string | null; recurso_id: string | null
  origen_triaje: Incidencia['origenTriaje']; confianza_ia: number | null; justificacion_ia: string | null; creada_en: string
}
interface TriajeApi {
  categoria: CategoriaIncidencia; prioridad: PrioridadIncidencia; area_responsable: AreaResolutora
  justificacion: string; confianza: number; requiere_revision: boolean
}

// Caché ligera de nombres para completar relaciones (espacio de una reserva, recurso de un préstamo).
let espaciosCache: EspacioApi[] = []
let recursosCache: RecursoApi[] = []
const nombreEspacio = (id: string | null) => espaciosCache.find(e => e.id === id)?.nombre ?? id ?? undefined
const recursoPorId = (id: string) => recursosCache.find(r => r.id === id)

const aEspacio = (e: EspacioApi): Espacio => ({
  id: e.id,
  nombre: e.nombre,
  tipo: e.tipo,
  estado: e.estado,
  capacidad: e.aforo,
  aforoPermitido: e.aforo_permitido ?? e.aforo,
  ubicacion: e.ubicacion ?? undefined
})

const aReserva = (r: ReservaApi): Reserva => ({
  id: String(r.id),
  espacioId: r.espacio_id,
  espacioNombre: nombreEspacio(r.espacio_id) ?? r.espacio_id,
  solicitanteNombre: r.solicitante,
  horaInicio: r.inicio,
  horaFin: r.fin,
  numPersonas: r.asistentes,
  estado: r.estado,
  creadaEn: r.creada_en
})

const aPrestamo = (p: PrestamoApi): Prestamo => {
  const rec = recursoPorId(p.recurso_id)
  return {
    id: String(p.id),
    recursoId: p.recurso_id,
    recursoNombre: rec?.nombre || rec?.tipo || p.recurso_id,
    recursoCodigo: p.recurso_id,
    solicitanteNombre: p.solicitante,
    fechaPrestamo: p.salida,
    fechaEstimadaDevolucion: p.devolucion_esperada,
    fechaDevolucionReal: p.devolucion_real ?? undefined,
    estado: p.estado
  }
}

const aIncidencia = (i: IncidenciaApi): Incidencia => ({
  id: String(i.id),
  codigo: `INC-${i.id}`,
  titulo: i.titulo,
  descripcion: i.descripcion,
  espacioId: i.espacio_id ?? undefined,
  espacioNombre: nombreEspacio(i.espacio_id),
  recursoId: i.recurso_id ?? undefined,
  recursoCodigo: i.recurso_id ?? undefined,
  categoria: i.categoria,
  prioridad: i.prioridad,
  area: i.area_responsable,
  estado: i.estado,
  confianzaIA: i.confianza_ia ?? undefined,
  razonamientoIA: i.justificacion_ia ?? undefined,
  origenTriaje: i.origen_triaje,
  timestamp: i.creada_en
})

export const apiClient = {
  async checkHealth(): Promise<{ estado: string }> {
    return pedir('/health')
  },

  getReglas(): Promise<ReglasConfig> {
    return pedir<ReglasConfig>('/reglas')
  },

  async getEspacios(): Promise<Espacio[]> {
    espaciosCache = await pedir<EspacioApi[]>('/espacios')
    return espaciosCache.map(aEspacio)
  },

  async getRecursos(prestamosActivos: Prestamo[] = []): Promise<Recurso[]> {
    recursosCache = await pedir<RecursoApi[]>('/recursos')
    return recursosCache.map(r => ({
      id: r.id,
      codigo: r.id,
      nombre: r.nombre || r.tipo,
      tipo: r.tipo,
      estado: r.estado,
      serial: r.serial ?? undefined,
      espacioActualId: r.espacio_id ?? undefined,
      espacioActualNombre: nombreEspacio(r.espacio_id),
      solicitanteActual: prestamosActivos.find(p => p.recursoId === r.id && p.estado === 'activo')?.solicitanteNombre
    }))
  },

  async getReservas(): Promise<Reserva[]> {
    return (await pedir<ReservaApi[]>('/reservas')).map(aReserva)
  },

  async getPrestamos(): Promise<Prestamo[]> {
    return (await pedir<PrestamoApi[]>('/prestamos')).map(aPrestamo)
  },

  async getIncidencias(): Promise<Incidencia[]> {
    return (await pedir<IncidenciaApi[]>('/incidencias')).map(aIncidencia)
  },

  /** `inicio`/`fin` en formato YYYY-MM-DDTHH:MM (hora local). */
  async crearReserva(datos: {
    espacioId: string
    solicitanteNombre: string
    inicio: string
    fin: string
    numPersonas: number
  }): Promise<Reserva> {
    const r = await post<ReservaApi>('/reservas', {
      espacio_id: datos.espacioId,
      solicitante: datos.solicitanteNombre,
      inicio: datos.inicio,
      fin: datos.fin,
      asistentes: datos.numPersonas
    })
    return aReserva(r)
  },

  async cancelarReserva(reservaId: string): Promise<Reserva> {
    return aReserva(await post<ReservaApi>(`/reservas/${reservaId}/cancelar`))
  },

  /** `fechaEstimadaDevolucion` en formato YYYY-MM-DDTHH:MM (hora local). */
  async crearPrestamo(datos: {
    recursoId: string
    solicitanteNombre: string
    fechaEstimadaDevolucion: string
  }): Promise<Prestamo> {
    const p = await post<PrestamoApi>('/prestamos', {
      recurso_id: datos.recursoId,
      solicitante: datos.solicitanteNombre,
      devolucion_esperada: datos.fechaEstimadaDevolucion
    })
    return aPrestamo(p)
  },

  async actualizarEstadoRecurso(recursoId: string, nuevoEstado: EstadoRecurso, motivo?: string): Promise<Recurso> {
    const r = await patch<RecursoApi>(`/recursos/${recursoId}/estado`, { estado: nuevoEstado, motivo })
    return { id: r.id, codigo: r.id, nombre: r.nombre || r.tipo, tipo: r.tipo, estado: r.estado }
  },

  async devolverPrestamo(prestamoId: string, estadoEntrega: 'optimo' | 'danado'): Promise<Prestamo> {
    const p = await post<PrestamoApi>(`/prestamos/${prestamoId}/devolucion`, {
      estado_recurso: estadoEntrega === 'danado' ? 'danado' : 'disponible'
    })
    return aPrestamo(p)
  },

  /** Triaje con IA real en el backend. Si la IA no está disponible responde 503 (IA-503). */
  async triajeConIA(descripcion: string, contexto: { espacioId?: string; recursoId?: string } = {}): Promise<TriajeIAResponse> {
    const t = await post<TriajeApi>('/incidencias/triaje', {
      descripcion,
      espacio_id: contexto.espacioId || undefined,
      recurso_id: contexto.recursoId || undefined
    })
    return {
      categoria: t.categoria,
      prioridad: t.prioridad,
      area: t.area_responsable,
      confianza: t.confianza,
      razonamiento: t.justificacion,
      requiereRevisionHumana: t.requiere_revision
    }
  },

  async crearIncidencia(datos: {
    titulo: string
    descripcion: string
    espacioId?: string
    recursoId?: string
    categoria: CategoriaIncidencia
    prioridad: PrioridadIncidencia
    area: AreaResolutora
    origenTriaje: 'ia' | 'manual'
    confianzaIA?: number
    razonamientoIA?: string
  }): Promise<Incidencia> {
    const i = await post<IncidenciaApi>('/incidencias', {
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      espacio_id: datos.espacioId || undefined,
      recurso_id: datos.recursoId || undefined,
      categoria: datos.categoria,
      prioridad: datos.prioridad,
      area_responsable: datos.area,
      origen_triaje: datos.origenTriaje,
      confianza_ia: datos.origenTriaje === 'ia' ? datos.confianzaIA : undefined,
      justificacion_ia: datos.origenTriaje === 'ia' ? datos.razonamientoIA : undefined
    })
    return aIncidencia(i)
  },

  async resolverIncidencia(incidenciaId: string): Promise<Incidencia> {
    return aIncidencia(await patch<IncidenciaApi>(`/incidencias/${incidenciaId}`, { estado: 'resuelta' }))
  }
}
