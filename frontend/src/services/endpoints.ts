/**
 * Catálogo centralizado de endpoints del Backend FastAPI (/api).
 *
 * Facilita al equipo de backend (Nic, Mic, Jonatan, Sergio) auditar,
 * conectar o actualizar rutas sin buscar URLs dispersas por el código.
 */

export const ENDPOINTS = {
  // Autenticación (sesión por cookie HttpOnly + token CSRF)
  AUTH: {
    POLITICA: '/auth/politica',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    YO: '/auth/yo',
    REGISTRO: '/auth/registro',
    RECUPERAR: '/auth/recuperar',
    RESTABLECER: '/auth/restablecer',
  },

  // Administración de cuentas (solo rol admin; el backend lo verifica en cada petición)
  ADMIN: {
    USUARIOS: '/admin/usuarios',
    USUARIO: (usuario: string) => `/admin/usuarios/${encodeURIComponent(usuario)}`,
    DESBLOQUEAR: (usuario: string) => `/admin/usuarios/${encodeURIComponent(usuario)}/desbloquear`,
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

  // Módulo 01 · Torre Zenith (Gemelo Digital)
  NIVEL6: {
    ESTADO: '/nivel6/estado',
    REGLAS: '/nivel6/reglas',
    RESERVAS: '/nivel6/reservas',
    SALAS: '/nivel6/salas',
    RESERVA_CANCELAR: (id: string | number) => `/nivel6/reservas/${id}/cancelar`,
  }
} as const
