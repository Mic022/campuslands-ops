/**
 * Estado de la sesión en el frontend.
 *
 * - La fuente de verdad es el backend: al cargar se pregunta GET /api/auth/yo (la cookie HttpOnly
 *   viaja sola). El rol nunca se lee de localStorage ni de la URL.
 * - Cualquier 401 de la API (sesión caducada o revocada) cierra la sesión local y lleva al login.
 * - Al volver a la pestaña o desde la caché del botón Atrás se revalida la sesión.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, EVENTO_SESION_EXPIRADA, csrf } from '../services/api/baseClient'
import { authApi, SesionApi, UsuarioSesion } from '../services/api/authApi'
import { guardarSesion } from '../services/sesion'
import { navegar, urlLogin } from './rutas'

type Estado = 'verificando' | 'autenticado' | 'anonimo' | 'sin_conexion'

interface AuthValor {
  estado: Estado
  usuario: UsuarioSesion | null
  esAdmin: boolean
  /** Activa la sesión que devolvió POST /api/auth/login (el formulario anima el éxito antes). */
  establecerSesion: (sesion: SesionApi) => void
  cerrarSesion: () => Promise<void>
  verificar: () => Promise<void>
}

const AuthContexto = createContext<AuthValor | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [estado, setEstado] = useState<Estado>('verificando')
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const estadoRef = useRef(estado)
  estadoRef.current = estado

  const limpiar = useCallback(() => {
    csrf.poner(null)
    guardarSesion(null)
    setUsuario(null)
    setEstado('anonimo')
  }, [])

  const verificar = useCallback(async () => {
    try {
      const s = await authApi.sesion()
      csrf.poner(s.csrf_token)
      guardarSesion(s.usuario)
      setUsuario(s.usuario)
      setEstado('autenticado')
    } catch (err) {
      const e = err as ApiError
      if (e.status === 401) {
        const teniaSesion = estadoRef.current === 'autenticado'
        limpiar()
        if (teniaSesion) navegar(urlLogin('expirada', window.location.pathname), { reemplazar: true })
      }
      // Sin conexión con la API: si ya había sesión se conserva; si no, se muestra el aviso.
      else if (estadoRef.current !== 'autenticado') setEstado('sin_conexion')
    }
  }, [limpiar])

  useEffect(() => {
    verificar()
  }, [verificar])

  // 401 en cualquier petición protegida → sesión caducada.
  useEffect(() => {
    const alExpirar = () => {
      if (estadoRef.current !== 'autenticado') return
      limpiar()
      navegar(urlLogin('expirada', window.location.pathname), { reemplazar: true })
    }
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar)
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar)
  }, [limpiar])

  // Revalidar al volver a la pestaña y al restaurar la página desde la caché de Atrás/Adelante.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible' && estadoRef.current === 'autenticado') verificar()
    }
    const alMostrar = (e: PageTransitionEvent) => {
      if (e.persisted) verificar()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('pageshow', alMostrar)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('pageshow', alMostrar)
    }
  }, [verificar])

  const establecerSesion = useCallback((s: SesionApi) => {
    csrf.poner(s.csrf_token)
    guardarSesion(s.usuario)
    setUsuario(s.usuario)
    setEstado('autenticado')
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Aunque la API no responda, la sesión local se cierra; el servidor la dejará caducar.
    }
    limpiar()
    // replace: el botón Atrás no vuelve a una pantalla privada ya cargada.
    navegar(urlLogin('salida'), { reemplazar: true })
  }, [limpiar])

  const valor = useMemo<AuthValor>(
    () => ({ estado, usuario, esAdmin: usuario?.rol === 'admin', establecerSesion, cerrarSesion, verificar }),
    [estado, usuario, establecerSesion, cerrarSesion, verificar]
  )

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>
}

export function useAuth(): AuthValor {
  const valor = useContext(AuthContexto)
  if (!valor) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return valor
}
