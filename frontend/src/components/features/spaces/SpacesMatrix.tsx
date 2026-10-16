import React, { useState } from 'react'
import { Espacio, Reserva, Incidencia, ReglasConfig } from '../../../types/domain'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { 
  Building2, 
  Search, 
  Filter, 
  Users, 
  Layers, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert,
  Sparkles
} from 'lucide-react'

interface SpacesMatrixProps {
  espacios: Espacio[]
  reservas: Reserva[]
  incidencias: Incidencia[]
  config: ReglasConfig
  onSelectEspacio: (espacio: Espacio) => void
  onReservarEspacio: (espacio: Espacio) => void
  onFocusIn3D: (espacio: Espacio) => void
}

export const SpacesMatrix: React.FC<SpacesMatrixProps> = ({
  espacios,
  reservas,
  incidencias,
  config,
  onSelectEspacio,
  onReservarEspacio,
  onFocusIn3D
}) => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'aula' | 'cubiculo'>('todos')
  const [filtroPiso, setFiltroPiso] = useState<'todos' | 1 | 2>('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'disponible' | 'mantenimiento' | 'inhabilitado'>('todos')

  // Métricas de Espacios
  const totalCapacidad = espacios.reduce((acc, e) => acc + e.capacidad, 0)
  const disponiblesCount = espacios.filter(e => e.estado === 'disponible').length
  const mantenimientoCount = espacios.filter(e => e.estado === 'mantenimiento').length
  const inhabilitadosCount = espacios.filter(e => e.estado === 'inhabilitado').length

  const espaciosFiltrados = espacios.filter(esp => {
    const matchBusqueda = esp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          esp.id.toLowerCase().includes(busqueda.toLowerCase()) ||
                          esp.equipamiento.some(eq => eq.toLowerCase().includes(busqueda.toLowerCase()))
    const matchTipo = filtroTipo === 'todos' || esp.tipo === filtroTipo
    const matchPiso = filtroPiso === 'todos' || esp.piso === filtroPiso
    const matchEstado = filtroEstado === 'todos' || esp.estado === filtroEstado
    return matchBusqueda && matchTipo && matchPiso && matchEstado
  })

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Espacios Totales</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{espacios.length}</p>
          <span className="text-[11px] text-slate-500 font-mono">Capacidad: {totalCapacidad} personas</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Disponibles</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{disponiblesCount}</p>
          <span className="text-[11px] text-slate-500">Listos para reserva inmediata</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-medium">Mantenimiento</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-300 mt-1">{mantenimientoCount}</p>
          <span className="text-[11px] text-slate-500">Mantenimiento programado</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-medium">Inhabilitados (RN-04)</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-1">{inhabilitadosCount}</p>
          <span className="text-[11px] text-rose-400/80">Bloqueados por incidencia</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, código o equipamiento..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo */}
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="aula">Solo Aulas</option>
            <option value="cubiculo">Solo Cubículos</option>
          </select>

          {/* Piso */}
          <select
            value={filtroPiso}
            onChange={e => setFiltroPiso(e.target.value === 'todos' ? 'todos' : Number(e.target.value) as any)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todos">Todos los Pisos</option>
            <option value="1">Piso 1</option>
            <option value="2">Piso 2</option>
          </select>

          {/* Estado */}
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todos">Todos los Estados</option>
            <option value="disponible">Disponibles</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="inhabilitado">Inhabilitados</option>
          </select>
        </div>
      </div>

      {/* Grid de Espacios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {espaciosFiltrados.map(esp => {
          const incActiva = esp.incidenciaActivaId
            ? incidencias.find(i => i.id === esp.incidenciaActivaId)
            : null

          const reservasEspacio = reservas.filter(r => r.espacioId === esp.id && r.estado === 'activa')
          const aforoMaximo = Math.floor(esp.capacidad * config.factor_aforo)

          return (
            <div
              key={esp.id}
              className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/20">
                      {esp.id} · Piso {esp.piso}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                      {esp.nombre}
                    </h3>
                  </div>
                  <Badge
                    label={esp.estado}
                    variant={
                      esp.estado === 'disponible'
                        ? 'emerald'
                        : esp.estado === 'mantenimiento'
                        ? 'amber'
                        : 'rose'
                    }
                    size="sm"
                  />
                </div>

                {/* Métricas de Aforo */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300">Aforo Operativo:</span>
                  </div>
                  <div className="font-mono text-right">
                    <span className="text-white font-bold">{aforoMaximo}</span>
                    <span className="text-slate-500 text-[10px]"> / {esp.capacidad} pax base</span>
                  </div>
                </div>

                {/* Equipamiento */}
                <div className="mt-3">
                  <span className="text-[11px] text-slate-400 block mb-1 font-medium">Equipamiento clave:</span>
                  <div className="flex flex-wrap gap-1">
                    {esp.equipamiento.slice(0, 3).map((eq, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded"
                      >
                        {eq}
                      </span>
                    ))}
                    {esp.equipamiento.length > 3 && (
                      <span className="text-[10px] text-slate-500 py-0.5">
                        +{esp.equipamiento.length - 3} más
                      </span>
                    )}
                  </div>
                </div>

                {/* Incidencia Bloqueante RN-04 */}
                {incActiva && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-start gap-2 text-xs text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] font-bold text-rose-300">
                        RN-04: Bloqueado por {incActiva.codigo}
                      </strong>
                      <p className="text-[10px] text-rose-200/90 leading-tight mt-0.5">
                        {incActiva.titulo}
                      </p>
                    </div>
                  </div>
                )}

                {/* Reservas Activas */}
                {reservasEspacio.length > 0 && (
                  <div className="mt-3 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-300 font-semibold mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{reservasEspacio.length} Reserva(s) Activa(s)</span>
                    </div>
                    {reservasEspacio.map(res => (
                      <p key={res.id} className="text-[11px] text-slate-300 truncate">
                        • {res.horaInicio} - {res.horaFin}: {res.solicitanteNombre} ({res.numPersonas} pax)
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFocusIn3D(esp)}
                  className="text-xs text-slate-400 hover:text-cyan-400"
                >
                  Ubicar en 3D
                </Button>

                <Button
                  variant={esp.estado === 'disponible' ? 'cyan' : 'outline'}
                  size="sm"
                  disabled={esp.estado !== 'disponible'}
                  onClick={() => onReservarEspacio(esp)}
                  icon={<Calendar className="w-3.5 h-3.5" />}
                >
                  {esp.estado === 'disponible' ? 'Reservar Espacio' : 'Inhabilitado'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
