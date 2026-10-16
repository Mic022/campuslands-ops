/**
 * Endpoints del Módulo de Reservas de Espacios
 * GET /api/reservas
 * POST /api/reservas
 * POST /api/reservas/{id}/cancelar
 */
import { Reserva } from '../../types/domain'
import { ENDPOINTS } from '../endpoints'
import { get, post } from './baseClient'
import { nombreEspacio } from './espaciosApi'

export interface ReservaApi {
  id: number
  espacio_id: string
  solicitante: string
  inicio: string
  fin: string
  asistentes: number
  estado: Reserva['estado']
  creada_en: string
}

export const aReserva = (r: ReservaApi): Reserva => ({
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

export const reservasApi = {
  /** Lista todas las reservas del sistema */
  async getReservas(): Promise<Reserva[]> {
    return (await get<ReservaApi[]>(ENDPOINTS.RESERVAS.LISTAR)).map(aReserva)
  },

  /**
   * Crea una nueva reserva. El backend valida aforo, horario, solapes y bloqueos (RN-01, RN-04, RN-05).
   * `inicio` y `fin` en formato ISO local YYYY-MM-DDTHH:MM
   */
  async crearReserva(datos: {
    espacioId: string
    solicitanteNombre: string
    inicio: string
    fin: string
    numPersonas: number
  }): Promise<Reserva> {
    const r = await post<ReservaApi>(ENDPOINTS.RESERVAS.CREAR, {
      espacio_id: datos.espacioId,
      solicitante: datos.solicitanteNombre,
      inicio: datos.inicio,
      fin: datos.fin,
      asistentes: datos.numPersonas
    })
    return aReserva(r)
  },

  /** Cancela una reserva activa */
  async cancelarReserva(reservaId: string): Promise<Reserva> {
    return aReserva(await post<ReservaApi>(ENDPOINTS.RESERVAS.CANCELAR(reservaId)))
  }
}
