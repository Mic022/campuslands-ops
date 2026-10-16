import React, { useState } from 'react'
import { Incidencia, Espacio, Recurso, ReglasConfig, TriajeIAResponse } from '../../../types/domain'
import { AITriageAssistant } from './AITriageAssistant'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  Clock, 
  Bot, 
  AlertTriangle, 
  Wrench, 
  Building2, 
  Laptop,
  Check
} from 'lucide-react'

interface IncidentBoardProps {
  incidencias: Incidencia[]
  espacios: Espacio[]
  recursos: Recurso[]
  config: ReglasConfig
  onResolverIncidencia: (incidenciaId: string) => Promise<void>
  onAbrirReporteModalConTriaje: (datos: { resultado: TriajeIAResponse; descripcion: string }) => void
}

export const IncidentBoard: React.FC<IncidentBoardProps> = ({
  incidencias,
  espacios,
  recursos,
  config,
  onResolverIncidencia,
  onAbrirReporteModalConTriaje
}) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [resolviendoId, setResolviendoId] = useState<string | null>(null)

  const incidenciasFiltradas = incidencias.filter(inc => {
    const matchEstado = filtroEstado === 'todas' || inc.estado === filtroEstado
    const matchPrioridad = filtroPrioridad === 'todas' || inc.prioridad === filtroPrioridad
    const matchBusqueda = inc.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          inc.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          inc.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchPrioridad && matchBusqueda
  })

  const handleResolver = async (id: string) => {
    try {
      setResolviendoId(id)
      await onResolverIncidencia(id)
    } finally {
      setResolviendoId(null)
    }
  }

  const criticasAbiertas = incidencias.filter(
    i => i.prioridad === 'critica' && i.estado !== 'resuelta'
  ).length

  return (
    <div className="space-y-6">
      {/* Asistente Interactivo de Triaje con IA */}
      <AITriageAssistant
        config={config}
        onAplicarTriaje={(res, desc) => onAbrirReporteModalConTriaje({ resultado: res, descripcion: desc })}
      />

      {/* Barra de Filtros y Búsqueda del Tablero */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Registro Central de Incidencias</h3>
          </div>
          {criticasAbiertas > 0 && (
            <span className="text-xs font-mono font-bold bg-rose-950 text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-500/40 animate-pulse">
              {criticasAbiertas} Crítica(s) Activa(s)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar reporte..."
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todas">Todos los Estados</option>
            <option value="abierta">Abiertas</option>
            <option value="en_proceso">En Proceso</option>
            <option value="resuelta">Resueltas</option>
          </select>

          <select
            value={filtroPrioridad}
            onChange={e => setFiltroPrioridad(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="todas">Todas las Prioridades</option>
            <option value="critica">Solo Críticas</option>
            <option value="alta">Solo Altas</option>
            <option value="media">Solo Medias</option>
            <option value="baja">Solo Bajas</option>
          </select>
        </div>
      </div>

      {/* Listado de Tarjetas de Incidencias */}
      <div className="space-y-3">
        {incidenciasFiltradas.length === 0 ? (
          <div className="glass-panel p-8 rounded-xl border border-slate-800 text-center text-slate-400 text-sm">
            No se encontraron incidencias que coincidan con los filtros.
          </div>
        ) : (
          incidenciasFiltradas.map(inc => {
            const esCritica = inc.prioridad === 'critica'
            const esResuelta = inc.estado === 'resuelta'

            return (
              <div
                key={inc.id}
                className={`p-5 rounded-2xl glass-card border transition-all ${
                  esResuelta
                    ? 'border-slate-800/60 opacity-75'
                    : esCritica
                    ? 'border-rose-500/50 bg-rose-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Código, Timestamp y Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/20">
                        {inc.codigo}
                      </span>

                      <Badge
                        label={inc.prioridad}
                        variant={
                          inc.prioridad === 'critica'
                            ? 'rose'
                            : inc.prioridad === 'alta'
                            ? 'amber'
                            : 'sky'
                        }
                        size="sm"
                      />

                      <Badge
                        label={inc.estado}
                        variant={
                          inc.estado === 'resuelta'
                            ? 'emerald'
                            : inc.estado === 'en_proceso'
                            ? 'sky'
                            : 'amber'
                        }
                        size="sm"
                      />

                      <span className="text-[11px] font-mono text-slate-400">
                        {inc.timestamp}
                      </span>

                      {inc.origenTriaje === 'ia' && (
                        <span className="flex items-center gap-1 text-[10px] font-mono bg-purple-950/70 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded">
                          <Bot className="w-3 h-3 text-purple-400" />
                          <span>IA {(inc.confianzaIA * 100).toFixed(0)}%</span>
                        </span>
                      )}
                    </div>

                    {/* Título y Descripción */}
                    <h4 className="text-base font-bold text-white leading-snug">
                      {inc.titulo}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {inc.descripcion}
                    </p>

                    {/* Espacio o Recurso Afectado */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                      {inc.espacioNombre && (
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Espacio: <strong className="text-slate-200">{inc.espacioNombre}</strong></span>
                        </div>
                      )}
                      {inc.recursoCodigo && (
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                          <Laptop className="w-3.5 h-3.5 text-purple-400" />
                          <span>Hardware: <strong className="text-slate-200">{inc.recursoCodigo}</strong></span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        <span>Área: <strong className="text-slate-200 capitalize">{inc.area.replace('_', ' ')}</strong></span>
                      </div>
                    </div>

                    {/* Sugerencia de la IA si existe */}
                    {inc.sugerenciaAccion && (
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-cyan-300">
                        <strong className="text-cyan-400 block mb-0.5 font-semibold">
                          Acción Recomendada:
                        </strong>
                        {inc.sugerenciaAccion}
                      </div>
                    )}
                  </div>

                  {/* Acción de Resolución */}
                  <div className="shrink-0 flex items-center md:flex-col justify-end gap-2 pt-2 md:pt-0">
                    {!esResuelta ? (
                      <Button
                        variant="cyan"
                        size="sm"
                        loading={resolviendoId === inc.id}
                        onClick={() => handleResolver(inc.id)}
                        icon={<Check className="w-3.5 h-3.5" />}
                      >
                        Marcar Resuelta
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Caso Cerrado</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
