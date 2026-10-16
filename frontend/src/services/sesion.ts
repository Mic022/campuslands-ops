/**
 * Sesión del usuario (token + datos públicos). Se guarda en sessionStorage:
 * dura lo que la pestaña y nunca va en el código.
 */
export type Rol = 'admin' | 'usuario'

export interface UsuarioSesion {
  usuario: string
  nombre: string
  rol: Rol
}

export interface Sesion {
  token: string
  usuario: UsuarioSesion
}

const CLAVE = 'campus-ops.sesion'
let enMemoria: Sesion | null = null
const oyentes = new Set<() => void>()

export function leerSesion(): Sesion | null {
  if (enMemoria) return enMemoria
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    enMemoria = crudo ? (JSON.parse(crudo) as Sesion) : null
  } catch {
    enMemoria = null
  }
  return enMemoria
}

export function guardarSesion(sesion: Sesion | null) {
  enMemoria = sesion
  try {
    if (sesion) sessionStorage.setItem(CLAVE, JSON.stringify(sesion))
    else sessionStorage.removeItem(CLAVE)
  } catch {
    // sin almacenamiento: la sesión vive solo en memoria
  }
}

/** Se llama cuando el backend responde 401: la sesión venció o no es válida. */
export function alExpirarSesion(fn: () => void) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

export function expirarSesion() {
  guardarSesion(null)
  oyentes.forEach(fn => fn())
}

export const esAdmin = () => leerSesion()?.usuario.rol === 'admin'
export const nombreSesion = () => leerSesion()?.usuario.nombre ?? ''

/** Misma persona aunque cambien mayúsculas, tildes o espacios ("  Ana " = "ana"). */
export const mismaPersona = (a?: string | null, b?: string | null) => {
  const norm = (s?: string | null) =>
    (s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
  return norm(a) !== '' && norm(a) === norm(b)
}
