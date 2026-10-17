/**
 * Composición de las pantallas de acceso: panel de marca (escritorio) + tarjeta del formulario.
 * Usa la misma identidad que la app (espacio profundo, azul hielo, Space Grotesk).
 */
import React from 'react'
import { motion } from 'framer-motion'
import { Box, Cpu, ShieldCheck, Sparkles } from 'lucide-react'
import { Brand, LOGO_URL } from '../../components/layout/Brand'
import { StarfieldBackground } from '../../components/ui/StarfieldBackground'

const RASGOS = [
  { icono: <Box className="h-4 w-4" />, titulo: 'Gemelo digital 3D', texto: 'Torre Zenith en tiempo real, sala por sala.' },
  { icono: <ShieldCheck className="h-4 w-4" />, titulo: 'Reglas validadas en el servidor', texto: 'Aforo, horarios y solapes, sin atajos.' },
  { icono: <Cpu className="h-4 w-4" />, titulo: 'Triaje asistido por IA', texto: 'La IA recomienda; las reglas deciden.' }
]

const entrar = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.08 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
})

interface AuthLayoutProps {
  eyebrow: string
  titulo: string
  subtitulo: string
  children: React.ReactNode
  pie?: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ eyebrow, titulo, subtitulo, children, pie }) => (
  <div className="acceso-fondo relative flex min-h-[100dvh] flex-col overflow-hidden text-slate-100">
    <StarfieldBackground />
    <div className="acceso-rejilla pointer-events-none absolute inset-0" aria-hidden="true" />
    <div className="acceso-aurora pointer-events-none absolute -left-40 top-[-20%] h-[38rem] w-[38rem] rounded-full" aria-hidden="true" />
    <div className="acceso-aurora acceso-aurora--violeta pointer-events-none absolute -right-48 bottom-[-25%] h-[34rem] w-[34rem] rounded-full" aria-hidden="true" />

    <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:py-12">
      {/* Panel de marca: solo escritorio */}
      <section className="hidden lg:block" aria-label="Campuslands Ops">
        <motion.div {...entrar(0)}>
          <Brand />
        </motion.div>
        <motion.p {...entrar(1)} className="eyebrow mt-14 flex items-center gap-2 text-sky-300">
          <Sparkles className="h-3.5 w-3.5" /> Centro de operaciones del campus
        </motion.p>
        <motion.h2 {...entrar(2)} className="mt-4 max-w-lg font-display text-[2.6rem] font-bold leading-[1.08] tracking-tight text-white">
          Todo el campus, <span className="titulo-aurora">bajo control</span> desde un solo lugar.
        </motion.h2>
        <motion.p {...entrar(3)} className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-400">
          Espacios, equipos e incidencias de Campuslands sobre los datos oficiales, con permisos según tu rol.
        </motion.p>
        <ul className="mt-10 space-y-3">
          {RASGOS.map((r, i) => (
            <motion.li
              key={r.titulo}
              {...entrar(4 + i)}
              className="rasgo-acceso flex max-w-md items-start gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/[0.07] text-sky-300">
                {r.icono}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{r.titulo}</span>
                <span className="block text-[13px] text-slate-400">{r.texto}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Tarjeta del formulario */}
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-[460px]"
      >
        <div className="tarjeta-acceso relative rounded-[1.75rem] p-6 sm:p-9">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="relative mb-5 h-14 w-14 rounded-2xl border border-white/10 bg-gradient-to-b from-[#16203F] to-[#0A0F22] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_30px_-10px_rgba(56,189,248,0.5)] lg:hidden">
              <img src={LOGO_URL} alt="" className="h-full w-full object-contain p-2" draggable={false} />
            </div>
            <p className="eyebrow text-sky-300/90">{eyebrow}</p>
            <h1 className="mt-2.5 font-display text-[1.75rem] font-bold tracking-tight text-white sm:text-[2rem]">{titulo}</h1>
            <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-slate-400">{subtitulo}</p>
          </div>
          {children}
        </div>
        {pie && <div className="mt-6 text-center text-[13.5px] text-slate-400">{pie}</div>}
      </motion.section>
    </main>

    <footer className="relative z-10 border-t border-white/[0.05]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11.5px] text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Campuslands · Centro de Operaciones del Campus</p>
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" /> Sesión protegida en el servidor · Acceso según tu rol
        </p>
      </div>
    </footer>
  </div>
)
