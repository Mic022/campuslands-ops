/**
 * Enrutado mínimo sobre la History API (sin dependencias): la app principal sigue navegando
 * por pestañas; aquí solo se separan las pantallas públicas de acceso y las privadas.
 */
import { useSyncExternalStore } from 'react'

export const RUTAS_PUBLICAS = ['/login', '/registro', '/recuperar', '/restablecer'] as const
export const RUTAS_PRIVADAS = ['/', '/admin'] as const

export type RutaPublica = (typeof RUTAS_PUBLICAS)[number]
export type RutaPrivada = (typeof RUTAS_PRIVADAS)[number]

const EVENTO_NAVEGACION = 'campus:navegacion'

function suscribir(aviso: () => void) {
  window.addEventListener('popstate', aviso)
  window.addEventListener(EVENTO_NAVEGACION, aviso)
  return () => {
    window.removeEventListener('popstate', aviso)
    window.removeEventListener(EVENTO_NAVEGACION, aviso)
  }
}

const ubicacion = () => window.location.pathname + window.location.search

/** Ruta y parámetros actuales; se re-renderiza al navegar o al usar Atrás/Adelante. */
export function useRuta() {
  const actual = useSyncExternalStore(suscribir, ubicacion)
  const url = new URL(actual, window.location.origin)
  const ruta = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/'
  return { ruta, params: url.searchParams }
}

export function navegar(destino: string, { reemplazar = false } = {}) {
  if (destino === ubicacion()) return
  if (reemplazar) window.history.replaceState(null, '', destino)
  else window.history.pushState(null, '', destino)
  window.dispatchEvent(new Event(EVENTO_NAVEGACION))
}

export const esRutaPublica = (ruta: string): ruta is RutaPublica => (RUTAS_PUBLICAS as readonly string[]).includes(ruta)
export const esRutaPrivada = (ruta: string): ruta is RutaPrivada => (RUTAS_PRIVADAS as readonly string[]).includes(ruta)

/**
 * Destino tras iniciar sesión. Solo se aceptan rutas privadas conocidas de esta app: evita
 * redirecciones abiertas (`?siguiente=https://otro-sitio`) y bucles hacia el login.
 */
export function destinoSeguro(valor: string | null | undefined): RutaPrivada {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//')) return '/'
  return esRutaPrivada(valor) ? valor : '/'
}

/** URL del login conservando a dónde quería ir la persona. */
export function urlLogin(motivo?: string, siguiente?: string) {
  const params = new URLSearchParams()
  if (motivo) params.set('motivo', motivo)
  if (siguiente && siguiente !== '/' && esRutaPrivada(siguiente)) params.set('siguiente', siguiente)
  const qs = params.toString()
  return `/login${qs ? `?${qs}` : ''}`
}
