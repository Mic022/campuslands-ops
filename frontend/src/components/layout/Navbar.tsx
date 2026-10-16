import React from 'react'
import { motion } from 'framer-motion'
import { Building2, Laptop, Sparkles, Sliders, Orbit, Siren, UsersRound } from 'lucide-react'
import { Brand } from './Brand'
import { MenuUsuario } from './MenuUsuario'

export type TabType = '3d-twin' | 'spaces' | 'resources' | 'incidents' | 'jury' | 'admin'

interface NavbarProps {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  onOpenReportModal: () => void
  incidenciasCriticasCount: number
  /** La pestaña de administración solo se muestra al rol admin (el backend también lo exige). */
  esAdmin: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenReportModal,
  incidenciasCriticasCount,
  esAdmin
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
    { id: 'jury', label: 'Jurado', icon: <Sliders className="h-4 w-4" /> },
    ...(esAdmin ? [{ id: 'admin' as TabType, label: 'Usuarios', icon: <UsersRound className="h-4 w-4" /> }] : [])
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
                  className={`relative flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
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
              onClick={onOpenReportModal}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-400 cursor-pointer"
            >
              <Siren className="h-4 w-4" />
              <span className="hidden sm:inline lg:hidden xl:inline">Reportar incidente</span>
            </button>
            <MenuUsuario />
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
