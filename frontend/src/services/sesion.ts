/**
 * Datos públicos de la persona con sesión (nombre y rol), solo en memoria.
 *
 * La sesión real vive en el servidor y viaja en una cookie HttpOnly que el JavaScript no puede
 * leer: aquí no se guarda ningún token ni nada en localStorage/sessionStorage. AuthContext
 * rellena estos datos con GET /api/auth/yo al cargar la app y los borra al cerrar sesión.
 * El backend vuelve a comprobar el rol en cada petición; esto solo decide qué se muestra.
 */
import type { Rol, UsuarioSesion } from './api/authApi'

export type { Rol, UsuarioSesion }

let actual: UsuarioSesion | null = null
const oyentes = new Set<() => void>()

export function leerSesion(): { usuario: UsuarioSesion } | null {
  return actual ? { usuario: actual } : null
}

export function guardarSesion(usuario: UsuarioSesion | null) {
  actual = usuario
}

/** Avisos de sesión caducada (los dispara AuthContext cuando el backend responde 401). */
export function alExpirarSesion(fn: () => void) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

export function expirarSesion() {
  guardarSesion(null)
  oyentes.forEach(fn => fn())
}

export const esAdmin = () => actual?.rol === 'admin'
export const nombreSesion = () => actual?.nombre ?? ''

/** Misma persona aunque cambien mayúsculas, tildes o espacios ("  Ana " = "ana"). */
export const mismaPersona = (a?: string | null, b?: string | null) => {
  const norm = (s?: string | null) =>
    (s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
  return norm(a) !== '' && norm(a) === norm(b)
}
