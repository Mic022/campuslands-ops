import React, { useState } from 'react'
import { Espacio, ReglasConfig } from '../../../types/domain'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { Calendar, Clock, Users, User, ShieldAlert } from 'lucide-react'

interface SpaceBookingModalProps {
  isOpen: boolean
  onClose: () => void
  espacio: Espacio | null
  config: ReglasConfig
  onSubmitReserva: (datos: {
    espacioId: string
    solicitanteNombre: string
    inicio: string
    fin: string
    numPersonas: number
  }) => Promise<void>
}

export const SpaceBookingModal: React.FC<SpaceBookingModalProps> = ({
  isOpen,
  onClose,
  espacio,
  config,
  onSubmitReserva
}) => {
  const hoyStr = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoyStr)
  const [solicitanteNombre, setSolicitanteNombre] = useState('')
  const [horaInicio, setHoraInicio] = useState('14:00')
  const [horaFin, setHoraFin] = useState('16:00')
  const [numPersonas, setNumPersonas] = useState(15)
  const [loading, setLoading] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  if (!espacio) return null

  const aforoMaximoPermitido = espacio.aforoPermitido ?? Math.floor(espacio.capacidad * config.factor_aforo)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorLocal(null)

    if (!solicitanteNombre.trim()) {
      setErrorLocal('Por favor ingresa el nombre del solicitante.')
      return
    }

    if (!fecha || !horaInicio || !horaFin) {
      setErrorLocal('Por favor define la fecha y el horario de la reserva.')
      return
    }

    try {
      setLoading(true)
      const inicio = `${fecha}T${horaInicio}`
      const fin = `${fecha}T${horaFin}`
      await onSubmitReserva({
        espacioId: espacio.id,
        solicitanteNombre: solicitanteNombre.trim(),
        inicio,
        fin,
        numPersonas
      })
      onClose()
      setSolicitanteNombre('')
    } catch (err: unknown) {
      const e = err as { message?: string; mensaje?: string }
      setErrorLocal(e?.mensaje || e?.message || 'Error al procesar la reserva.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reservar Espacio: ${espacio.nombre}`}
      subtitle={`Código: ${espacio.id} · Piso ${espacio.piso ?? 1} · Capacidad Base: ${espacio.capacidad} pax`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner de Estado del Espacio */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Estado operativo:</span>
            <Badge
              label={espacio.estado}
              variant={
                espacio.estado === 'disponible' 
                  ? 'emerald' 
                  : espacio.estado === 'mantenimiento' 
                  ? 'amber' 
                  : 'rose'
              }
              size="sm"
            />
          </div>
          <div className="text-xs font-mono text-cyan-400 font-bold">
            Aforo autorizado ({(config.factor_aforo * 100).toFixed(0)}%): {aforoMaximoPermitido} pax
          </div>
        </div>

        {/* Alerta si el espacio está inhabilitado */}
        {espacio.estado === 'inhabilitado' && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 flex items-start gap-2.5 text-xs text-rose-200 shadow-lg shadow-rose-950/50">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-rose-300 uppercase">
                REGLA RN-04: Espacio Inhabilitado
              </strong>
              <p className="mt-0.5 leading-relaxed">
                Este espacio se encuentra inhabilitado por una incidencia crítica o alta activa. La solicitud será rechazada por el servidor.
              </p>
            </div>
          </div>
        )}

        {/* Solicitante */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Nombre del Solicitante / Trainer
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={solicitanteNombre}
              onChange={e => setSolicitanteNombre(e.target.value)}
              placeholder="Ej. Ing. Diana Vargas"
              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Fecha de la reserva */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Fecha de Reserva
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="date"
              required
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Horarios y Asistentes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Hora de Inicio
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="time"
                required
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Hora de Fin
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="time"
                required
                value={horaFin}
                onChange={e => setHoraFin(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Número de Asistentes
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                min="1"
                max={espacio.capacidad * 2}
                value={numPersonas}
                onChange={e => setNumPersonas(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {errorLocal && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-300">
            {errorLocal}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="cyan"
            loading={loading}
            icon={<Calendar className="w-4 h-4" />}
          >
            Confirmar Reserva Oficial
          </Button>
        </div>
      </form>
    </Modal>
  )
}
