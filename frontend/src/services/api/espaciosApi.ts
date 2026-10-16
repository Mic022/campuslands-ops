/**
 * Endpoints del Módulo de Espacios
 * GET /api/espacios
 * GET /api/espacios/{id}
 * POST /api/espacios
 * PATCH /api/espacios/{id}
 * GET /api/espacios/{id}/reservas
 */
import { Espacio } from '../../types/domain'
import { obtenerLayout3D } from '../../data/layout3D'
import { ENDPOINTS } from '../endpoints'
import { get, post, patch } from './baseClient'
import type { RecursoApi } from './recursosApi'

export interface EspacioApi {
  id: string
  nombre: string
  tipo: Espacio['tipo']
  aforo: number
  aforo_permitido?: number
  estado: Espacio['estado']
  ubicacion: string | null
}

// Caché ligera para resolución de nombres en otros módulos
let espaciosCache: EspacioApi[] = []

export const nombreEspacio = (id: string | null) =>
  espaciosCache.find(e => e.id === id)?.nombre ?? id ?? undefined

export const aEspacio = (e: EspacioApi, recursos: RecursoApi[] = []): Espacio => {
  const layout = obtenerLayout3D(e.id)
  return {
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo,
    estado: e.estado,
    capacidad: e.aforo,
    aforoPermitido: e.aforo_permitido ?? e.aforo,
    ubicacion: e.ubicacion ?? undefined,
    piso: layout.piso,
    // Equipamiento real: los recursos registrados en este espacio (GET /api/recursos).
    equipamiento: recursos.filter(r => r.espacio_id === e.id).map(r => r.nombre || r.tipo),
    coordenadas3D: layout.coordenadas3D,
    dimensiones3D: layout.dimensiones3D,
    colorTema: layout.colorTema
  }
}

export const espaciosApi = {
  /** Lista todos los espacios oficiales con aforo y estado */
  async getEspacios(): Promise<Espacio[]> {
    const [espacios, recursos] = await Promise.all([
      get<EspacioApi[]>(ENDPOINTS.ESPACIOS.LISTAR),
      get<RecursoApi[]>(ENDPOINTS.RECURSOS.LISTAR)
    ])
    espaciosCache = espacios
    return espacios.map(e => aEspacio(e, recursos))
  },

  /** Obtiene un espacio por su ID / slug */
  async obtenerEspacio(id: string): Promise<Espacio> {
    const e = await get<EspacioApi>(ENDPOINTS.ESPACIOS.OBTENER(id))
    return aEspacio(e, await get<RecursoApi[]>(`${ENDPOINTS.RECURSOS.LISTAR}?espacio_id=${id}`))
  },

  /** Crea un nuevo espacio (si el backend lo permite) */
  async crearEspacio(datos: Partial<EspacioApi>): Promise<Espacio> {
    const e = await post<EspacioApi>(ENDPOINTS.ESPACIOS.CREAR, datos)
    return aEspacio(e)
  },

  /** Actualiza un espacio */
  async actualizarEspacio(id: string, datos: Partial<EspacioApi>): Promise<Espacio> {
    const e = await patch<EspacioApi>(ENDPOINTS.ESPACIOS.ACTUALIZAR(id), datos)
    return aEspacio(e)
  }
}
