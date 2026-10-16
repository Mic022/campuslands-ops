import React from 'react'
import { motion } from 'framer-motion'
import { CalendarPlus, Clock, Info, Users, Wrench, X } from 'lucide-react'
import { EstadoVisual, ReglasReserva, SalaEstado } from '../../../types/torreZenith'
import { EstadoChip, Muestra, fechaCorta, panel } from './comun'
import { ReservationCalendar } from './ReservationCalendar'

interface RoomInfoPanelProps {
  nombre: string
  color: string
  sala: SalaEstado | null
  estado: EstadoVisual
  consulta: { fecha: string; hora: string } | null
  reglas: ReglasReserva
  onCerrar: () => void
  onDetalles: () => void
  onReservar: () => void
}

const TIPO: Record<string, string> = {
  aula: 'Aula de formación',
  reuniones: 'Sala de reuniones',
  auditorio: 'Auditorio',
  cabinas: 'Cabinas privadas'
}

/** Panel superior izquierdo con la ficha de la sala seleccionada. */
export const RoomInfoPanel: React.FC<RoomInfoPanelProps> = ({
  nombre,
  color,
  sala,
  estado,
  consulta,
  reglas,
  onCerrar,
  onDetalles,
  onReservar
}) => {
  const bloqueada = sala?.estado !== 'disponible'
  const puedeReservar = Boolean(sala) && !bloqueada && estado !== 'desconocido'

  return (
    <motion.div
      key={nombre}
      initial={{ opacity: 0, x: -16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      className={`${panel} max-h-full overflow-y-auto p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">Sala seleccionada</p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-bold leading-tight text-white">
            <Muestra color={color} className="h-3.5 w-3.5" />
            <span className="truncate">{nombre}</span>
          </h3>
          {sala && <p className="text-xs text-slate-400">{TIPO[sala.tipo] ?? sala.tipo}</p>}
        </div>
        <button onClick={onCerrar} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer" aria-label="Cerrar panel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EstadoChip estado={estado} />
        <span className="text-[11px] text-slate-500">
          {consulta ? `${fechaCorta(consulta.fecha)} · ${consulta.hora}` : 'Sin conexión con el servidor'}
        </span>
      </div>

      {sala ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
              <p className="flex items-center gap-1 text-[10px] uppercase text-slate-500"><Users className="h-3 w-3" /> Capacidad máx.</p>
              <p className="font-mono text-xl font-bold text-cyan-300">{sala.aforo_maximo}<span className="ml-1 text-xs font-normal text-slate-500">pers.</span></p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
              <p className="flex items-center gap-1 text-[10px] uppercase text-slate-500"><Clock className="h-3 w-3" /> Próxima reserva</p>
              {sala.proxima_reserva ? (
                <p className="text-sm font-semibold text-white">
                  {fechaCorta(sala.proxima_reserva.fecha)}{' '}
                  <span className="font-mono text-amber-300">{sala.proxima_reserva.hora_inicio}–{sala.proxima_reserva.hora_fin}</span>
                </p>
              ) : (
                <p className="text-sm text-slate-400">Sin reservas</p>
              )}
            </div>
          </div>

          {bloqueada && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 p-2.5 text-xs text-rose-200">
              <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span><strong>Bloqueada por mantenimiento.</strong> {sala.motivo_bloqueo}</span>
            </div>
          )}
          {sala.reserva_actual && (
            <p className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-2.5 text-xs text-amber-200">
              Ocupada de {sala.reserva_actual.hora_inicio} a {sala.reserva_actual.hora_fin}. Puedes reservar otro horario.
            </p>
          )}

          <div className="mt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">
              Agenda {consulta ? fechaCorta(consulta.fecha).toLowerCase() : ''} · {sala.reservas_dia.length} reserva(s)
            </p>
            {consulta && (
              <ReservationCalendar
                fecha={consulta.fecha}
                reservas={sala.reservas_dia}
                apertura={reglas.hora_apertura}
                cierre={reglas.hora_cierre}
                compacto
              />
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-400">
          No hay datos de estado ni reservas: el servidor de reservas no respondió. No se muestran estados supuestos.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onDetalles}
          disabled={!sala}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Info className="h-3.5 w-3.5" /> Ver detalles
        </button>
        <button
          onClick={onReservar}
          disabled={!puedeReservar}
          title={bloqueada ? 'Sala en mantenimiento' : !sala ? 'Sin conexión' : undefined}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 px-3 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Reservar
        </button>
      </div>
    </motion.div>
  )
}
