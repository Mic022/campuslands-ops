/**
 * Autenticación y administración de cuentas (/api/auth, /api/admin).
 * El rol que muestra la UI siempre viene de estas respuestas del backend.
 */
import { get, patch, post } from './baseClient'
import { ENDPOINTS } from '../endpoints'

export type Rol = 'admin' | 'usuario'

export interface UsuarioSesion {
  usuario: string
  nombre: string
  email: string | null
  rol: Rol
}

export interface SesionApi {
  usuario: UsuarioSesion
  csrf_token: string
  expira_en: string
}

export interface PoliticaClave {
  min_largo: number
  max_largo: number
  mayuscula: boolean
  minuscula: boolean
  numero: boolean
  simbolo: boolean
}

export interface PoliticaAcceso {
  clave: PoliticaClave
  registro_publico: boolean
  recuperacion_disponible: boolean
  recordar_dias: number
}

export interface UsuarioAdmin extends UsuarioSesion {
  activo: boolean
  bloqueado: boolean
  ultimo_acceso: string | null
  creado_en: string | null
}

export const authApi = {
  politica: () => get<PoliticaAcceso>(ENDPOINTS.AUTH.POLITICA),
  sesion: () => get<SesionApi>(ENDPOINTS.AUTH.YO),
  login: (datos: { usuario: string; clave: string; recordar: boolean }) => post<SesionApi>(ENDPOINTS.AUTH.LOGIN, datos),
  logout: () => post<void>(ENDPOINTS.AUTH.LOGOUT),
  registro: (datos: { nombre: string; usuario: string; email: string; clave: string; confirmacion: string }) =>
    post<UsuarioSesion>(ENDPOINTS.AUTH.REGISTRO, datos),
  recuperar: (email: string) => post<{ mensaje: string }>(ENDPOINTS.AUTH.RECUPERAR, { email }),
  restablecer: (datos: { token: string; clave: string; confirmacion: string }) =>
    post<{ mensaje: string }>(ENDPOINTS.AUTH.RESTABLECER, datos)
}

export const adminApi = {
  listarUsuarios: (filtros: { buscar?: string; rol?: Rol | ''; activo?: '' | 'true' | 'false' } = {}) => {
    const params = new URLSearchParams()
    if (filtros.buscar?.trim()) params.set('buscar', filtros.buscar.trim())
    if (filtros.rol) params.set('rol', filtros.rol)
    if (filtros.activo) params.set('activo', filtros.activo)
    const qs = params.toString()
    return get<UsuarioAdmin[]>(`${ENDPOINTS.ADMIN.USUARIOS}${qs ? `?${qs}` : ''}`)
  },
  crearUsuario: (datos: { nombre: string; usuario: string; email: string | null; clave: string; rol: Rol }) =>
    post<UsuarioAdmin>(ENDPOINTS.ADMIN.USUARIOS, datos),
  actualizarUsuario: (usuario: string, cambios: { nombre?: string; rol?: Rol; activo?: boolean }) =>
    patch<UsuarioAdmin>(ENDPOINTS.ADMIN.USUARIO(usuario), cambios),
  desbloquear: (usuario: string) => post<UsuarioAdmin>(ENDPOINTS.ADMIN.DESBLOQUEAR(usuario))
}
