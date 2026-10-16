import React from 'react'
import { motion } from 'framer-motion'

export interface Kpi {
  etiqueta: string
  valor: React.ReactNode
  detalle?: string
}

interface PageHeroProps {
  /** Color de acento del módulo en formato "R G B" (p. ej. "52 211 153"). */
  acento: string
  modulo: string
  icono: React.ReactNode
  titulo: string
  tituloAcento: string
  descripcion: string
  kpis: Kpi[]
  reglas?: string[]
  acciones?: React.ReactNode
}

const aparecer = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
})

/** Cabecera de cada módulo: identidad propia (color, emblema), contexto e indicadores clave. */
export const PageHero: React.FC<PageHeroProps> = ({
  acento,
  modulo,
  icono,
  titulo,
  tituloAcento,
  descripcion,
  kpis,
  reglas = [],
  acciones
}) => {
  const color = `rgb(${acento})`
  return (
    <section className="page-hero" style={{ ['--acento' as string]: acento }}>
      <div className="hero-rejilla pointer-events-none absolute inset-y-0 right-0 w-2/3" />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-2xl">
          <motion.p {...aparecer(0)} className="eyebrow flex items-center gap-2" style={{ color }}>
            <span className="h-px w-6" style={{ background: color }} />
            {modulo}
          </motion.p>
          <motion.h1 {...aparecer(1)} className="mt-3 font-display text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-[2.6rem]">
            {titulo} <span style={{ color }}>{tituloAcento}</span>
          </motion.h1>
          <motion.p {...aparecer(2)} className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-[15px]">
            {descripcion}
          </motion.p>
          {(reglas.length > 0 || acciones) && (
            <motion.div {...aparecer(3)} className="mt-5 flex flex-wrap items-center gap-2">
              {reglas.map(r => (
                <span
                  key={r}
                  className="rounded-full border px-2.5 py-1 font-mono text-[10.5px] text-slate-300"
                  style={{ borderColor: `rgb(${acento} / 0.3)`, background: `rgb(${acento} / 0.06)` }}
                >
                  {r}
                </span>
              ))}
              {acciones}
            </motion.div>
          )}
        </div>

        {/* Emblema del módulo con órbitas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto hidden h-44 w-44 items-center justify-center lg:flex"
          aria-hidden="true"
        >
          <div className="orbita absolute inset-0 rounded-full border border-dashed" style={{ borderColor: `rgb(${acento} / 0.25)` }}>
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
          </div>
          <div className="orbita-inversa absolute inset-6 rounded-full border" style={{ borderColor: `rgb(${acento} / 0.18)` }}>
            <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/70" />
          </div>
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl border bg-[#0B1126] [&>svg]:h-9 [&>svg]:w-9"
            style={{ borderColor: `rgb(${acento} / 0.4)`, color, boxShadow: `0 0 40px -6px rgb(${acento} / 0.55), inset 0 1px 0 rgba(255,255,255,0.08)` }}
          >
            {icono}
          </div>
        </motion.div>
      </div>

      {kpis.length > 0 && (
        <div className="relative grid grid-cols-2 gap-3 border-t border-white/[0.06] p-4 sm:p-6 md:grid-cols-4">
          {kpis.map((k, i) => (
            <motion.div key={k.etiqueta} {...aparecer(4 + i)} className="kpi p-4">
              <p className="eyebrow text-slate-500">{k.etiqueta}</p>
              <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{k.valor}</p>
              {k.detalle && <p className="mt-1 text-xs text-slate-400">{k.detalle}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}
