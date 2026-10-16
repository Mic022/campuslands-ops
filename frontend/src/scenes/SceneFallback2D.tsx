import React, { useState } from 'react'
import { Espacio, Incidencia } from '../types/domain'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Users, AlertTriangle, Calendar, Layers, MapPin, Box } from 'lucide-react'

interface SceneFallback2DProps {
  espacios: Espacio[]
  incidencias: Incidencia[]
  onSelectEspacio: (espacio: Espacio) => void
  onReservarEspacio: (espacio: Espacio) => void
  onSwitchTo3D: () => void
}

export const SceneFallback2D: React.FC<SceneFallback2DProps> = ({
  espacios,
  incidencias,
  onSelectEspacio,
  onReservarEspacio,
  onSwitchTo3D
}) => {
  const [pisoActivo, setPisoActivo] = useState<number>(1)
  const [seleccionado, setSeleccionado] = useState<Espacio | null>(espacios[0] || null)

  const espaciosPiso = espacios.filter(e => e.piso === pisoActivo)

  return (
    <div className="w-full rounded-2xl glass-panel border border-slate-800/80 p-6 shadow-2xl bg-slate-950/90">
      {/* Header del plano 2D */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase bg-purple-950/70 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded">
              Esquemático Arquitectónico 2D
            </span>
            <span className="text-xs text-slate-400">· Fallback Ligero de Alto Rendimiento</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Plano Operativo del Campuslands Hub
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Piso */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPisoActivo(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                pisoActivo === 1
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Piso 1 (Aulas & Labs)
            </button>
            <button
              onClick={() => setPisoActivo(2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                pisoActivo === 2
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Piso 2 (Cubículos & Tech Lab)
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Box className="w-3.5 h-3.5 text-cyan-400" />}
            onClick={onSwitchTo3D}
          >
            Activar Vista 3D
          </Button>
        </div>
      </div>

      {/* Grid esquemático del piso */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {espaciosPiso.map(esp => {
          const isSelected = seleccionado?.id === esp.id
          const incActiva = esp.incidenciaActivaId
            ? incidencias.find(i => i.id === esp.incidenciaActivaId)
            : null

          const borderClass = {
            disponible: 'border-emerald-500/30 hover:border-emerald-500',
            mantenimiento: 'border-amber-500/30 hover:border-amber-500',
            inhabilitado: 'border-rose-500/50 hover:border-rose-500'
          }[esp.estado]

          return (
            <div
              key={esp.id}
              onClick={() => {
                setSeleccionado(esp)
                onSelectEspacio(esp)
              }}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 ring-2 ring-cyan-400 border-transparent shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/60 hover:bg-slate-900/90'
              } ${borderClass}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded">
                    {esp.id} · {esp.tipo.toUpperCase()}
                  </span>
                  <h4 className="text-base font-bold text-white mt-2 leading-tight">
                    {esp.nombre}
                  </h4>
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

              {/* Aforo y Equipos */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Users className="w-4 h-4 text-slate-400" />
                  Capacidad: <strong className="text-white">{esp.capacidad} pax</strong>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {esp.equipamiento.length} ítems inst.
                </span>
              </div>

              {/* Incidencia Bloqueante RN-04 */}
              {incActiva && (
                <div className="mt-3 p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-start gap-2 text-xs text-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] font-medium leading-tight">
                    RN-04: Bloqueado por {incActiva.codigo} ({incActiva.prioridad.toUpperCase()})
                  </span>
                </div>
              )}

              {/* Botón de acción rápida */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReservarEspacio(esp)
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    esp.estado === 'disponible'
                      ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {esp.estado === 'disponible' ? 'Reservar Espacio' : 'Ver Detalles'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
