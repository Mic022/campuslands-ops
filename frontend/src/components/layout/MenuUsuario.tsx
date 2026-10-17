import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

const iniciales = (nombre: string) =>
  nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?'

/** Persona conectada, su rol (leído del backend) y cierre de sesión. */
export const MenuUsuario: React.FC = () => {
  const { usuario, esAdmin, cerrarSesion } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && setAbierto(false)
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  if (!usuario) return null

  const salir = async () => {
    setSaliendo(true)
    await cerrarSesion()
  }

  return (
    <div ref={caja} className="relative">
      <button
        onClick={() => setAbierto(a => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Cuenta de ${usuario.nombre}`}
        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-2 transition hover:border-white/20 hover:bg-white/[0.06] cursor-pointer"
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-bold ${esAdmin ? 'bg-amber-300 text-slate-950' : 'bg-sky-300 text-slate-950'}`}>
          {iniciales(usuario.nombre)}
        </span>
        <span className="hidden text-left leading-tight 2xl:block">
          <span className="block max-w-[9rem] truncate text-[12.5px] font-semibold text-white">{usuario.nombre}</span>
          <span className={`block text-[10.5px] font-medium ${esAdmin ? 'text-amber-300' : 'text-slate-400'}`}>
            {esAdmin ? 'Administrador' : 'Usuario'}
          </span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right rounded-2xl border border-white/10 bg-[#0B1124] p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center gap-3 rounded-xl px-2.5 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-slate-300">
                <UserRound className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{usuario.nombre}</p>
                <p className="truncate text-xs text-slate-400">@{usuario.usuario}</p>
              </div>
            </div>
            <div className="mx-2.5 mb-2 flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11.5px] text-slate-300">
              <ShieldCheck className={`h-3.5 w-3.5 ${esAdmin ? 'text-amber-300' : 'text-sky-300'}`} />
              Rol: <strong className="font-semibold">{esAdmin ? 'Administrador' : 'Usuario'}</strong>
            </div>
            <button
              role="menuitem"
              onClick={salir}
              disabled={saliendo}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60 cursor-pointer"
            >
              {saliendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
