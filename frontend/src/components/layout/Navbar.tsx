import React from 'react'
import { 
  Building2, 
  Laptop, 
  ShieldAlert, 
  Sparkles, 
  Sliders, 
  Layers, 
  Activity, 
  Radio,
  PlusCircle
} from 'lucide-react'

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
  const tabs = [
    { id: '3d-twin' as TabType, label: 'Gemelo Digital 3D', icon: <Layers className="w-4 h-4" /> },
    { id: 'spaces' as TabType, label: 'Espacios & Aforo', icon: <Building2 className="w-4 h-4" /> },
    { id: 'resources' as TabType, label: 'Inventario & Préstamos', icon: <Laptop className="w-4 h-4" /> },
    { 
      id: 'incidents' as TabType, 
      label: 'Triaje IA & Incidencias', 
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      badge: incidenciasCriticasCount > 0 ? incidenciasCriticasCount : undefined
    },
    { id: 'jury' as TabType, label: 'Inspector Jurado', icon: <Sliders className="w-4 h-4 text-cyan-400" /> }
  ]

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  CAMPUSLANDS <span className="text-cyan-400 font-mono">OPS</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                  MVP v2.6
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Sistema Central de Gestión Operativa · El Campus Bajo Presión
              </p>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            {tabs.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                    active
                      ? 'text-white bg-slate-800 shadow-sm border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Acciones Rápidas & Estado del Backend */}
          <div className="flex items-center gap-3">
            {/* Toggle Demo / Live */}
            <button
              onClick={onToggleDemoMode}
              title="Alternar entre datos de demostración y backend FastAPI"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                isDemoMode 
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' 
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isDemoMode ? 'text-amber-400' : 'text-emerald-400 animate-pulse'}`} />
              <span>{isDemoMode ? 'Modo Demo' : 'Live /api'}</span>
            </button>

            {/* Botón de Emergencia / Reportar Incidencia */}
            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Incidencia</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra móvil de pestañas */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 gap-1 border-t border-slate-800/60 bg-slate-900/40">
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                active
                  ? 'text-white bg-slate-800 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </header>
  )
}
