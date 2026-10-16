import React from 'react'
import { Terminal, ShieldCheck, Cpu, HardDrive } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 w-full border-t border-white/10 bg-[#030712]/90 backdrop-blur-xl py-6 mt-16 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white tracking-widest bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CAMPUSLANDS OPS
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Hackatón "El campus bajo presión"</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00FF9D]" />
              <span>Reglas: <strong className="text-slate-200">RN-01 · RN-02 · RN-03 · RN-04</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#9D4EDD]" />
              <span>IA: <strong className="text-slate-200">Triaje Semántico & NLP</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>3D: <strong className="text-slate-200">Three.js + R3F + Drei</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Audit Latency: &lt; 15ms</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
