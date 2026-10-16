/**
 * Endpoints de Salud y Configuración de Reglas de Negocio
 * GET /api/health
 * GET /api/reglas
 * GET /api/catalogos
 * GET /api/datos/reporte
 */
import { ReglasConfig } from '../../types/domain'
import { ENDPOINTS } from '../endpoints'
import { get } from './baseClient'

export const reglasApi = {
  /** Verifica el estado del backend */
  async checkHealth(): Promise<{ estado: string }> {
    return get<{ estado: string }>(ENDPOINTS.HEALTH)
  },

  /** Obtiene las reglas vigentes en el backend */
  async getReglas(): Promise<ReglasConfig> {
    return get<ReglasConfig>(ENDPOINTS.REGLAS)
  },

  /** Obtiene los catálogos cerrados del sistema */
  async getCatalogos(): Promise<Record<string, unknown>> {
    return get<Record<string, unknown>>(ENDPOINTS.CATALOGOS)
  },

  /** Reporte de ingesta inicial de datos */
  async getReporteDatos(): Promise<Record<string, unknown>> {
    return get<Record<string, unknown>>(ENDPOINTS.DATOS.REPORTE)
  }
}
