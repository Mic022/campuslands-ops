// Cliente HTTP único: normaliza los errores del backend a {codigo, mensaje}.
export class ApiError extends Error {
  constructor(codigo, mensaje, detalles) {
    super(mensaje)
    this.codigo = codigo
    this.detalles = detalles
  }
}

export async function api(ruta, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`/api${ruta}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('RED', 'No se pudo conectar con el servidor.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      data?.codigo ?? `HTTP-${res.status}`,
      data?.mensaje ?? 'Ocurrió un error inesperado.',
      data?.detalles,
    )
  }
  return data
}
