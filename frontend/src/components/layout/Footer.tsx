import React from 'react'
import { Terminal, ShieldCheck, Cpu, HardDrive } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-6 mt-16 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider">CAMPUSLANDS OPS</span>
            <span>·</span>
            <span>Hackatón "El campus bajo presión"</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Reglas de Negocio: <strong className="text-slate-200">RN-01, RN-02, RN-03, RN-04</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Motor IA: <strong className="text-slate-200">Triaje Semántico & Asistente Contextual</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>Stack: <strong className="text-slate-200">React + Three.js + Vite</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <Terminal className="w-3.5 h-3.5" />
            <span>Audit Latency: ~12ms</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
