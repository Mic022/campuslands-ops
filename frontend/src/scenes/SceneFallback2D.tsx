import React, { useState } from 'react'
import { Espacio, Incidencia } from '../types/domain'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Users, AlertTriangle, Box, Compass } from 'lucide-react'

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
    <div className="w-full rounded-3xl holo-panel border border-white/10 p-6 sm:p-7 shadow-2xl bg-gradient-to-b from-[#030712] via-[#070D22] to-[#030712]">
      {/* Header del plano 2D */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase bg-purple-950/80 border border-purple-500/40 text-purple-300 px-2.5 py-0.5 rounded-full font-bold">
              Esquemático Arquitectónico 2D
            </span>
            <span className="text-xs text-slate-400">· Fallback de Alto Rendimiento</span>
          </div>
          <h3 className="text-lg font-black text-white mt-1">
            Plano Esquemático del Campuslands Hub
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Piso */}
          <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setPisoActivo(1)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                pisoActivo === 1
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Piso 01 (Aulas & Labs)
            </button>
            <button
              onClick={() => setPisoActivo(2)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                pisoActivo === 2
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Piso 02 (Cubículos & Tech Lab)
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

          return (
            <div
              key={esp.id}
              onClick={() => {
                setSeleccionado(esp)
                onSelectEspacio(esp)
              }}
              className={`p-5 rounded-2xl holo-card border transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-cyan-400 border-transparent shadow-xl shadow-cyan-500/20'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                    {esp.id} · {esp.tipo.toUpperCase()}
                  </span>
                  <h4 className="text-base font-extrabold text-white mt-2 leading-tight">
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
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Capacidad: <strong className="text-white">{esp.capacidad} pax</strong>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {esp.equipamiento.length} ítems inst.
                </span>
              </div>

              {/* Incidencia Bloqueante RN-04 */}
              {incActiva && (
                <div className="mt-3.5 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 flex items-start gap-2 text-xs text-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] font-semibold leading-tight">
                    RN-04: Bloqueado por {incActiva.codigo} ({incActiva.prioridad.toUpperCase()})
                  </span>
                </div>
              )}

              {/* Botón de acción rápida */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReservarEspacio(esp)
                  }}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                    esp.estado === 'disponible'
                      ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                      : 'bg-white/5 text-slate-400 hover:text-white'
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
