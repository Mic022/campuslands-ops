import React, { useEffect, useState } from 'react'
import { Database, FileWarning, RefreshCw } from 'lucide-react'
import { get } from '../../../services/api/baseClient'
import { ENDPOINTS } from '../../../services/endpoints'

interface Archivo {
  archivo: string
  entidad: string
  codificacion?: string
  error?: string
  aviso?: string
  mojibake_reparado?: boolean
}
interface Resumen {
  entidad: string
  leidos: number
  cargados: number
  en_cuarentena: number
  corregidos: number
}
interface Rechazo {
  fila: number
  id_origen: string | null
  motivo: string
}
interface Correccion {
  fila: number
  id_origen: string | null
  descripcion: string
}
interface Reporte {
  generado_en: string
  archivos: Archivo[]
  resumen: Resumen[]
  detalle: Record<string, { cuarentena: Rechazo[]; correcciones: Correccion[] }>
}

const celda = 'px-3 py-2 text-left text-sm'

/** Evidencia de la carga de los datos oficiales: archivos, registros cargados, cuarentena y correcciones (GET /api/datos/reporte). */
export const DataLoadReport: React.FC = () => {
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      setReporte(await get<Reporte>(ENDPOINTS.DATOS.REPORTE))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el reporte.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const rechazos = reporte
    ? Object.entries(reporte.detalle).flatMap(([entidad, d]) => d.cuarentena.map(r => ({ entidad, ...r })))
    : []
  const correcciones = reporte
    ? Object.entries(reporte.detalle).flatMap(([entidad, d]) => d.correcciones.map(c => ({ entidad, ...c })))
    : []

  return (
    <section className="holo-panel rounded-3xl border border-white/10 p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2 text-emerald-300">
            <Database className="h-3.5 w-3.5" /> Datos oficiales
          </p>
          <h3 className="mt-2 font-display text-xl font-bold text-white">Reporte de carga y cuarentena</h3>
          <p className="mt-1 text-sm text-slate-400">
            Los archivos de <code className="text-slate-300">data/raw/</code> se leen sin modificarlos; cada registro inválido queda en
            cuarentena con su motivo. Nada se corrige en silencio.
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:text-white disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {cargando && !reporte && <p className="mt-5 text-sm text-slate-400">Cargando reporte…</p>}
      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {reporte && (
        <div className="mt-5 space-y-5">
          <p className="text-xs text-slate-500">Generado: {reporte.generado_en.replace('T', ' ')}</p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reporte.resumen.map(r => (
              <div key={r.entidad} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">{r.entidad}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">{r.cargados}<span className="text-sm text-slate-500"> / {r.leidos}</span></p>
                <p className="text-xs text-slate-400">
                  cargados · <span className={r.en_cuarentena ? 'text-amber-300' : ''}>{r.en_cuarentena} en cuarentena</span> · {r.corregidos} corregidos
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
                <tr><th className={celda}>Archivo</th><th className={celda}>Entidad</th><th className={celda}>Codificación</th><th className={celda}>Resultado</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {reporte.archivos.map(a => (
                  <tr key={a.archivo}>
                    <td className={`${celda} font-mono`}>{a.archivo}</td>
                    <td className={celda}>{a.entidad}</td>
                    <td className={celda}>{a.codificacion ?? '—'}</td>
                    <td className={celda}>
                      {a.error ? <span className="text-rose-300">{a.error}</span>
                        : a.aviso ? <span className="text-amber-300">{a.aviso}</span>
                        : a.mojibake_reparado ? 'Leído (codificación reparada)' : 'Leído'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileWarning className="h-4 w-4 text-amber-300" /> Registros en cuarentena
            </h4>
            {rechazos.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-400">Ningún registro quedó en cuarentena.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {rechazos.map(r => (
                  <li key={`${r.entidad}-${r.fila}`} className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                    <span className="font-mono text-xs text-amber-300">{r.entidad} · fila {r.fila}{r.id_origen ? ` · ${r.id_origen}` : ''}</span> — {r.motivo}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {correcciones.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white">Reconciliaciones aplicadas</h4>
              <ul className="mt-2 space-y-1.5">
                {correcciones.map((c, i) => (
                  <li key={i} className="rounded-xl border border-sky-500/30 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">
                    <span className="font-mono text-xs text-sky-300">{c.entidad}{c.id_origen ? ` · ${c.id_origen}` : ''}</span> — {c.descripcion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
