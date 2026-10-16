import React, { useState } from 'react'
import { Building2, ChevronDown, Palette, RefreshCw, WifiOff } from 'lucide-react'
import { SALAS_GEOMETRIA } from '../../../data/torreZenithNivel6'
import { EstadoVisual, Nivel6Estado, SalaId } from '../../../types/torreZenith'
import { COLOR_ESTADO } from '../../../scenes/torre-zenith/materiales'
import { ETIQUETA_ESTADO } from '../../../scenes/torre-zenith/RoomLabel'
import { Muestra, fechaISO, horaHM, panel } from './comun'

interface LevelSummaryProps {
  datos: Nivel6Estado | null
  carga: 'cargando' | 'ok' | 'error'
  enVivo: boolean
  consulta: { fecha: string; hora: string } | null
  ultimaSync: Date | null
  onConsulta: (c: { fecha: string; hora: string } | null) => void
  onReintentar: () => void
}

const Cifra: React.FC<{ valor: number | string; texto: string; color: string }> = ({ valor, texto, color }) => (
  <div className="min-w-0">
    <p className="font-mono text-lg font-bold leading-none sm:text-xl" style={{ color }}>{valor}</p>
    <p className="mt-0.5 truncate text-[10px] text-slate-400">{texto}</p>
  </div>
)

/** Panel inferior izquierdo: datos generales del nivel y hora consultada. */
export const LevelSummary: React.FC<LevelSummaryProps> = ({ datos, carga, enVivo, consulta, ultimaSync, onConsulta, onReintentar }) => {
  const r = carga === 'ok' && datos ? datos.resumen : null
  const n = (v?: number) => (r ? v ?? 0 : '—')

  return (
    <div className={`${panel} p-3 sm:p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-cyan-400" />
          <div>
            <p className="text-sm font-bold leading-tight text-white">Torre Zenith</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Nivel 6 · datos en vivo</p>
          </div>
        </div>
        {carga === 'error' ? (
          <button onClick={onReintentar} className="flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 cursor-pointer">
            <WifiOff className="h-3 w-3" /> Sin conexión · reintentar
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-slate-500" title="Se actualiza cada 20 s">
            <RefreshCw className={`h-3 w-3 ${carga === 'cargando' ? 'animate-spin text-cyan-400' : ''}`} />
            {ultimaSync ? horaHM(ultimaSync) : '…'}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Cifra valor={r ? r.total : SALAS_GEOMETRIA.length} texto="Salas" color="#E2E8F0" />
        <Cifra valor={n(r?.disponibles)} texto="Disponibles" color={COLOR_ESTADO.disponible} />
        <Cifra valor={n(r?.reservadas)} texto="Reservadas" color={COLOR_ESTADO.reservada} />
        <Cifra valor={n(r?.mantenimiento)} texto="Mantenim." color={COLOR_ESTADO.mantenimiento} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2.5 text-[11px]">
        <button
          onClick={() => onConsulta(null)}
          className={`rounded-full px-2 py-0.5 font-semibold cursor-pointer ${enVivo ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50' : 'text-slate-400 hover:text-white'}`}
        >
          ● En vivo
        </button>
        <input
          type="date"
          aria-label="Fecha consultada"
          value={consulta?.fecha ?? fechaISO()}
          onChange={e => e.target.value && onConsulta({ fecha: e.target.value, hora: consulta?.hora ?? horaHM() })}
          className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-white"
        />
        <input
          type="time"
          aria-label="Hora consultada"
          step={900}
          value={consulta?.hora ?? horaHM()}
          onChange={e => e.target.value && onConsulta({ fecha: consulta?.fecha ?? fechaISO(), hora: e.target.value })}
          className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-white"
        />
      </div>
    </div>
  )
}

interface RoomStatusLegendProps {
  nombres: Record<SalaId, string>
  onElegir: (id: SalaId) => void
}

/** Panel inferior derecho: leyenda de estados y de colores de sala. */
export const RoomStatusLegend: React.FC<RoomStatusLegendProps> = ({ nombres, onElegir }) => {
  const [abierta, setAbierta] = useState(() => typeof window === 'undefined' || window.innerWidth >= 640)
  const [verSalas, setVerSalas] = useState(false)

  if (!abierta) {
    return (
      <button onClick={() => setAbierta(true)} className={`${panel} flex h-11 w-11 items-center justify-center text-cyan-300 cursor-pointer`} aria-label="Mostrar leyenda">
        <Palette className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className={`${panel} w-56 p-3`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Estado</span>
        <button onClick={() => setAbierta(false)} className="text-slate-500 hover:text-white cursor-pointer" aria-label="Contraer leyenda">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {(Object.keys(COLOR_ESTADO) as EstadoVisual[]).map(e => (
          <li key={e} className="flex items-center gap-2 text-xs text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_ESTADO[e], boxShadow: `0 0 8px ${COLOR_ESTADO[e]}` }} />
            {e === 'mantenimiento' ? 'Mantenimiento o bloqueada' : e === 'desconocido' ? 'Estado desconocido' : ETIQUETA_ESTADO[e]}
          </li>
        ))}
      </ul>
      <button
        onClick={() => setVerSalas(v => !v)}
        className="mt-3 flex w-full items-center justify-between border-t border-slate-800 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 hover:text-white cursor-pointer"
      >
        Colores de sala <ChevronDown className={`h-3.5 w-3.5 transition ${verSalas ? 'rotate-180' : ''}`} />
      </button>
      {verSalas && (
        <ul className="mt-2 grid grid-cols-1 gap-1">
          {SALAS_GEOMETRIA.map(g => (
            <li key={g.id}>
              <button onClick={() => onElegir(g.id)} className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs text-slate-200 hover:bg-slate-800 cursor-pointer">
                <Muestra color={g.color} />
                {nombres[g.id]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
