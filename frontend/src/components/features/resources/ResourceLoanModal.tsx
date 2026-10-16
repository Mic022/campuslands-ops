import React, { useState } from 'react'
import { Recurso } from '../../../types/domain'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { Laptop, User, Calendar, Clock, ShieldAlert } from 'lucide-react'

interface ResourceLoanModalProps {
  isOpen: boolean
  onClose: () => void
  recurso: Recurso | null
  onSubmitPrestamo: (datos: {
    recursoId: string
    solicitanteNombre: string
    fechaEstimadaDevolucion: string
  }) => Promise<void>
}

export const ResourceLoanModal: React.FC<ResourceLoanModalProps> = ({
  isOpen,
  onClose,
  recurso,
  onSubmitPrestamo
}) => {
  const hoyStr = new Date().toISOString().slice(0, 10)
  const [solicitanteNombre, setSolicitanteNombre] = useState('')
  const [fechaDevolucion, setFechaDevolucion] = useState(hoyStr)
  const [horaDevolucion, setHoraDevolucion] = useState('18:00')
  const [loading, setLoading] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  if (!recurso) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorLocal(null)

    if (!solicitanteNombre.trim()) {
      setErrorLocal('Por favor ingresa el nombre del solicitante.')
      return
    }

    try {
      setLoading(true)
      const fechaEstimada = `${fechaDevolucion}T${horaDevolucion}`
      await onSubmitPrestamo({
        recursoId: recurso.id,
        solicitanteNombre: solicitanteNombre.trim(),
        fechaEstimadaDevolucion: fechaEstimada
      })
      onClose()
      setSolicitanteNombre('')
    } catch (err: unknown) {
      const e = err as { message?: string; mensaje?: string }
      setErrorLocal(e?.mensaje || e?.message || 'Error al despachar el préstamo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Despachar Préstamo: ${recurso.nombre}`}
      subtitle={`Código: ${recurso.codigo} · Ubicación: ${recurso.espacioActualNombre || 'Almacén TI'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Estado actual */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs">
          <span className="text-slate-400 font-mono">Estado del Equipo:</span>
          <Badge
            label={recurso.estado}
            variant={
              recurso.estado === 'disponible'
                ? 'emerald'
                : recurso.estado === 'prestado'
                ? 'amber'
                : 'rose'
            }
            size="sm"
          />
        </div>

        {recurso.estado !== 'disponible' && (
          <div className="p-3 rounded-2xl bg-amber-950/70 border border-amber-500/50 text-xs text-amber-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Este equipo no está disponible para préstamo ({recurso.estado}). La solicitud será rechazada por el servidor (RN-03).
            </span>
          </div>
        )}

        {/* Datos del Solicitante */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Nombre del Alumno o Trainer
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={solicitanteNombre}
              onChange={e => setSolicitanteNombre(e.target.value)}
              placeholder="Ej. Mateo Salamanca"
              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            RN-02: El cupo máximo de préstamos activos por persona lo valida el servidor.
          </span>
        </div>

        {/* Fecha y Hora de Devolución Estimada */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Fecha de Devolución
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="date"
                required
                value={fechaDevolucion}
                onChange={e => setFechaDevolucion(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Hora de Devolución
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="time"
                required
                value={horaDevolucion}
                onChange={e => setHoraDevolucion(e.target.value)}
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
            icon={<Laptop className="w-4 h-4" />}
          >
            Autorizar y Prestar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
