/**
 * Endpoints del Módulo de Préstamos de Hardware
 * GET /api/prestamos
 * POST /api/prestamos
 * POST /api/prestamos/{id}/devolucion
 */
import { Prestamo } from '../../types/domain'
import { ENDPOINTS } from '../endpoints'
import { get, post } from './baseClient'
import { recursoPorId } from './recursosApi'

export interface PrestamoApi {
  id: number
  recurso_id: string
  solicitante: string
  salida: string
  devolucion_esperada: string
  devolucion_real: string | null
  estado: Prestamo['estado']
}

export const aPrestamo = (p: PrestamoApi): Prestamo => {
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

export const prestamosApi = {
  /** Lista los préstamos activos e históricos */
  async getPrestamos(): Promise<Prestamo[]> {
    return (await get<PrestamoApi[]>(ENDPOINTS.PRESTAMOS.LISTAR)).map(aPrestamo)
  },

  /**
   * Registra un nuevo préstamo. El servidor valida cupo máximo por solicitante y disponibilidad (RN-02, RN-03).
   * `fechaEstimadaDevolucion` en formato ISO local YYYY-MM-DDTHH:MM
   */
  async crearPrestamo(datos: {
    recursoId: string
    solicitanteNombre: string
    fechaEstimadaDevolucion: string
  }): Promise<Prestamo> {
    const p = await post<PrestamoApi>(ENDPOINTS.PRESTAMOS.CREAR, {
      recurso_id: datos.recursoId,
      solicitante: datos.solicitanteNombre,
      devolucion_esperada: datos.fechaEstimadaDevolucion
    })
    return aPrestamo(p)
  },

  /**
   * Procesa la devolución de un préstamo.
   * `estadoEntrega`: 'optimo' (vuelve a 'disponible') o 'danado' (pasa a 'danado'/'mantenimiento').
   */
  async devolverPrestamo(prestamoId: string, estadoEntrega: 'optimo' | 'danado'): Promise<Prestamo> {
    const p = await post<PrestamoApi>(ENDPOINTS.PRESTAMOS.DEVOLUCION(prestamoId), {
      estado_recurso: estadoEntrega === 'danado' ? 'danado' : 'disponible'
    })
    return aPrestamo(p)
  }
}
