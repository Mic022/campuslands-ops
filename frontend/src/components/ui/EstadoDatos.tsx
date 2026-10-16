import React from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

/** Estado de carga o error mientras llegan los datos del backend. */
export const EstadoCarga: React.FC<{ cargando: boolean; error?: string; onReintentar: () => void }> = ({
  cargando,
  error,
  onReintentar
}) => (
  <div className="holo-panel flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
    {cargando ? (
      <>
        <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
        <p className="text-sm text-slate-300">Cargando datos del campus…</p>
      </>
    ) : (
      <>
        <AlertTriangle className="h-6 w-6 text-amber-300" />
        <p className="text-sm font-semibold text-white">No se pudieron cargar los datos del servidor</p>
        {error && <p className="max-w-lg font-mono text-xs text-slate-400">{error}</p>}
        <button
          onClick={onReintentar}
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-sm text-slate-200 hover:border-white/25 hover:text-white cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </>
    )}
  </div>
)

/** Aviso en línea cuando una fuente concreta (espacios, incidencias…) devolvió error. */
export const AvisoError: React.FC<{ mensaje?: string; titulo?: string }> = ({ mensaje, titulo = 'La API devolvió un error' }) =>
  mensaje ? (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div>
        <p className="font-semibold text-amber-200">{titulo}</p>
        <p className="mt-0.5 font-mono text-xs text-slate-300">{mensaje}</p>
      </div>
    </div>
  ) : null

/** Lista vacía con un mensaje claro. */
export const Vacio: React.FC<{ mensaje: string }> = ({ mensaje }) => (
  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-400">{mensaje}</div>
)
