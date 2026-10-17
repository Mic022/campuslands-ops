/**
 * Cliente HTTP base para la comunicación con el backend FastAPI (/api).
 * Maneja serialización, captura de errores {codigo, mensaje} y status codes.
 */

export class ApiError extends Error {
  codigo: string
  status: number
  detalles?: { campo: string; mensaje: string }[]

  constructor(status: number, codigo: string, mensaje: string, detalles?: { campo: string; mensaje: string }[]) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.codigo = codigo
    this.detalles = detalles
  }
}

/**
 * Sesión: el navegador envía solo la cookie HttpOnly (el JS no puede leerla). El token CSRF
 * vive únicamente en memoria y se adjunta en cada método que escribe.
 */
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS'])
let tokenCsrf: string | null = null

export const csrf = {
  poner(token: string | null) {
    tokenCsrf = token
  },
  cabecera(metodo = 'GET'): Record<string, string> {
    return tokenCsrf && !METODOS_SEGUROS.has(metodo.toUpperCase()) ? { 'X-CSRF-Token': tokenCsrf } : {}
  }
}

/** Evento global: una petición protegida respondió 401 (sesión caducada, revocada o inexistente). */
export const EVENTO_SESION_EXPIRADA = 'campus:sesion-expirada'

export async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${ruta}`, {
      ...init,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...csrf.cabecera(init.method),
        ...(init.headers || {})
      }
    })
  } catch {
    throw new ApiError(0, 'RED', 'No hay conexión con el servidor backend.')
  }

  if (res.status === 204) return undefined as T
  const cuerpo = await res.json().catch(() => null)
  if (res.status === 401 && !ruta.startsWith('/auth/')) {
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA, { detail: cuerpo?.codigo }))
  }
  if (!res.ok) {
    if (!cuerpo || res.status === 502 || res.status === 504) {
      throw new ApiError(res.status, 'RED', 'El servidor backend no está disponible.')
    }
    const detalles = cuerpo.detalles as { campo: string; mensaje: string }[] | undefined
    const mensaje = detalles?.length
      ? `${cuerpo.mensaje}: ${detalles.map(d => `${d.campo} (${d.mensaje})`).join(', ')}`
      : cuerpo.mensaje || 'Error inesperado.'
    throw new ApiError(res.status, cuerpo.codigo || `HTTP-${res.status}`, mensaje, detalles)
  }
  return cuerpo as T
}

export const get = <T>(ruta: string) => pedir<T>(ruta, { method: 'GET' })

export const post = <T>(ruta: string, cuerpo?: unknown) =>
  pedir<T>(ruta, { method: 'POST', body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })

export const patch = <T>(ruta: string, cuerpo: unknown) =>
  pedir<T>(ruta, { method: 'PATCH', body: JSON.stringify(cuerpo) })

export const del = <T>(ruta: string) =>
  pedir<T>(ruta, { method: 'DELETE' })
