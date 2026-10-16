import React from 'react'

export const LOGO_URL = '/campus.png'

interface BrandProps {
  /** Muestra el subtítulo bajo el nombre. */
  subtitulo?: boolean
  tamano?: 'sm' | 'md'
}

/** Logotipo de Campuslands (casco) con el nombre del producto. */
export const Brand: React.FC<BrandProps> = ({ subtitulo = true, tamano = 'md' }) => {
  const caja = tamano === 'md' ? 'h-11 w-11' : 'h-8 w-8'
  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${caja} shrink-0 rounded-xl border border-white/10 bg-gradient-to-b from-[#16203F] to-[#0A0F22] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(56,189,248,0.35)]`}>
        {/* Reflejo del visor */}
        <span className="absolute inset-x-2 top-1.5 h-1/3 rounded-full bg-sky-300/10 blur-md" />
        <img src={LOGO_URL} alt="Campuslands" className="relative h-full w-full object-contain p-1.5" draggable={false} />
      </div>
      <div className="leading-none">
        <p className={`font-display font-bold tracking-[0.14em] text-white ${tamano === 'md' ? 'text-[15px]' : 'text-[13px]'}`}>
          CAMPUSLANDS <span className="text-sky-300">OPS</span>
        </p>
        {subtitulo && (
          <p className="mt-1.5 text-[10.5px] font-medium tracking-wide text-slate-400">Centro de Operaciones del Campus</p>
        )}
      </div>
    </div>
  )
}
