import React from 'react'
import { Box, Cpu, ShieldCheck } from 'lucide-react'
import { Brand } from './Brand'

export const Footer: React.FC = () => (
  <footer className="relative z-10 mt-16 w-full border-t border-white/[0.06] bg-[#050816]/80">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
      <div className="flex flex-col items-center gap-2 md:items-start">
        <Brand tamano="sm" subtitulo={false} />
        <p className="text-xs text-slate-500">Hackatón “El campus bajo presión” · Torre Zenith</p>
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
        <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Reglas RN-01 a RN-04</li>
        <li className="flex items-center gap-1.5"><Cpu className="h-4 w-4 text-violet-400" /> Triaje asistido por IA</li>
        <li className="flex items-center gap-1.5"><Box className="h-4 w-4 text-sky-300" /> Three.js · React Three Fiber</li>
      </ul>
      <p className="font-mono text-[11px] text-slate-600">© {new Date().getFullYear()} Campuslands</p>
    </div>
  </footer>
)
