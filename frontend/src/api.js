// Cliente HTTP único: agrega el token de sesión y normaliza los errores del backend a {codigo, mensaje}.
export class ApiError extends Error {
  constructor(codigo, mensaje, detalles) {
    super(mensaje)
    this.codigo = codigo
    this.detalles = detalles
  }
}

const CLAVE_SESION = 'campus-ops-sesion'
let alExpirar = () => {}

export function leerSesion() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_SESION))
  } catch {
    return null
  }
}

export function guardarSesion(sesion) {
  try {
    if (sesion) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    else sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // sin almacenamiento disponible: la sesión dura lo que dure la pestaña en memoria
  }
}

// App registra aquí qué hacer cuando el backend responde 401 (sesión vencida o inválida).
export function alExpirarSesion(fn) {
  alExpirar = fn
}

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  const token = leerSesion()?.token
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError('RED', 'No se pudo conectar con el servidor.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && ruta !== '/auth/login') alExpirar()
    throw new ApiError(
      data?.codigo ?? `HTTP-${res.status}`,
      data?.mensaje ?? 'Ocurrió un error inesperado.',
      data?.detalles,
    )
  }
  return data
}
