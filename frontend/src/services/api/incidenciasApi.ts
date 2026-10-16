/**
 * Endpoints del Módulo de Incidencias y Triaje Asistido por Inteligencia Artificial
 * GET /api/incidencias
 * POST /api/incidencias/triaje
 * POST /api/incidencias
 * PATCH /api/incidencias/{id}
 */
import {
  AreaResolutora,
  CategoriaIncidencia,
  Incidencia,
  PrioridadIncidencia,
  TriajeIAResponse
} from '../../types/domain'
import { ENDPOINTS } from '../endpoints'
import { get, patch, post } from './baseClient'
import { nombreEspacio } from './espaciosApi'

export interface IncidenciaApi {
  id: number
  titulo: string
  descripcion: string
  categoria: CategoriaIncidencia | null
  prioridad: PrioridadIncidencia | null
  area_responsable: AreaResolutora | null
  estado: Incidencia['estado']
  espacio_id: string | null
  recurso_id: string | null
  origen_triaje: Incidencia['origenTriaje']
  confianza_ia: number | null
  justificacion_ia: string | null
  creada_en: string
}

export interface TriajeApi {
  categoria: CategoriaIncidencia
  prioridad: PrioridadIncidencia
  area_responsable: AreaResolutora
  justificacion: string
  confianza: number
  requiere_revision: boolean
}

export const aIncidencia = (i: IncidenciaApi): Incidencia => ({
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

export const incidenciasApi = {
  /** Lista todas las incidencias registradas */
  async getIncidencias(): Promise<Incidencia[]> {
    return (await get<IncidenciaApi[]>(ENDPOINTS.INCIDENCIAS.LISTAR)).map(aIncidencia)
  },

  /**
   * Triaje semántico ejecutado por IA en el backend.
   * Si el proveedor de IA falla responde 503 (código "IA-503").
   */
  async triajeConIA(
    descripcion: string,
    contexto: { espacioId?: string; recursoId?: string } = {}
  ): Promise<TriajeIAResponse> {
    const t = await post<TriajeApi>(ENDPOINTS.INCIDENCIAS.TRIAJE_IA, {
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

  /**
   * Registra una nueva incidencia. Si es crítica/alta, el backend inhabilita el espacio/recurso (RN-04).
   */
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
    const i = await post<IncidenciaApi>(ENDPOINTS.INCIDENCIAS.CREAR, {
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

  /** Marca una incidencia como resuelta */
  async resolverIncidencia(incidenciaId: string): Promise<Incidencia> {
    return aIncidencia(
      await patch<IncidenciaApi>(ENDPOINTS.INCIDENCIAS.RESOLVER(incidenciaId), {
        estado: 'resuelta'
      })
    )
  }
}
