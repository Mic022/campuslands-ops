import React, { useState } from 'react'
import { Espacio, Reserva, Incidencia, ReglasConfig } from '../../../types/domain'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { 
  Building2, 
  Search, 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert,
  Sparkles,
  Zap,
  Box
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
                          (esp.equipamiento?.some(eq => eq.toLowerCase().includes(busqueda.toLowerCase())) ?? false)
    const matchTipo = filtroTipo === 'todos' || esp.tipo === filtroTipo
    const matchPiso = filtroPiso === 'todos' || (esp.piso ?? 1) === filtroPiso
    const matchEstado = filtroEstado === 'todos' || esp.estado === filtroEstado
    return matchBusqueda && matchTipo && matchPiso && matchEstado
  })

  return (
    <div className="space-y-6">
      {/* Tarjetas Holográficas de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="holo-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Espacios Totales</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-black font-mono text-white mt-1.5">{espacios.length}</p>
          <span className="text-[11px] text-slate-400 font-mono">Aforo Global: {totalCapacidad} pax</span>
        </div>

        <div className="holo-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-mono uppercase tracking-wider">Operativos</span>
            <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          </div>
          <p className="text-3xl font-black font-mono text-[#34D399] mt-1.5 glow-mint">{disponiblesCount}</p>
          <span className="text-[11px] text-slate-400 font-mono">Listos para reserva</span>
        </div>

        <div className="holo-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-mono uppercase tracking-wider">En Mantenimiento</span>
            <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
          </div>
          <p className="text-3xl font-black font-mono text-[#FBBF24] mt-1.5">{mantenimientoCount}</p>
          <span className="text-[11px] text-slate-400 font-mono">Mantenimiento preventivo</span>
        </div>

        <div className="holo-card p-5 border-rose-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-mono uppercase tracking-wider">RN-04 Inhabilitados</span>
            <ShieldAlert className="w-4 h-4 text-[#FB7185]" />
          </div>
          <p className="text-3xl font-black font-mono text-[#FB7185] mt-1.5 glow-crimson">{inhabilitadosCount}</p>
          <span className="text-[11px] text-rose-300/80 font-mono">Bloqueados por incidencia</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="holo-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar aula, código (ESP-01) o equipamiento..."
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo */}
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value as any)}
            className="bg-black/40 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="aula">Aulas & Labs</option>
            <option value="cubiculo">Cubículos</option>
          </select>

          {/* Piso */}
          <select
            value={filtroPiso}
            onChange={e => setFiltroPiso(e.target.value === 'todos' ? 'todos' : Number(e.target.value) as any)}
            className="bg-black/40 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todos">Todos los Pisos</option>
            <option value="1">Piso 01</option>
            <option value="2">Piso 02</option>
          </select>

          {/* Estado */}
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as any)}
            className="bg-black/40 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todos">Todos los Estados</option>
            <option value="disponible">Disponibles</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="inhabilitado">Inhabilitados</option>
          </select>
        </div>
      </div>

      {/* Cuadrícula de Salas con Tarjetas Holográficas */}
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
              className="holo-card p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                      {esp.id} · PISO {esp.piso}
                    </span>
                    <h3 className="text-lg font-black text-white mt-2 leading-snug tracking-tight">
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
                <div className="mt-4 p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300 font-medium">Aforo Operativo:</span>
                  </div>
                  <div className="font-mono text-right">
                    <span className="text-white font-bold text-sm">{aforoMaximo}</span>
                    <span className="text-slate-400 text-[11px]"> / {esp.capacidad} pax base</span>
                  </div>
                </div>

                {/* Equipamiento Clave */}
                <div className="mt-3.5">
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium font-mono uppercase">
                    Equipamiento:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(esp.equipamiento || []).slice(0, 3).map((eq, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-white/5 border border-white/10 text-slate-300 px-2.5 py-0.5 rounded-lg"
                      >
                        {eq}
                      </span>
                    ))}
                    {(esp.equipamiento?.length ?? 0) > 3 && (
                      <span className="text-[11px] text-slate-500 py-0.5 px-1">
                        +{(esp.equipamiento?.length ?? 0) - 3} más
                      </span>
                    )}
                  </div>
                </div>

                {/* Incidencia Bloqueante RN-04 */}
                {incActiva && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] font-bold text-rose-300 uppercase">
                        RN-04: Bloqueado por {incActiva.codigo}
                      </strong>
                      <p className="text-[11px] text-rose-200/90 leading-tight mt-0.5">
                        {incActiva.titulo}
                      </p>
                    </div>
                  </div>
                )}

                {/* Reservas Activas */}
                {reservasEspacio.length > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
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

              {/* Botones de Acción */}
              <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  onClick={() => onFocusIn3D(esp)}
                  className="text-xs font-mono text-cyan-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Enfocar en 3D</span>
                </button>

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
