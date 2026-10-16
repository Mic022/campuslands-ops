import React, { useEffect, useState } from 'react'
import { CalendarPlus, Users, Wrench } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { ReservaApiError, reservasApi } from '../../../services/reservasApi'
import { EstadoVisual, ReglasReserva, ReservaPublica, SalaEstado } from '../../../types/torreZenith'
import { EstadoChip, Muestra, Toast, fechaISO } from './comun'
import { ReservationCalendar } from './ReservationCalendar'
import { ReservationRow } from './ReservationRow'

interface RoomDetailsModalProps {
  sala: SalaEstado | null
  estado: EstadoVisual
  reglas: ReglasReserva
  admin: boolean
  onCerrar: () => void
  onReservar: () => void
  onCambio: () => void
  onToast: Toast
}

const DIAS = 14

/** Ficha completa: descripción, equipamiento, agenda por día, próximas reservas y mantenimiento. */
export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  sala,
  estado,
  reglas,
  admin,
  onCerrar,
  onReservar,
  onCambio,
  onToast
}) => {
  const [fecha, setFecha] = useState(fechaISO())
  const [reservas, setReservas] = useState<ReservaPublica[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    if (!sala) return
    setCargando(true)
    try {
      // Con token de operador el backend incluye el historial completo (también canceladas y pasadas).
      const hasta = new Date()
      hasta.setDate(hasta.getDate() + DIAS)
      const desde = admin ? undefined : fechaISO()
      setReservas(await reservasApi.getReservasSala(sala.id, desde, fechaISO(hasta)))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (sala) {
      setFecha(fechaISO())
      setMotivo('')
      cargar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala?.id, admin])

  if (!sala) return null
  const bloqueada = sala.estado !== 'disponible'

  const alCambiar = () => {
    cargar()
    onCambio()
  }

  const cambiarMantenimiento = async () => {
    setGuardando(true)
    try {
      await reservasApi.cambiarMantenimiento(sala.id, !bloqueada, motivo.trim() || undefined)
      onToast(
        bloqueada ? 'exito' : 'advertencia',
        bloqueada ? `${sala.nombre} vuelve a estar disponible.` : `${sala.nombre} quedó bloqueada por mantenimiento.`,
        'SALA-MANT'
      )
      onCambio()
    } catch (e) {
      const err = e as ReservaApiError
      onToast('error', err.message, err.codigo)
    } finally {
      setGuardando(false)
    }
  }

  const proximas = reservas.filter(r => r.fecha >= fechaISO() && r.estado === 'activa')
  const historial = reservas.filter(r => !(r.fecha >= fechaISO() && r.estado === 'activa'))

  return (
    <Modal isOpen={Boolean(sala)} onClose={onCerrar} title={sala.nombre} subtitle="Torre Zenith · Nivel 6" maxWidth="2xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Muestra color={sala.color} className="h-5 w-5" />
          <EstadoChip estado={estado} />
          <span className="flex items-center gap-1 text-sm text-slate-300">
            <Users className="h-4 w-4 text-cyan-400" /> Capacidad máxima: <strong className="text-white">{sala.aforo_maximo}</strong>
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{sala.descripcion}</p>
        {bloqueada && (
          <p className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-sm text-rose-200">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> Bloqueada: {sala.motivo_bloqueo}
          </p>
        )}

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Equipamiento</h4>
          <div className="flex flex-wrap gap-1.5">
            {sala.equipamiento.map(e => (
              <span key={e} className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-200">{e}</span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Calendario de disponibilidad</h4>
            <input
              type="date"
              value={fecha}
              min={admin ? undefined : fechaISO()}
              onChange={e => setFecha(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
            />
          </div>
          <ReservationCalendar fecha={fecha} reservas={reservas} apertura={reglas.hora_apertura} cierre={reglas.hora_cierre} />
          {fecha > fechaISO(new Date(Date.now() + DIAS * 864e5)) && (
            <p className="mt-1 text-[11px] text-amber-400">Solo se cargan los próximos {DIAS} días.</p>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Próximas reservas ({DIAS} días) {cargando && <span className="normal-case text-slate-500">· cargando…</span>}
          </h4>
          {error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : proximas.length ? (
            <ul className="space-y-1.5">
              {proximas.map(r => (
                <ReservationRow key={r.id} reserva={r} admin={admin} onCambio={alCambiar} onToast={onToast} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No hay reservas confirmadas.</p>
          )}
        </div>

        {admin && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Historial (operador)</h4>
            {historial.length ? (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {historial.map(r => (
                  <ReservationRow key={r.id} reserva={r} admin={admin} onCambio={alCambiar} onToast={onToast} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Sin reservas pasadas o canceladas.</p>
            )}
          </div>
        )}

        {admin && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
              <Wrench className="h-3.5 w-3.5" /> Mantenimiento (operador)
            </h4>
            <div className="flex flex-col gap-2 sm:flex-row">
              {!bloqueada && (
                <input
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  maxLength={200}
                  placeholder="Motivo del bloqueo"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              )}
              <Button variant={bloqueada ? 'cyan' : 'danger'} size="sm" loading={guardando} onClick={cambiarMantenimiento}>
                {bloqueada ? 'Desbloquear sala' : 'Bloquear por mantenimiento'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
          <Button variant="outline" size="sm" onClick={onCerrar}>Cerrar</Button>
          <Button variant="cyan" size="sm" disabled={bloqueada} icon={<CalendarPlus className="h-4 w-4" />} onClick={onReservar}>
            Reservar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
