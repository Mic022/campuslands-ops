/**
 * Fachada unificada de acceso a datos de Campuslands Ops.
 *
 * Agrega los módulos independientes de services/api/ para mantener compatibilidad
 * total con App.tsx y demás componentes, mientras que el equipo de backend puede
 * consultar, conectar o actualizar cada submódulo por separado:
 *
 * - services/endpoints.ts         -> Catálogo centralizado de URLs y rutas
 * - services/api/reglasApi.ts     -> /api/health, /api/reglas, /api/catalogos
 * - services/api/espaciosApi.ts   -> /api/espacios
 * - services/api/recursosApi.ts   -> /api/recursos
 * - services/api/reservasApi.ts   -> /api/reservas
 * - services/api/prestamosApi.ts  -> /api/prestamos
 * - services/api/incidenciasApi.ts-> /api/incidencias
 */
import {
  ApiError,
  reglasApi,
  espaciosApi,
  recursosApi,
  reservasApi,
  prestamosApi,
  incidenciasApi
} from './api'

export { ApiError } from './api'
export { ENDPOINTS } from './endpoints'

export const apiClient = {
  // Salud y Configuración de Reglas
  checkHealth: reglasApi.checkHealth,
  getReglas: reglasApi.getReglas,
  getCatalogos: reglasApi.getCatalogos,
  getReporteDatos: reglasApi.getReporteDatos,

  // Espacios Oficiales
  getEspacios: espaciosApi.getEspacios,
  obtenerEspacio: espaciosApi.obtenerEspacio,
  crearEspacio: espaciosApi.crearEspacio,
  actualizarEspacio: espaciosApi.actualizarEspacio,

  // Recursos y Hardware
  getRecursos: recursosApi.getRecursos,
  obtenerRecurso: recursosApi.obtenerRecurso,
  actualizarEstadoRecurso: recursosApi.actualizarEstadoRecurso,

  // Reservas
  getReservas: reservasApi.getReservas,
  crearReserva: reservasApi.crearReserva,
  cancelarReserva: reservasApi.cancelarReserva,

  // Préstamos
  getPrestamos: prestamosApi.getPrestamos,
  crearPrestamo: prestamosApi.crearPrestamo,
  devolverPrestamo: prestamosApi.devolverPrestamo,

  // Incidencias y Triaje Asistido por IA
  getIncidencias: incidenciasApi.getIncidencias,
  triajeConIA: incidenciasApi.triajeConIA,
  crearIncidencia: incidenciasApi.crearIncidencia,
  resolverIncidencia: incidenciasApi.resolverIncidencia
}
