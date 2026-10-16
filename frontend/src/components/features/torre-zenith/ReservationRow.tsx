import React, { useState } from 'react'
import { XCircle } from 'lucide-react'
import { ReservaApiError, esPropia, reservasApi } from '../../../services/reservasApi'
import { ReservaPrivada, ReservaPublica } from '../../../types/torreZenith'
import { Muestra, Toast, fechaCorta } from './comun'

const ESTILO_ESTADO: Record<string, string> = {
  activa: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  cancelada: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  finalizada: 'text-slate-400 border-slate-600 bg-slate-800/60'
}

interface ReservationRowProps {
  reserva: ReservaPublica | ReservaPrivada
  salaNombre?: string
  salaColor?: string
  admin: boolean
  onCambio: () => void
  onToast: Toast
}

/** Fila de reserva con cancelación en dos pasos para quien tenga permiso. */
export const ReservationRow: React.FC<ReservationRowProps> = ({ reserva: r, salaNombre, salaColor, admin, onCambio, onToast }) => {
  const [confirmar, setConfirmar] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const propia = esPropia(r.id)
  const priv = 'solicitante' in r ? r : null
  const cancelable = r.estado === 'activa' && (propia || admin)

  const cancelar = async () => {
    setCancelando(true)
    try {
      await reservasApi.cancelarReserva(r.id)
      onToast('exito', `Reserva #${r.id} cancelada. El horario quedó libre.`, 'RES-CANCELADA')
      onCambio()
    } catch (e) {
      const err = e as ReservaApiError
      onToast('error', err.message, err.codigo)
    } finally {
      setCancelando(false)
      setConfirmar(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm text-white">
          {salaNombre && (
            <>
              {salaColor && <Muestra color={salaColor} className="h-2.5 w-2.5" />}
              <span className="font-semibold">{salaNombre}</span>
            </>
          )}
          <span className="text-slate-300">{fechaCorta(r.fecha)}</span>
          <span className="font-mono text-cyan-300">{r.hora_inicio}–{r.hora_fin}</span>
        </p>
        <p className="truncate text-[11px] text-slate-400">
          #{r.id} · {r.asistentes} pers.
          {priv && <> · {priv.solicitante} · {priv.motivo}</>}
          {propia && <span className="ml-1 rounded bg-cyan-500/15 px-1 text-cyan-300">Tuya</span>}
        </p>
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${ESTILO_ESTADO[r.estado]}`}>{r.estado}</span>
      {cancelable &&
        (confirmar ? (
          <span className="flex items-center gap-1">
            <button onClick={cancelar} disabled={cancelando} className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer">
              {cancelando ? 'Cancelando…' : 'Confirmar'}
            </button>
            <button onClick={() => setConfirmar(false)} className="rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer">
              No
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmar(true)} className="flex items-center gap-1 rounded-lg border border-rose-500/40 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10 cursor-pointer">
            <XCircle className="h-3 w-3" /> Cancelar
          </button>
        ))}
    </li>
  )
}
