import React, { useState } from 'react'
import { Recurso, Prestamo, Incidencia, EstadoRecurso, ReglasConfig } from '../../../types/domain'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { 
  Laptop, 
  Search, 
  CheckCircle2, 
  Wrench, 
  Trash2, 
  Clock, 
  ShieldAlert,
  Sparkles,
  Zap
} from 'lucide-react'

interface ResourceInventoryProps {
  recursos: Recurso[]
  prestamos: Prestamo[]
  incidencias: Incidencia[]
  config: ReglasConfig
  onPrestarRecurso: (recurso: Recurso) => void
  onCambiarEstado: (recursoId: string, nuevoEstado: EstadoRecurso) => Promise<void>
  onDevolverPrestamo: (prestamoId: string, estadoEntrega: 'optimo' | 'danado') => Promise<void>
  /** Cambios de estado y devoluciones son del rol admin (el backend responde 403 al resto). */
  puedeAdministrar?: boolean
}

export const ResourceInventory: React.FC<ResourceInventoryProps> = ({
  recursos,
  prestamos,
  incidencias,
  config,
  onPrestarRecurso,
  onCambiarEstado,
  onDevolverPrestamo,
  puedeAdministrar = true
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
      {/* Tarjeta de Préstamos Activos en Campo */}
      <div className="holo-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h3 className="text-base font-black text-white tracking-wide">
              Equipos Activos en Custodia Estudiantil
            </h3>
          </div>
          <span className="text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 px-3 py-1 rounded-xl border border-cyan-500/40">
            {prestamosActivos.length} equipos en campo
          </span>
        </div>

        {prestamosActivos.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hay hardware prestado actualmente.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {prestamosActivos.map(p => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                      {p.recursoCodigo}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Devolver: {p.fechaEstimadaDevolucion}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-2">{p.recursoNombre}</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Solicitante: <strong className="text-white">{p.solicitanteNombre}</strong> ({p.solicitanteEmail})
                  </p>
                </div>

                {puedeAdministrar ? (
                  <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDevolucion(p.id, 'danado')}
                      disabled={submittingId === p.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition-all cursor-pointer"
                      title="Devolver con anomalía o daño (RN-03)"
                    >
                      Devolver (Con Daño)
                    </button>
                    <button
                      onClick={() => handleDevolucion(p.id, 'optimo')}
                      disabled={submittingId === p.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer"
                    >
                      Devolver (Óptimo)
                    </button>
                  </div>
                ) : (
                  <p className="mt-3.5 pt-3 border-t border-white/10 text-[11px] text-slate-500">La devolución la registra un administrador al recibir el equipo.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros de Inventario */}
      <div className="holo-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, procesador, modelo o custodio..."
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="bg-black/40 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
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
            className="bg-black/40 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
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

      {/* Grid de Hardware con Tarjetas Holográficas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recursosFiltrados.map(rec => {
          const incRecurso = incidencias.find(i => i.recursoId === rec.id && i.estado !== 'resuelta')

          return (
            <div
              key={rec.id}
              className="holo-card p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                      {rec.codigo}
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-2 leading-snug">
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

                <div className="mt-3.5 text-xs text-slate-300 space-y-1.5">
                  <p>
                    <span className="text-slate-400">Ubicación:</span> {rec.espacioActualNombre || 'Almacén Central TI'}
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

                {/* Alerta de Incidencia en Recurso */}
                {incRecurso && (
                  <div className="mt-3.5 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Incidencia: {incRecurso.titulo}</span>
                  </div>
                )}
              </div>

              {/* Acciones de la Máquina de Estados RN-03 */}
              <div className="mt-5 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                {rec.estado === 'disponible' && (
                  <Button
                    variant="cyan"
                    size="sm"
                    onClick={() => onPrestarRecurso(rec)}
                    icon={<Laptop className="w-3.5 h-3.5" />}
                  >
                    Prestar Equipo
                  </Button>
                )}

                {puedeAdministrar && (
                  <>
                    {(rec.estado === 'disponible' || rec.estado === 'danado') && (
                      <button
                        onClick={() => handleTransicion(rec.id, 'mantenimiento')}
                        disabled={submittingId === rec.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                      >
                        <Wrench className="w-3.5 h-3.5 text-sky-400" />
                        <span>A Mantenimiento</span>
                      </button>
                    )}

                    {rec.estado === 'mantenimiento' && (
                      <button
                        onClick={() => handleTransicion(rec.id, 'disponible')}
                        disabled={submittingId === rec.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                        <span>Dar Alta (Disponible)</span>
                      </button>
                    )}

                    {rec.estado === 'danado' && (
                      <button
                        onClick={() => handleTransicion(rec.id, 'baja')}
                        disabled={submittingId === rec.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Baja Definitiva</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
