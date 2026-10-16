import React, { useState } from 'react'
import { LogIn, Lock, User } from 'lucide-react'
import { authApi } from '../../services/api/authApi'
import { ApiError } from '../../services/api/baseClient'
import { Sesion } from '../../services/sesion'

interface LoginScreenProps {
  onEntrar: (sesion: Sesion) => void
}

/** Pantalla de inicio de sesión: roles admin y usuario (ver backend/app/config/permisos.py). */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onEntrar }) => {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      onEntrar(await authApi.login(usuario.trim(), clave))
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'ERR', 'Error inesperado.'))
    } finally {
      setEnviando(false)
    }
  }

  const campo =
    'w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-300/60 focus:ring-2 focus:ring-sky-300/20'

  return (
    <div className="relative flex min-h-screen items-center justify-center cosmic-void-bg px-4 text-slate-100">
      <form
        onSubmit={entrar}
        className="relative z-10 w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-slate-950/80 p-7 shadow-2xl backdrop-blur"
      >
        <div>
          <p className="eyebrow text-sky-300">Campuslands Ops</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-white">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-400">Sistema Central de Gestión Operativa</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-400">Usuario</span>
          <span className="relative block">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className={campo} value={usuario} onChange={e => setUsuario(e.target.value)} autoComplete="username" required />
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-400">Clave</span>
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={campo}
              type="password"
              value={clave}
              onChange={e => setClave(e.target.value)}
              autoComplete="current-password"
              required
            />
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            <span className="font-mono text-xs">{error.codigo}</span> · {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-wait disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" /> {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
