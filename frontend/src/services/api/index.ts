/**
 * Índice de APIs modulares del frontend.
 *
 * Cada archivo representa un router del backend FastAPI:
 * - baseClient: configuración HTTP y manejo de errores {codigo, mensaje}
 * - reglasApi: GET /api/health, GET /api/reglas, GET /api/catalogos
 * - espaciosApi: /api/espacios
 * - recursosApi: /api/recursos
 * - reservasApi: /api/reservas
 * - prestamosApi: /api/prestamos
 * - incidenciasApi: /api/incidencias y /api/incidencias/triaje
 * - authApi / adminApi: /api/auth y /api/admin
 */

export * from './baseClient'
export * from './reglasApi'
export * from './espaciosApi'
export * from './recursosApi'
export * from './reservasApi'
export * from './prestamosApi'
export * from './incidenciasApi'
export * from './authApi'
