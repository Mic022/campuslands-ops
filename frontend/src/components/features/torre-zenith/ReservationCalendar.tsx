import React from 'react'
import { ReservaPublica } from '../../../types/torreZenith'
import { aMin, fechaISO, horaHM } from './comun'

interface ReservationCalendarProps {
  fecha: string
  reservas: ReservaPublica[]
  apertura: number
  cierre: number
  /** Franja propuesta en el formulario. */
  propuesta?: { inicio: string; fin: string; conflicto: boolean }
  /** Al hacer clic en un hueco libre se propone esa hora de inicio (redondeada a 30 min). */
  onElegir?: (minuto: number) => void
  compacto?: boolean
}

/** Agenda de un día: franjas reservadas sobre el horario de atención. */
export const ReservationCalendar: React.FC<ReservationCalendarProps> = ({
  fecha,
  reservas,
  apertura,
  cierre,
  propuesta,
  onElegir,
  compacto = false
}) => {
  const ini = apertura * 60
  const fin = cierre * 60
  const pct = (min: number) => `${((Math.min(Math.max(min, ini), fin) - ini) / (fin - ini)) * 100}%`
  const ancho = (a: number, b: number) => `${((Math.min(b, fin) - Math.max(a, ini)) / (fin - ini)) * 100}%`
  const activas = reservas.filter(r => r.estado === 'activa' && r.fecha === fecha)
  const esHoy = fecha === fechaISO()
  const ahora = aMin(horaHM())
  const horas = Array.from({ length: cierre - apertura + 1 }, (_, i) => apertura + i)

  const clic = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onElegir) return
    const r = e.currentTarget.getBoundingClientRect()
    const min = ini + ((e.clientX - r.left) / r.width) * (fin - ini)
    onElegir(Math.floor(min / 30) * 30)
  }

  return (
    <div className="select-none">
      <div
        onClick={clic}
        className={`relative w-full overflow-hidden rounded-lg border border-slate-700/80 bg-emerald-500/10 ${
          compacto ? 'h-5' : 'h-9'
        } ${onElegir ? 'cursor-crosshair' : ''}`}
        title={onElegir ? 'Haz clic en una franja libre para proponer la hora de inicio' : undefined}
      >
        {esHoy && ahora > ini && (
          <div className="absolute inset-y-0 left-0 bg-slate-800/80" style={{ width: ancho(ini, ahora) }} title="Horario ya transcurrido" />
        )}
        {horas.map(h => (
          <div key={h} className="absolute inset-y-0 w-px bg-slate-600/40" style={{ left: pct(h * 60) }} />
        ))}
        {activas.map(r => (
          <div
            key={r.id}
            className="absolute inset-y-1 rounded bg-amber-400/80 ring-1 ring-amber-200/60"
            style={{ left: pct(aMin(r.hora_inicio)), width: ancho(aMin(r.hora_inicio), aMin(r.hora_fin)) }}
            title={`Reservada ${r.hora_inicio}–${r.hora_fin}`}
          />
        ))}
        {propuesta && aMin(propuesta.fin) > aMin(propuesta.inicio) && (
          <div
            className={`absolute inset-y-0 rounded border-2 ${
              propuesta.conflicto ? 'border-rose-500 bg-rose-500/30' : 'border-cyan-300 bg-cyan-400/25'
            }`}
            style={{ left: pct(aMin(propuesta.inicio)), width: ancho(aMin(propuesta.inicio), aMin(propuesta.fin)) }}
          />
        )}
        {esHoy && ahora > ini && ahora < fin && (
          <div className="absolute inset-y-0 w-0.5 bg-cyan-300 shadow-[0_0_6px_#67E8F9]" style={{ left: pct(ahora) }} />
        )}
      </div>
      {!compacto && (
        <div className="relative mt-1 h-3 text-[9px] font-mono text-slate-500">
          {horas
            .filter(h => (h - apertura) % 2 === 0)
            .map(h => (
              <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>
                {h}
              </span>
            ))}
        </div>
      )}
      {!compacto && (
        <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-emerald-500/30" /> Libre</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-amber-400/80" /> Reservada</span>
          {propuesta && <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm border border-cyan-300" /> Tu propuesta</span>}
          {esHoy && <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-slate-800" /> Ya pasó</span>}
        </div>
      )}
    </div>
  )
}
