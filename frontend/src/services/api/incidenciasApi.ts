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
   * Registra la incidencia confirmada. Con prioridad bloqueante, el backend pasa el recurso a
   * mantenimiento y bloquea recurso y espacio mientras siga abierta (RN-04).
   */
  async crearIncidencia(datos: {
    titulo: string
    descripcion: string
    espacioId?: string
    recursoId?: string
    categoria: CategoriaIncidencia
    prioridad: PrioridadIncidencia
    area: AreaResolutora
    origenTriaje?: 'ia' | 'manual'
    propuestaIA?: TriajeIAResponse
  }): Promise<Incidencia> {
    // El backend decide si el triaje fue 'ia' o 'manual' comparando lo confirmado con la propuesta.
    const p = datos.propuestaIA
    const i = await post<IncidenciaApi>(ENDPOINTS.INCIDENCIAS.CREAR, {
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      espacio_id: datos.espacioId || undefined,
      recurso_id: datos.recursoId || undefined,
      categoria: datos.categoria,
      prioridad: datos.prioridad,
      area_responsable: datos.area,
      propuesta_ia: p
        ? {
            categoria: p.categoria,
            prioridad: p.prioridad,
            area_responsable: p.area,
            justificacion: p.razonamiento,
            confianza: p.confianza
          }
        : undefined
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
