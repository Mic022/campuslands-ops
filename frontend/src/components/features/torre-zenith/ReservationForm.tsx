import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, Users } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { ReservaApiError, reservasApi } from '../../../services/reservasApi'
import { ReglasReserva, ReservaPrivada, ReservaPublica, SalaEstado, SalaId } from '../../../types/torreZenith'
import { Muestra, aMin, deMin, fechaISO, fechaLarga, horaHM } from './comun'
import { ReservationCalendar } from './ReservationCalendar'

interface ReservationFormProps {
  abierta: boolean
  salaInicial: SalaId | null
  salas: SalaEstado[]
  reglas: ReglasReserva
  onCerrar: () => void
  onReservada: (r: ReservaPrivada, salaNombre: string) => void
  onVerMisReservas: () => void
}

interface Campos {
  solicitante: string
  salaId: SalaId | ''
  fecha: string
  inicio: string
  fin: string
  asistentes: string
  motivo: string
}

function propuestaInicial(reglas: ReglasReserva): Pick<Campos, 'fecha' | 'inicio' | 'fin'> {
  const ahora = new Date()
  let min = Math.ceil((ahora.getHours() * 60 + ahora.getMinutes() + 1) / 30) * 30
  let fecha = fechaISO(ahora)
  min = Math.max(min, reglas.hora_apertura * 60)
  if (min + 30 > reglas.hora_cierre * 60) {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    fecha = fechaISO(manana)
    min = reglas.hora_apertura * 60
  }
  return { fecha, inicio: deMin(min), fin: deMin(Math.min(min + 60, reglas.hora_cierre * 60)) }
}

const etiqueta = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1'
const entrada =
  'w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50'

export const ReservationForm: React.FC<ReservationFormProps> = ({
  abierta,
  salaInicial,
  salas,
  reglas,
  onCerrar,
  onReservada,
  onVerMisReservas
}) => {
  const [c, setC] = useState<Campos>({ solicitante: '', salaId: '', fecha: '', inicio: '', fin: '', asistentes: '1', motivo: '' })
  const [agenda, setAgenda] = useState<ReservaPublica[]>([])
  const [agendaError, setAgendaError] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<ReservaApiError | null>(null)
  const [confirmada, setConfirmada] = useState<{ reserva: ReservaPrivada; sala: string } | null>(null)

  useEffect(() => {
    if (!abierta) return
    setC(prev => ({ ...prev, salaId: salaInicial ?? '', asistentes: '1', motivo: '', ...propuestaInicial(reglas) }))
    setIntentado(false)
    setErrorServidor(null)
    setConfirmada(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, salaInicial])

  const cargarAgenda = async (salaId: SalaId | '', fecha: string) => {
    if (!salaId || !fecha) return setAgenda([])
    try {
      setAgenda((await reservasApi.getReservasSala(salaId, fecha, fecha)) as ReservaPublica[])
      setAgendaError(false)
    } catch {
      setAgendaError(true)
    }
  }

  useEffect(() => {
    if (abierta) cargarAgenda(c.salaId, c.fecha)
  }, [abierta, c.salaId, c.fecha])

  const sala = salas.find(s => s.id === c.salaId)
  const cambiar = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrorServidor(null)
    setC(prev => ({ ...prev, [k]: e.target.value }))
  }

  const conflicto = useMemo(() => {
    if (!c.inicio || !c.fin) return null
    return (
      agenda.find(
        r => r.estado === 'activa' && aMin(r.hora_inicio) < aMin(c.fin) && aMin(c.inicio) < aMin(r.hora_fin)
      ) ?? null
    )
  }, [agenda, c.inicio, c.fin])

  // Validación en el cliente (el servidor vuelve a validar todo).
  const errores = useMemo(() => {
    const e: Partial<Record<keyof Campos, string>> = {}
    if (c.solicitante.trim().length < 2) e.solicitante = 'Escribe tu nombre (mínimo 2 caracteres).'
    if (!sala) e.salaId = 'Selecciona una sala.'
    else if (sala.estado !== 'disponible') e.salaId = `${sala.nombre} está bloqueada por mantenimiento.`
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) e.fecha = 'Fecha inválida.'
    else if (c.fecha < fechaISO()) e.fecha = 'La fecha ya pasó.'
    if (!c.inicio || !c.fin) e.inicio = 'Indica la hora de inicio y de finalización.'
    else {
      const [i, f] = [aMin(c.inicio), aMin(c.fin)]
      if (f <= i) e.fin = 'La hora de finalización debe ser posterior a la de inicio.'
      else if (i < reglas.hora_apertura * 60 || f > reglas.hora_cierre * 60)
        e.inicio = `Horario de reservas: ${deMin(reglas.hora_apertura * 60)} a ${deMin(reglas.hora_cierre * 60)}.`
      else if (f - i > reglas.max_horas_reserva * 60) e.fin = `Máximo ${reglas.max_horas_reserva} horas por reserva.`
      else if (c.fecha === fechaISO() && i < aMin(horaHM())) e.inicio = 'Esa hora de inicio ya pasó.'
      else if (conflicto) e.inicio = `Se cruza con una reserva de ${conflicto.hora_inicio} a ${conflicto.hora_fin}.`
    }
    const n = Number(c.asistentes)
    if (!Number.isInteger(n) || n < 1) e.asistentes = 'Debe haber al menos un asistente.'
    else if (sala && n > sala.aforo_maximo) e.asistentes = `${sala.nombre} admite máximo ${sala.aforo_maximo} personas.`
    if (c.motivo.trim().length < 3) e.motivo = 'Describe el motivo (mínimo 3 caracteres).'
    return e
  }, [c, sala, reglas, conflicto])

  const valido = Object.keys(errores).length === 0

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setIntentado(true)
    if (!valido || !c.salaId) return
    setEnviando(true)
    setErrorServidor(null)
    try {
      const r = await reservasApi.crearReserva({
        sala_id: c.salaId,
        solicitante: c.solicitante.trim(),
        fecha: c.fecha,
        hora_inicio: c.inicio,
        hora_fin: c.fin,
        asistentes: Number(c.asistentes),
        motivo: c.motivo.trim()
      })
      setConfirmada({ reserva: r.reserva, sala: r.sala_nombre })
      onReservada(r.reserva, r.sala_nombre)
    } catch (err) {
      setErrorServidor(err instanceof ReservaApiError ? err : new ReservaApiError(0, 'ERR', 'Error inesperado.'))
      if (err instanceof ReservaApiError && err.codigo === 'RES-06') cargarAgenda(c.salaId, c.fecha)
    } finally {
      setEnviando(false)
    }
  }

  const msg = (k: keyof Campos) =>
    intentado && errores[k] ? <p className="mt-1 text-[11px] text-rose-400">{errores[k]}</p> : null

  if (confirmada) {
    const r = confirmada.reserva
    return (
      <Modal isOpen={abierta} onClose={onCerrar} title="Reserva confirmada" subtitle={`Código de reserva #${r.id}`} maxWidth="md">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold text-white">{confirmada.sala}</p>
              <p className="text-sm capitalize text-slate-300">{fechaLarga(r.fecha)}</p>
              <p className="font-mono text-lg font-bold text-emerald-300">
                {r.hora_inicio} – {r.hora_fin}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className={etiqueta}>Reservada por</dt><dd className="text-white">{r.solicitante}</dd></div>
            <div><dt className={etiqueta}>Asistentes</dt><dd className="text-white">{r.asistentes}</dd></div>
            <div className="col-span-2"><dt className={etiqueta}>Motivo</dt><dd className="text-slate-200">{r.motivo}</dd></div>
          </dl>
          <p className="rounded-lg bg-slate-900/80 p-3 text-xs text-slate-400">
            La reserva quedó guardada en la base de datos. Este navegador conserva tu permiso para cancelarla desde
            “Mis reservas”.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onVerMisReservas}>Ver mis reservas</Button>
            <Button variant="cyan" size="sm" onClick={onCerrar}>Listo</Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={abierta} onClose={onCerrar} title="Nueva reserva" subtitle="Torre Zenith · Nivel 6" maxWidth="xl">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={etiqueta} htmlFor="rz-nombre">Nombre del usuario</label>
            <input id="rz-nombre" className={entrada} value={c.solicitante} onChange={cambiar('solicitante')} placeholder="Nombre y apellido" maxLength={80} autoComplete="name" />
            {msg('solicitante')}
          </div>
          <div>
            <label className={etiqueta} htmlFor="rz-sala">Sala</label>
            <div className="relative">
              <select id="rz-sala" className={`${entrada} pl-8`} value={c.salaId} onChange={cambiar('salaId')}>
                <option value="">Selecciona…</option>
                {salas.map(s => (
                  <option key={s.id} value={s.id} disabled={s.estado !== 'disponible'}>
                    {s.nombre} · {s.aforo_maximo} pers.{s.estado !== 'disponible' ? ' (mantenimiento)' : ''}
                  </option>
                ))}
              </select>
              {sala && <Muestra color={sala.color} className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2" />}
            </div>
            {msg('salaId')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2">
            <label className={etiqueta} htmlFor="rz-fecha">Fecha</label>
            <input id="rz-fecha" type="date" className={entrada} value={c.fecha} min={fechaISO()} onChange={cambiar('fecha')} />
            {msg('fecha')}
          </div>
          <div>
            <label className={etiqueta} htmlFor="rz-inicio">Inicio</label>
            <input id="rz-inicio" type="time" step={900} className={entrada} value={c.inicio} onChange={cambiar('inicio')} />
          </div>
          <div>
            <label className={etiqueta} htmlFor="rz-fin">Fin</label>
            <input id="rz-fin" type="time" step={900} className={entrada} value={c.fin} onChange={cambiar('fin')} />
          </div>
          <div className="col-span-2 sm:col-span-4 -mt-2">
            {msg('inicio')}
            {msg('fin')}
          </div>
        </div>

        {sala && c.fecha && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Clock className="h-3.5 w-3.5 text-cyan-400" /> Disponibilidad de {sala.nombre}
              </span>
              {agendaError && <span className="text-amber-400">No se pudo cargar la agenda</span>}
            </div>
            <ReservationCalendar
              fecha={c.fecha}
              reservas={agenda}
              apertura={reglas.hora_apertura}
              cierre={reglas.hora_cierre}
              propuesta={{ inicio: c.inicio, fin: c.fin, conflicto: Boolean(conflicto) }}
              onElegir={min => {
                const dur = c.inicio && c.fin && aMin(c.fin) > aMin(c.inicio) ? aMin(c.fin) - aMin(c.inicio) : 60
                setC(prev => ({ ...prev, inicio: deMin(min), fin: deMin(Math.min(min + dur, reglas.hora_cierre * 60)) }))
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={etiqueta} htmlFor="rz-asist">
              <Users className="mr-1 inline h-3 w-3" />Asistentes {sala && <span className="normal-case text-slate-500">(máx. {sala.aforo_maximo})</span>}
            </label>
            <input id="rz-asist" type="number" min={1} max={sala?.aforo_maximo} className={entrada} value={c.asistentes} onChange={cambiar('asistentes')} />
            {msg('asistentes')}
          </div>
          <div className="sm:col-span-2">
            <label className={etiqueta} htmlFor="rz-motivo">Motivo de la reserva</label>
            <textarea id="rz-motivo" rows={2} maxLength={300} className={`${entrada} resize-none`} value={c.motivo} onChange={cambiar('motivo')} placeholder="Ej.: Taller de React para la cohorte 4" />
            {msg('motivo')}
          </div>
        </div>

        {errorServidor && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/50 bg-rose-950/60 p-3 text-sm text-rose-200" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold">
                {errorServidor.message} <span className="font-mono text-[10px] text-rose-400">[{errorServidor.codigo}]</span>
              </p>
              {errorServidor.detalles?.map(d => (
                <p key={d.campo} className="text-xs text-rose-300/90">{d.campo}: {d.mensaje}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="cyan" loading={enviando} icon={<CalendarCheck className="h-4 w-4" />}>
            Confirmar reserva
          </Button>
        </div>
      </form>
    </Modal>
  )
}
