import React, { useState } from 'react'
import { Recurso, Prestamo, Incidencia, EstadoRecurso, ReglasConfig } from '../../../types/domain'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { 
  Laptop, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Wrench, 
  Trash2, 
  Plus, 
  Clock, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react'

interface ResourceInventoryProps {
  recursos: Recurso[]
  prestamos: Prestamo[]
  incidencias: Incidencia[]
  config: ReglasConfig
  onPrestarRecurso: (recurso: Recurso) => void
  onCambiarEstado: (recursoId: string, nuevoEstado: EstadoRecurso) => Promise<void>
  onDevolverPrestamo: (prestamoId: string, estadoEntrega: 'optimo' | 'danado') => Promise<void>
}

export const ResourceInventory: React.FC<ResourceInventoryProps> = ({
  recursos,
  prestamos,
  incidencias,
  config,
  onPrestarRecurso,
  onCambiarEstado,
  onDevolverPrestamo
}) => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const recursosFiltrados = recursos.filter(rec => {
    const matchBusqueda = rec.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          rec.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          (rec.solicitanteActual && rec.solicitanteActual.toLowerCase().includes(busqueda.toLowerCase()))
    const matchTipo = filtroTipo === 'todos' || rec.tipo === filtroTipo
    const matchEstado = filtroEstado === 'todos' || rec.estado === filtroEstado
    return matchBusqueda && matchTipo && matchEstado
  })

  const prestamosActivos = prestamos.filter(p => p.estado === 'activo')

  const handleTransicion = async (recursoId: string, nuevoEstado: EstadoRecurso) => {
    try {
      setSubmittingId(recursoId)
      await onCambiarEstado(recursoId, nuevoEstado)
    } finally {
      setSubmittingId(null)
    }
  }

  const handleDevolucion = async (prestamoId: string, estadoEntrega: 'optimo' | 'danado') => {
    try {
      setSubmittingId(prestamoId)
      await onDevolverPrestamo(prestamoId, estadoEntrega)
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tarjeta de Préstamos Activos en Curso */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Préstamos Activos en Custodia</h3>
          </div>
          <span className="text-xs font-mono bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
            {prestamosActivos.length} equipos en campo
          </span>
        </div>

        {prestamosActivos.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hay préstamos activos en este momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {prestamosActivos.map(p => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-cyan-400 bg-slate-950 px-2 py-0.5 rounded">
                      {p.recursoCodigo}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Devolver: {p.fechaEstimadaDevolucion}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-1.5">{p.recursoNombre}</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Solicitante: <strong className="text-white">{p.solicitanteNombre}</strong> ({p.solicitanteEmail})
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDevolucion(p.id, 'danado')}
                    disabled={submittingId === p.id}
                    className="text-xs px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                    title="Devolver con daño para enviar a revisión técnica (RN-03)"
                  >
                    Devolver (Con Daño)
                  </button>
                  <button
                    onClick={() => handleDevolucion(p.id, 'optimo')}
                    disabled={submittingId === p.id}
                    className="text-xs px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    Devolver (Óptimo)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros de Inventario */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, hardware o custodio..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todos">Todos los Dispositivos</option>
            <option value="laptop">Laptops & Workstations</option>
            <option value="kit_iot">Kits IoT & Robótica</option>
            <option value="proyector">Proyectores</option>
            <option value="periferico">Periféricos & VR</option>
            <option value="pantalla">Pantallas</option>
          </select>

          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todos">Todos los Estados</option>
            <option value="disponible">Disponibles</option>
            <option value="prestado">Prestados</option>
            <option value="mantenimiento">En Mantenimiento</option>
            <option value="danado">Dañados</option>
            <option value="baja">De Baja</option>
          </select>
        </div>
      </div>

      {/* Grid de Hardware e Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recursosFiltrados.map(rec => {
          const incRecurso = incidencias.find(i => i.recursoId === rec.id && i.estado !== 'resuelta')

          return (
            <div
              key={rec.id}
              className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/20">
                      {rec.codigo}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                      {rec.nombre}
                    </h3>
                  </div>
                  <Badge
                    label={rec.estado}
                    variant={
                      rec.estado === 'disponible'
                        ? 'emerald'
                        : rec.estado === 'prestado'
                        ? 'amber'
                        : rec.estado === 'mantenimiento'
                        ? 'sky'
                        : 'rose'
                    }
                    size="sm"
                  />
                </div>

                <div className="mt-3 text-xs text-slate-300 space-y-1">
                  <p>
                    <span className="text-slate-400">Ubicación:</span> {rec.espacioActualNombre || 'Almacén TI'}
                  </p>
                  {rec.solicitanteActual && (
                    <p className="text-amber-300 font-mono text-[11px]">
                      Custodio: {rec.solicitanteActual}
                    </p>
                  )}
                  {rec.observaciones && (
                    <p className="text-[11px] text-slate-400 italic">
                      "{rec.observaciones}"
                    </p>
                  )}
                </div>

                {/* Incidencia en el Recurso (RN-04) */}
                {incRecurso && (
                  <div className="mt-3 p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>Incidencia: {incRecurso.titulo}</span>
                  </div>
                )}
              </div>

              {/* Acciones y Transiciones RN-03 */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                {/* Botón de Préstamo si está disponible */}
                {rec.estado === 'disponible' && (
                  <Button
                    variant="cyan"
                    size="sm"
                    onClick={() => onPrestarRecurso(rec)}
                    icon={<Laptop className="w-3.5 h-3.5" />}
                  >
                    Prestar Recurso
                  </Button>
                )}

                {/* Transición a Mantenimiento si está disponible o dañado */}
                {(rec.estado === 'disponible' || rec.estado === 'danado') && (
                  <button
                    onClick={() => handleTransicion(rec.id, 'mantenimiento')}
                    disabled={submittingId === rec.id}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Wrench className="w-3 h-3 text-sky-400" />
                    <span>A Mantenimiento</span>
                  </button>
                )}

                {/* Reactivar a Disponible desde Mantenimiento */}
                {rec.estado === 'mantenimiento' && (
                  <button
                    onClick={() => handleTransicion(rec.id, 'disponible')}
                    disabled={submittingId === rec.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dar Alta (Disponible)</span>
                  </button>
                )}

                {/* Dar de Baja si está dañado */}
                {rec.estado === 'danado' && (
                  <button
                    onClick={() => handleTransicion(rec.id, 'baja')}
                    disabled={submittingId === rec.id}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Baja Definitiva</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
