import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CalendarCheck,
  Laptop,
  MousePointerClick,
  Move3d,
  Orbit,
  Sliders,
  Sparkles
} from 'lucide-react'
import type { TabType } from '../../layout/Navbar'
import { LOGO_URL } from '../../layout/Brand'
import { SALAS_GEOMETRIA } from '../../../data/torreZenithNivel6'

interface ProjectContextProps {
  onIr: (tab: TabType) => void
  onVerPlano: () => void
}

const MODULOS: { tab: TabType; icono: React.ReactNode; titulo: string; texto: string; acento: string }[] = [
  { tab: '3d-twin', icono: <Orbit />, titulo: 'Gemelo 3D y reservas', texto: `El Nivel 6 de Torre Zenith en 3D, con sus ${SALAS_GEOMETRIA.length} salas reservables en tiempo real.`, acento: '125 211 252' },
  { tab: 'spaces', icono: <Building2 />, titulo: 'Espacios y aforo', texto: 'Ocupación, capacidad y reservas de aulas y cubículos del campus.', acento: '52 211 153' },
  { tab: 'resources', icono: <Laptop />, titulo: 'Hardware y préstamos', texto: 'Inventario de equipos con trazabilidad estricta de cada préstamo.', acento: '167 139 250' },
  { tab: 'incidents', icono: <Sparkles />, titulo: 'Incidentes con IA', texto: 'Reporte y triaje inteligente que prioriza y enruta cada incidente.', acento: '251 113 133' },
  { tab: 'jury', icono: <Sliders />, titulo: 'Inspector del jurado', texto: 'Reglas de negocio configurables y pruebas en vivo para la sustentación.', acento: '251 191 36' }
]

const PASOS = [
  { icono: <Move3d className="h-5 w-5" />, titulo: 'Explora', texto: 'Arrastra para girar, rueda para acercar. Cambia a vista superior para ver el plano.' },
  { icono: <MousePointerClick className="h-5 w-5" />, titulo: 'Selecciona', texto: 'Haz clic en una sala: verás su estado, capacidad y agenda del día.' },
  { icono: <CalendarCheck className="h-5 w-5" />, titulo: 'Reserva', texto: 'Elige horario y asistentes. El servidor valida aforo, horario y solapes.' }
]

const DATOS = [
  { valor: String(SALAS_GEOMETRIA.length), texto: 'salas reservables' },
  { valor: '2', texto: 'roles: admin y usuario' },
  { valor: '8', texto: 'reglas de negocio (RN-01 a RN-08)' },
  { valor: '20 s', texto: 'refresco del estado' }
]

/** Contexto del proyecto al entrar al Gemelo 3D: qué es, qué módulos tiene y cómo usar el plano. */
export const ProjectContext: React.FC<ProjectContextProps> = ({ onIr, onVerPlano }) => (
  <section className="page-hero" style={{ ['--acento' as string]: '125 211 252' }}>
    <div className="hero-rejilla pointer-events-none absolute inset-y-0 right-0 w-3/4" />
    <img
      src={LOGO_URL}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute -right-10 -top-6 hidden w-[380px] opacity-[0.05] lg:block"
    />

    <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.15fr_1fr]">
      {/* Qué es el proyecto */}
      <div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eyebrow flex items-center gap-2 text-sky-300">
          <span className="h-px w-6 bg-sky-300" /> Hackatón · El campus bajo presión
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl"
        >
          Todo el campus en un <span className="titulo-aurora">solo centro de operaciones</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6 }}
          className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-300"
        >
          En el día a día del campus, las salas, los equipos y los incidentes se gestionan por separado: reservas que se
          cruzan, equipos sin rastro y fallas que nadie prioriza. <strong className="font-semibold text-white">Campuslands Ops</strong>{' '}
          los une en una plataforma: un gemelo digital 3D de Torre Zenith para reservar salas con datos reales, control de
          préstamos de hardware y triaje de incidentes asistido por IA, todo gobernado por reglas de negocio verificables.
        </motion.p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            onClick={onVerPlano}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-300 cursor-pointer"
          >
            Explorar el plano 3D <ArrowDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => onIr('spaces')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:text-white cursor-pointer"
          >
            Ver los módulos <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.06] pt-6 sm:grid-cols-4">
          {DATOS.map(d => (
            <div key={d.texto}>
              <dt className="font-display text-2xl font-bold text-white">{d.valor}</dt>
              <dd className="mt-0.5 text-xs text-slate-400">{d.texto}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Módulos de la plataforma */}
      <div>
        <p className="eyebrow text-slate-500">Módulos de la plataforma</p>
        <ul className="mt-4 space-y-2.5">
          {MODULOS.map((m, i) => (
            <motion.li
              key={m.tab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                onClick={() => (m.tab === '3d-twin' ? onVerPlano() : onIr(m.tab))}
                className="kpi group flex w-full items-center gap-4 p-3.5 text-left cursor-pointer"
                style={{ ['--acento' as string]: m.acento }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border [&>svg]:h-5 [&>svg]:w-5"
                  style={{ color: `rgb(${m.acento})`, borderColor: `rgb(${m.acento} / 0.3)`, background: `rgb(${m.acento} / 0.08)` }}
                >
                  {m.icono}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="font-mono text-[10px] text-slate-500">0{i + 1}</span> {m.titulo}
                    {m.tab === '3d-twin' && (
                      <span className="rounded-full bg-sky-300/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">Estás aquí</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-400">{m.texto}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>

    {/* Cómo usar el plano */}
    <div className="relative grid gap-3 border-t border-white/[0.06] p-6 sm:grid-cols-3 sm:p-8">
      {PASOS.map((p, i) => (
        <div key={p.titulo} className="flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-300/30 bg-sky-300/[0.07] text-sky-300">
            {p.icono}
          </span>
          <div>
            <p className="text-sm font-semibold text-white">
              <span className="mr-1.5 font-mono text-xs text-sky-300/70">0{i + 1}</span>
              {p.titulo}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{p.texto}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
)
