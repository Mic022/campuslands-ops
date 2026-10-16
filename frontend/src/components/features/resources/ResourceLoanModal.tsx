import React, { useState } from 'react'
import { Recurso, Prestamo, Incidencia, ReglasConfig } from '../../../types/domain'
import { validarPrestamoRecurso } from '../../../services/rulesEngine'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { Laptop, User, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ResourceLoanModalProps {
  isOpen: boolean
  onClose: () => void
  recurso: Recurso | null
  prestamosActivos: Prestamo[]
  incidenciasActivas: Incidencia[]
  config: ReglasConfig
  onSubmitPrestamo: (datos: {
    recursoId: string
    solicitanteNombre: string
    solicitanteEmail: string
    fechaEstimadaDevolucion: string
  }) => Promise<void>
}

export const ResourceLoanModal: React.FC<ResourceLoanModalProps> = ({
  isOpen,
  onClose,
  recurso,
  prestamosActivos,
  incidenciasActivas,
  config,
  onSubmitPrestamo
}) => {
  const [solicitanteNombre, setSolicitanteNombre] = useState('')
  const [solicitanteEmail, setSolicitanteEmail] = useState('')
  const [fechaDevolucion, setFechaDevolucion] = useState('18:00')
  const [loading, setLoading] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  if (!recurso) return null

  const validacionActual = validarPrestamoRecurso(
    recurso,
    solicitanteEmail,
    prestamosActivos,
    incidenciasActivas,
    config
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorLocal(null)

    if (!solicitanteNombre.trim() || !solicitanteEmail.trim()) {
      setErrorLocal('Por favor completa todos los campos del solicitante.')
      return
    }

    if (!validacionActual.valido) {
      setErrorLocal(`[${validacionActual.codigo}] ${validacionActual.mensaje}`)
      return
    }

    try {
      setLoading(true)
      await onSubmitPrestamo({
        recursoId: recurso.id,
        solicitanteNombre: solicitanteNombre.trim(),
        solicitanteEmail: solicitanteEmail.trim(),
        fechaEstimadaDevolucion: `Hoy a las ${fechaDevolucion}`
      })
      onClose()
      setSolicitanteNombre('')
      setSolicitanteEmail('')
    } catch (err: any) {
      setErrorLocal(err?.message || 'Error al despachar el préstamo.')
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
              placeholder="mateo.salamanca@campuslands.edu"
              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            RN-02: Máximo {config.max_prestamos_activos} equipos activos por solicitante simultáneamente.
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Hora Estimada de Devolución
          </label>
          <input
            type="time"
            required
            value={fechaDevolucion}
            onChange={e => setFechaDevolucion(e.target.value)}
            className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Validación Preventiva RN-02 */}
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
            icon={<Laptop className="w-4 h-4" />}
          >
            Autorizar y Prestar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
