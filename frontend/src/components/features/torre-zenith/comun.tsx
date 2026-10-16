import React from 'react'
import { EstadoVisual } from '../../../types/torreZenith'
import { COLOR_ESTADO } from '../../../scenes/torre-zenith/materiales'
import { ETIQUETA_ESTADO } from '../../../scenes/torre-zenith/RoomLabel'

export type Toast = (tipo: 'exito' | 'error' | 'advertencia' | 'info', mensaje: string, codigo?: string) => void

const dos = (n: number) => String(n).padStart(2, '0')

export const fechaISO = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
export const horaHM = (d = new Date()) => `${dos(d.getHours())}:${dos(d.getMinutes())}`
export const aMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}
export const deMin = (min: number) => `${dos(Math.floor(min / 60))}:${dos(min % 60)}`

export function fechaLarga(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function fechaCorta(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const hoy = fechaISO()
  if (iso === hoy) return 'Hoy'
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  if (iso === fechaISO(manana)) return 'Mañana'
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const EstadoChip: React.FC<{ estado: EstadoVisual; className?: string }> = ({ estado, className = '' }) => {
  const c = COLOR_ESTADO[estado]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ color: c, borderColor: `${c}66`, background: `${c}1A` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}

export const Muestra: React.FC<{ color: string; className?: string }> = ({ color, className = 'h-3 w-3' }) => (
  <span className={`inline-block shrink-0 rounded-sm ring-1 ring-white/30 ${className}`} style={{ background: color }} />
)

export const panel =
  'rounded-2xl border border-indigo-200/15 bg-gradient-to-br from-[#0E1530]/85 via-[#0A0F24]/85 to-[#070A18]/90 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl'
export const boton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
