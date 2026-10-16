import React from 'react'
import { motion } from 'framer-motion'
import { Building2, Laptop, Sparkles, Sliders, Orbit, Radio, Siren } from 'lucide-react'
import { Brand } from './Brand'

export type TabType = '3d-twin' | 'spaces' | 'resources' | 'incidents' | 'jury'

interface NavbarProps {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  onOpenReportModal: () => void
  isDemoMode: boolean
  onToggleDemoMode: () => void
  incidenciasCriticasCount: number
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenReportModal,
  isDemoMode,
  onToggleDemoMode,
  incidenciasCriticasCount
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: '3d-twin', label: 'Gemelo 3D', icon: <Orbit className="h-4 w-4" /> },
    { id: 'spaces', label: 'Espacios', icon: <Building2 className="h-4 w-4" /> },
    { id: 'resources', label: 'Hardware', icon: <Laptop className="h-4 w-4" /> },
    {
      id: 'incidents',
      label: 'Incidentes IA',
      icon: <Sparkles className="h-4 w-4" />,
      badge: incidenciasCriticasCount > 0 ? incidenciasCriticasCount : undefined
    },
    { id: 'jury', label: 'Jurado', icon: <Sliders className="h-4 w-4" /> }
  ]

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl border border-white/[0.08] bg-[#070B1C]/90 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-3 sm:px-4">
          <Brand />

          {/* Navegación principal */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Módulos">
            {tabs.map(tab => {
              const activo = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  aria-current={activo ? 'page' : undefined}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                    activo ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {activo && (
                    <motion.span
                      layoutId="pestana-activa"
                      className="absolute inset-0 rounded-xl border border-sky-300/25 bg-sky-300/[0.08]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className={`relative ${activo ? 'text-sky-300' : ''}`}>{tab.icon}</span>
                  <span className="relative">{tab.label}</span>
                  {tab.badge && (
                    <span className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {tab.badge}
                    </span>
                  )}
                  {activo && (
                    <motion.span
                      layoutId="pestana-linea"
                      className="absolute -bottom-[9px] left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-sky-300 shadow-[0_0_12px_#7DD3FC]"
                    />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleDemoMode}
              title="Alternar entre datos de demostración y API en vivo (módulos de espacios, hardware e incidentes)"
              className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white sm:flex cursor-pointer"
            >
              <span className={`relative flex h-2 w-2`}>
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </span>
              {isDemoMode ? 'Demo' : 'En vivo'}
              <Radio className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-2 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-400 cursor-pointer"
            >
              <Siren className="h-4 w-4" />
              <span className="hidden sm:inline">Reportar incidente</span>
            </button>
          </div>
        </div>

        {/* Pestañas en móvil */}
        <div className="flex gap-1 overflow-x-auto border-t border-white/[0.06] px-2 py-2 lg:hidden">
          {tabs.map(tab => {
            const activo = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  activo ? 'border border-sky-300/30 bg-sky-300/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className={activo ? 'text-sky-300' : ''}>{tab.icon}</span>
                {tab.label}
                {tab.badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{tab.badge}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
