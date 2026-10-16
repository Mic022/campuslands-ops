import React, { useState } from 'react'
import { Espacio, Reserva, Incidencia, ReglasConfig } from '../../../types/domain'
import { validarReservaEspacio } from '../../../services/rulesEngine'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { 
  Calendar, 
  Clock, 
  Users, 
  User, 
  Mail, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert 
} from 'lucide-react'

interface SpaceBookingModalProps {
  isOpen: boolean
  onClose: () => void
  espacio: Espacio | null
  reservasExistentes: Reserva[]
  incidenciasActivas: Incidencia[]
  config: ReglasConfig
  onSubmitReserva: (datos: {
    espacioId: string
    solicitanteNombre: string
    solicitanteEmail: string
    horaInicio: string
    horaFin: string
    numPersonas: number
    motivo: string
  }) => Promise<void>
}

export const SpaceBookingModal: React.FC<SpaceBookingModalProps> = ({
  isOpen,
  onClose,
  espacio,
  reservasExistentes,
  incidenciasActivas,
  config,
  onSubmitReserva
}) => {
  const [solicitanteNombre, setSolicitanteNombre] = useState('')
  const [solicitanteEmail, setSolicitanteEmail] = useState('')
  const [horaInicio, setHoraInicio] = useState('14:00')
  const [horaFin, setHoraFin] = useState('16:00')
  const [numPersonas, setNumPersonas] = useState(15)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  if (!espacio) return null

  const aforoMaximoPermitido = Math.floor(espacio.capacidad * config.factor_aforo)

  const validacionActual = validarReservaEspacio(
    espacio,
    { horaInicio, horaFin, numPersonas, solicitanteEmail },
    reservasExistentes,
    incidenciasActivas,
    config
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorLocal(null)

    if (!solicitanteNombre.trim() || !solicitanteEmail.trim() || !motivo.trim()) {
      setErrorLocal('Por favor completa todos los campos del formulario.')
      return
    }

    if (!validacionActual.valido) {
      setErrorLocal(`[${validacionActual.codigo}] ${validacionActual.mensaje}`)
      return
    }

    try {
      setLoading(true)
      await onSubmitReserva({
        espacioId: espacio.id,
        solicitanteNombre: solicitanteNombre.trim(),
        solicitanteEmail: solicitanteEmail.trim(),
        horaInicio,
        horaFin,
        numPersonas,
        motivo: motivo.trim()
      })
      onClose()
      setSolicitanteNombre('')
      setSolicitanteEmail('')
      setMotivo('')
    } catch (err: any) {
      setErrorLocal(err?.message || 'Error al procesar la reserva.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reservar Espacio: ${espacio.nombre}`}
      subtitle={`Código: ${espacio.id} · Piso ${espacio.piso} · Capacidad Base: ${espacio.capacidad} pax`}
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

        {/* Alerta de bloqueo RN-04 */}
        {!validacionActual.valido && validacionActual.codigo.startsWith('RN-04') && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 flex items-start gap-2.5 text-xs text-rose-200 shadow-lg shadow-rose-950/50">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-rose-300 uppercase">
                REGLA RN-04: Espacio Inhabilitado por Incidencia
              </strong>
              <p className="mt-0.5 leading-relaxed">{validacionActual.mensaje}</p>
            </div>
          </div>
        )}

        {/* Solicitante */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Correo Institucional (@campuslands.edu)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={solicitanteEmail}
                onChange={e => setSolicitanteEmail(e.target.value)}
                placeholder="diana.vargas@campuslands.edu"
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
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

        {/* Motivo */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Motivo / Asignatura / Evento
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Taller intensivo de WebGL y Three.js para campers"
              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Validación Preventiva en Vivo (RN-01) */}
        <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
          validacionActual.valido 
            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
            : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
        }`}>
          {validacionActual.valido ? (
            <CheckCircle2 className="w-4 h-4 text-[#00FF9D] shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#FFB703] shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-mono text-[10px] font-bold block uppercase tracking-wide">
              {validacionActual.codigo}
            </span>
            <p className="mt-0.5">{validacionActual.mensaje}</p>
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
            disabled={!validacionActual.valido}
            icon={<Calendar className="w-4 h-4" />}
          >
            Confirmar Reserva Oficial
          </Button>
        </div>
      </form>
    </Modal>
  )
}
