/**
 * Catálogo centralizado de endpoints del Backend FastAPI (/api).
 *
 * Facilita al equipo de backend (Nic, Mic, Jonatan, Sergio) auditar,
 * conectar o actualizar rutas sin buscar URLs dispersas por el código.
 */

export const ENDPOINTS = {
  // Sesión
  AUTH: {
    LOGIN: '/auth/login',
    YO: '/auth/yo',
  },

  // Salud y Configuración de Reglas de Negocio
  HEALTH: '/health',
  CATALOGOS: '/catalogos',
  REGLAS: '/reglas',

  // Reporte de carga de datos iniciales
  DATOS: {
    REPORTE: '/datos/reporte',
  },

  // Módulo 02 · Espacios
  ESPACIOS: {
    LISTAR: '/espacios',
    OBTENER: (id: string) => `/espacios/${id}`,
    CREAR: '/espacios',
    ACTUALIZAR: (id: string) => `/espacios/${id}`,
    AGENDA: (id: string) => `/espacios/${id}/reservas`,
  },

  // Reservas de Espacios
  RESERVAS: {
    LISTAR: '/reservas',
    CREAR: '/reservas',
    OBTENER: (id: string | number) => `/reservas/${id}`,
    CANCELAR: (id: string | number) => `/reservas/${id}/cancelar`,
  },

  // Módulo 03 · Hardware y Recursos Tecnológicos
  RECURSOS: {
    LISTAR: '/recursos',
    OBTENER: (id: string) => `/recursos/${id}`,
    ACTUALIZAR_ESTADO: (id: string) => `/recursos/${id}/estado`,
  },

  // Préstamos de Hardware
  PRESTAMOS: {
    LISTAR: '/prestamos',
    CREAR: '/prestamos',
    OBTENER: (id: string | number) => `/prestamos/${id}`,
    DEVOLUCION: (id: string | number) => `/prestamos/${id}/devolucion`,
  },

  // Módulo 04 · Incidencias y Triaje con Inteligencia Artificial
  INCIDENCIAS: {
    LISTAR: '/incidencias',
    OBTENER: (id: string | number) => `/incidencias/${id}`,
    TRIAJE_IA: '/incidencias/triaje',
    CREAR: '/incidencias',
    RESOLVER: (id: string | number) => `/incidencias/${id}`,
  },

} as const
