/**
 * Endpoints de sesión
 * POST /api/auth/login
 * GET  /api/auth/yo
 */
import { guardarSesion, Sesion, UsuarioSesion } from '../sesion'
import { ENDPOINTS } from '../endpoints'
import { get, post } from './baseClient'

export const authApi = {
  async login(usuario: string, clave: string): Promise<Sesion> {
    const r = await post<{ token: string; usuario: UsuarioSesion }>(ENDPOINTS.AUTH.LOGIN, { usuario, clave })
    const sesion = { token: r.token, usuario: r.usuario }
    guardarSesion(sesion)
    return sesion
  },

  yo: () => get<UsuarioSesion>(ENDPOINTS.AUTH.YO),

  salir() {
    guardarSesion(null)
  }
}
