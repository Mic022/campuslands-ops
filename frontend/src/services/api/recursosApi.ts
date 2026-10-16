/**
 * Endpoints del Módulo de Hardware y Recursos Tecnológicos
 * GET /api/recursos
 * GET /api/recursos/{id}
 * PATCH /api/recursos/{id}/estado
 */
import { EstadoRecurso, Prestamo, Recurso } from '../../types/domain'
import { ENDPOINTS } from '../endpoints'
import { get, patch } from './baseClient'
import { nombreEspacio } from './espaciosApi'

export interface RecursoApi {
  id: string
  tipo: string
  nombre: string | null
  serial: string | null
  estado: EstadoRecurso
  espacio_id: string | null
}

let recursosCache: RecursoApi[] = []

export const recursoPorId = (id: string) => recursosCache.find(r => r.id === id)

export const recursosApi = {
  /** Lista los equipos del inventario con su estado y custodio */
  async getRecursos(prestamosActivos: Prestamo[] = []): Promise<Recurso[]> {
    recursosCache = await get<RecursoApi[]>(ENDPOINTS.RECURSOS.LISTAR)
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

  /** Obtiene un recurso por su ID */
  async obtenerRecurso(id: string): Promise<Recurso> {
    const r = await get<RecursoApi>(ENDPOINTS.RECURSOS.OBTENER(id))
    return {
      id: r.id,
      codigo: r.id,
      nombre: r.nombre || r.tipo,
      tipo: r.tipo,
      estado: r.estado,
      serial: r.serial ?? undefined,
      espacioActualId: r.espacio_id ?? undefined,
      espacioActualNombre: nombreEspacio(r.espacio_id)
    }
  },

  /** Cambia el estado de un equipo (RN-03 máquina de estados) */
  async actualizarEstadoRecurso(recursoId: string, nuevoEstado: EstadoRecurso, motivo?: string): Promise<Recurso> {
    const r = await patch<RecursoApi>(ENDPOINTS.RECURSOS.ACTUALIZAR_ESTADO(recursoId), {
      estado: nuevoEstado,
      motivo
    })
    return {
      id: r.id,
      codigo: r.id,
      nombre: r.nombre || r.tipo,
      tipo: r.tipo,
      estado: r.estado
    }
  }
}
