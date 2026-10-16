export type SalaId =
  | 'sala-verde'
  | 'sala-amarilla'
  | 'auditorio'
  | 'sala-azul'
  | 'sala-blanca'
  | 'skylab'
  | 'salon-cosmos'
  | 'salon-artemis'
  | 'salon-apolo'
  | 'salon-sputnik'

/** Ocupación calculada por el backend para el instante consultado. */
export type Ocupacion = 'disponible' | 'reservada' | 'mantenimiento'
/** Lo que se pinta: 'desconocido' cuando aún no hay datos o el backend no responde. */
export type EstadoVisual = Ocupacion | 'desconocido'

export type EstadoReservaZ = 'activa' | 'cancelada' | 'finalizada'

export interface ReservaPublica {
  id: number
  sala_id: SalaId
  fecha: string
  hora_inicio: string
  hora_fin: string
  asistentes: number
  estado: EstadoReservaZ
}

export interface ReservaPrivada extends ReservaPublica {
  solicitante: string
  motivo: string
  creada_en: string
  cancelada_en: string | null
}

export interface SalaInfo {
  id: SalaId
  nombre: string
  tipo: string
  descripcion: string
  capacidad: number
  aforo_maximo: number
  equipamiento: string[]
  color: string
  estado: 'disponible' | 'mantenimiento' | 'inhabilitado'
  motivo_bloqueo: string | null
}

export interface SalaEstado extends SalaInfo {
  ocupacion: Ocupacion
  reserva_actual: ReservaPublica | null
  proxima_reserva: ReservaPublica | null
  reservas_dia: ReservaPublica[]
}

export interface Nivel6Estado {
  torre: string
  nivel: number
  area_m2: number
  consulta: { fecha: string; hora: string }
  resumen: { total: number; disponibles: number; reservadas: number; mantenimiento: number }
  salas: SalaEstado[]
}

export interface ReglasReserva {
  hora_apertura: number
  hora_cierre: number
  max_horas_reserva: number
  factor_aforo: number
}

export interface NuevaReserva {
  sala_id: SalaId
  solicitante: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  asistentes: number
  motivo: string
}
