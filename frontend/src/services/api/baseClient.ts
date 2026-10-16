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
    this.status = status
    this.codigo = codigo
    this.detalles = detalles
  }
}

export async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${ruta}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
    })
  } catch {
    throw new ApiError(0, 'RED', 'No hay conexión con el servidor backend.')
  }

  const cuerpo = await res.json().catch(() => null)
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
