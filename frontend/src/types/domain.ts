export type EstadoEspacio = 'disponible' | 'mantenimiento' | 'inhabilitado'
export type TipoEspacio = 'aula' | 'cubiculo'

export type EstadoRecurso = 'disponible' | 'prestado' | 'mantenimiento' | 'danado' | 'baja'
export type TipoRecurso = 'laptop' | 'kit_iot' | 'proyector' | 'pantalla' | 'periferico'

export type EstadoReserva = 'activa' | 'cancelada' | 'finalizada'
export type EstadoPrestamo = 'activo' | 'devuelto'
export type EstadoIncidencia = 'abierta' | 'en_proceso' | 'resuelta'

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
  piso: number
  capacidad: number
  estado: EstadoEspacio
  equipamiento: string[]
  coordenadas3D: [number, number, number]
  dimensiones3D: [number, number, number]
  colorTema?: string
  incidenciaActivaId?: string
}

export interface Recurso {
  id: string
  codigo: string
  nombre: string
  tipo: TipoRecurso
  estado: EstadoRecurso
  espacioActualId?: string
  espacioActualNombre?: string
  solicitanteActual?: string
  fechaUltimoMantenimiento?: string
  observaciones?: string
}

export interface Reserva {
  id: string
  espacioId: string
  espacioNombre: string
  solicitanteNombre: string
  solicitanteEmail: string
  horaInicio: string
  horaFin: string
  numPersonas: number
  motivo: string
  estado: EstadoReserva
  creadaEn: string
}

export interface Prestamo {
  id: string
  recursoId: string
  recursoNombre: string
  recursoCodigo: string
  solicitanteNombre: string
  solicitanteEmail: string
  fechaPrestamo: string
  fechaEstimadaDevolucion: string
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
  categoria: CategoriaIncidencia
  prioridad: PrioridadIncidencia
  area: AreaResolutora
  estado: EstadoIncidencia
  confianzaIA: number
  razonamientoIA: string
  sugerenciaAccion: string
  origenTriaje: 'ia' | 'manual'
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

export interface ResultadoValidacion {
  valido: boolean
  codigo: string
  mensaje: string
  detalles?: Record<string, unknown>
}

export interface TriajeIAResponse {
  categoria: CategoriaIncidencia
  prioridad: PrioridadIncidencia
  area: AreaResolutora
  confianza: number
  razonamiento: string
  sugerenciaAccion: string
  requiereRevisionHumana: boolean
}
