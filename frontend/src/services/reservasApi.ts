/**
 * Cliente HTTP del módulo Torre Zenith · Nivel 6.
 *
 * A diferencia de apiClient.ts (store en memoria para los demás módulos), aquí todo
 * va contra el backend FastAPI: si no responde, la UI muestra estados "desconocido".
 */
import {
  Nivel6Estado,
  NuevaReserva,
  ReglasReserva,
  ReservaPrivada,
  ReservaPublica,
  SalaId,
  SalaInfo
} from '../types/torreZenith'

export class ReservaApiError extends Error {
  codigo: string
  status: number
  mensaje: string
  detalles?: { campo: string; mensaje: string }[]

  constructor(status: number, codigo: string, mensaje: string, detalles?: { campo: string; mensaje: string }[]) {
    super(mensaje)
    this.status = status
    this.codigo = codigo
    this.mensaje = mensaje
    this.detalles = detalles
  }
}

const TOKENS_KEY = 'zenith.reservas.tokens'
const ADMIN_KEY = 'zenith.admin.token'

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(ruta, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
    })
  } catch {
    throw new ReservaApiError(0, 'RED', 'No hay conexión con el servidor de reservas.')
  }
  const cuerpo = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 502 || res.status === 504 || !cuerpo) {
      throw new ReservaApiError(res.status, 'RED', 'El servidor de reservas no está disponible.')
    }
    throw new ReservaApiError(res.status, cuerpo.codigo || `HTTP-${res.status}`, cuerpo.mensaje || 'Error inesperado.', cuerpo.detalles)
  }
  return cuerpo as T
}

// ---------- Tokens locales (permisos del usuario sobre sus reservas) ----------

export const tokensLocales = {
  leer(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}')
    } catch {
      return {}
    }
  },
  guardar(id: number, token: string) {
    try {
      localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...this.leer(), [id]: token }))
    } catch {
      // Sin almacenamiento local la reserva sigue existiendo; solo no se podrá cancelar desde aquí.
    }
  }
}

export const tokenAdmin = {
  leer(): string | null {
    try {
      return sessionStorage.getItem(ADMIN_KEY)
    } catch {
      return null
    }
  },
  guardar(token: string | null) {
    try {
      if (token) sessionStorage.setItem(ADMIN_KEY, token)
      else sessionStorage.removeItem(ADMIN_KEY)
    } catch {
      // ignorado: el modo operador dura solo esta pestaña
    }
  }
}

function cabeceraAdmin(): Record<string, string> {
  const t = tokenAdmin.leer()
  return t ? { 'X-Admin-Token': t } : {}
}

// ---------- Endpoints ----------

export const reservasApi = {
  getNivel6(consulta?: { fecha: string; hora: string }) {
    const qs = consulta ? `?fecha=${consulta.fecha}&hora=${consulta.hora}` : ''
    return pedir<Nivel6Estado>(`/api/nivel6${qs}`)
  },

  getReglas() {
    return pedir<ReglasReserva>('/api/reglas')
  },

  getReservasSala(salaId: SalaId, desde?: string, hasta?: string) {
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    return pedir<(ReservaPublica | ReservaPrivada)[]>(`/api/salas/${salaId}/reservas?${params}`, {
      headers: cabeceraAdmin()
    })
  },

  async crearReserva(datos: NuevaReserva) {
    const r = await pedir<{ reserva: ReservaPrivada; sala_nombre: string; token: string }>('/api/reservas', {
      method: 'POST',
      body: JSON.stringify(datos)
    })
    tokensLocales.guardar(r.reserva.id, r.token)
    return r
  },

  misReservas() {
    return pedir<ReservaPrivada[]>('/api/reservas/mias', {
      method: 'POST',
      body: JSON.stringify({ tokens: Object.values(tokensLocales.leer()) })
    })
  },

  todasLasReservas() {
    return pedir<ReservaPrivada[]>('/api/reservas', { headers: cabeceraAdmin() })
  },

  cancelarReserva(id: number) {
    const token = tokensLocales.leer()[id]
    return pedir<ReservaPrivada>(`/api/reservas/${id}`, {
      method: 'DELETE',
      headers: { ...(token ? { 'X-Reserva-Token': token } : {}), ...cabeceraAdmin() }
    })
  },

  cambiarMantenimiento(salaId: SalaId, activo: boolean, motivo?: string) {
    return pedir<SalaInfo>(`/api/salas/${salaId}/mantenimiento`, {
      method: 'PUT',
      headers: cabeceraAdmin(),
      body: JSON.stringify({ activo, motivo })
    })
  },

  verificarAdmin(token: string) {
    return pedir<{ admin: boolean }>('/api/admin/verificar', { headers: { 'X-Admin-Token': token } })
  }
}

/** El usuario conserva el token de esta reserva (puede cancelarla). */
export const esPropia = (id: number) => Boolean(tokensLocales.leer()[id])
