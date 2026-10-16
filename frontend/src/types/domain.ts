/**
 * Tipos de dominio que consumen los componentes.
 * Los datos llegan del backend (snake_case) y apiClient.ts los traduce a estos tipos
 * según docs/integracion-frontend.md §3. Nada de aquí se inventa en el navegador.
 */
export type EstadoEspacio = 'disponible' | 'mantenimiento' | 'inhabilitado'
export type TipoEspacio = 'aula' | 'cubiculo'

export type EstadoRecurso = 'disponible' | 'prestado' | 'mantenimiento' | 'danado' | 'baja'
/** Texto libre del dataset oficial (portátil, videobeam, ...). */
export type TipoRecurso = string

export type EstadoReserva = 'activa' | 'cancelada' | 'finalizada'
export type EstadoPrestamo = 'activo' | 'devuelto'
export type EstadoIncidencia = 'abierta' | 'en_proceso' | 'resuelta'
export type OrigenTriaje = 'ia' | 'manual' | 'pendiente'

export type CategoriaIncidencia =
  | 'infraestructura'
  | 'equipo_tecnologico'
  | 'conectividad'
  | 'limpieza'
  | 'seguridad'
  | 'bienestar'
  | 'otro'

export type PrioridadIncidencia = 'critica' | 'alta' | 'media' | 'baja'

export type AreaResolutora =
  | 'mantenimiento'
  | 'soporte_ti'
  | 'bienestar'
  | 'seguridad'
  | 'administracion'

export interface Espacio {
  id: string
  nombre: string
  tipo: TipoEspacio
  estado: EstadoEspacio
  /** Aforo oficial (`aforo`). */
  capacidad: number
  /** Aforo con el FACTOR_AFORO vigente, calculado por el backend. */
  aforoPermitido: number
  ubicacion?: string
  /** Solo para pintar: incidencia abierta con prioridad bloqueante. Quien bloquea es el backend (RN-04). */
  incidenciaActivaId?: string
  // Presentación y geometría visual (layout3D.ts)
  piso?: number
  equipamiento?: string[]
  coordenadas3D?: [number, number, number]
  dimensiones3D?: [number, number, number]
  colorTema?: string
}

export interface Recurso {
  id: string
  codigo: string
  nombre: string
  tipo: TipoRecurso
  estado: EstadoRecurso
  serial?: string
  espacioActualId?: string
  espacioActualNombre?: string
  solicitanteActual?: string
  observaciones?: string
  fechaUltimoMantenimiento?: string
}

export interface Reserva {
  id: string
  espacioId: string
  espacioNombre: string
  solicitanteNombre: string
  motivo?: string
  /** ISO local, p. ej. 2026-10-16T14:00:00 */
  horaInicio: string
  horaFin: string
  numPersonas: number
  estado: EstadoReserva
  creadaEn: string
}

export interface Prestamo {
  id: string
  recursoId: string
  recursoNombre: string
  recursoCodigo: string
  solicitanteNombre: string
  fechaPrestamo: string
  fechaEstimadaDevolucion: string
  fechaDevolucionReal?: string
  estado: EstadoPrestamo
}

export interface Incidencia {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  espacioId?: string
  espacioNombre?: string
  recursoId?: string
  recursoCodigo?: string
  categoria: CategoriaIncidencia | null
  prioridad: PrioridadIncidencia | null
  area: AreaResolutora | null
  estado: EstadoIncidencia
  confianzaIA?: number
  razonamientoIA?: string
  sugerenciaAccion?: string
  origenTriaje: OrigenTriaje
  timestamp: string
}

export interface ReglasConfig {
  hora_apertura: number
  hora_cierre: number
  max_horas_reserva: number
  factor_aforo: number
  max_prestamos_activos: number
  prioridades_bloqueantes: PrioridadIncidencia[]
  umbral_confianza_ia: number
  max_largo_descripcion: number
}

export interface TriajeIAResponse {
  categoria: CategoriaIncidencia
  prioridad: PrioridadIncidencia
  area: AreaResolutora
  confianza: number
  razonamiento: string
  sugerenciaAccion?: string
  /** Lo decide el backend con UMBRAL_CONFIANZA_IA. */
  requiereRevisionHumana: boolean
}

export interface ResultadoValidacion {
  valido: boolean
  codigo: string
  mensaje: string
  detalles?: Record<string, unknown>
}
