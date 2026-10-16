import React from 'react'
import { 
  Building2, 
  Laptop, 
  Sparkles, 
  Sliders, 
  Layers, 
  Activity, 
  Radio,
  PlusCircle,
  Zap
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
    { id: '3d-twin' as TabType, label: 'Gemelo 3D', icon: <Layers className="w-4 h-4" /> },
    { id: 'spaces' as TabType, label: 'Espacios & Aforo', icon: <Building2 className="w-4 h-4" /> },
    { id: 'resources' as TabType, label: 'Hardware & Préstamos', icon: <Laptop className="w-4 h-4" /> },
    { 
      id: 'incidents' as TabType, 
      label: 'Triaje IA & Incidentes', 
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      badge: incidenciasCriticasCount > 0 ? incidenciasCriticasCount : undefined
    },
    { id: 'jury' as TabType, label: 'Inspector Jurado', icon: <Sliders className="w-4 h-4 text-cyan-400" /> }
  ]

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="max-w-7xl mx-auto holo-panel rounded-2xl border border-white/10 p-2 shadow-2xl backdrop-blur-2xl bg-gradient-to-r from-slate-950/90 via-[#070B1A]/90 to-slate-950/90">
        <div className="flex items-center justify-between h-14 px-3">
          {/* Logo y Branding Futurista */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00F5FF] via-[#9D4EDD] to-[#FF007A] p-0.5 shadow-lg shadow-cyan-500/30">
              <div className="w-full h-full bg-[#030712] rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-wider bg-gradient-to-r from-white via-cyan-200 to-purple-400 bg-clip-text text-transparent">
                  CAMPUSLANDS <span className="text-cyan-400 font-mono">OPS</span>
                </span>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 font-bold">
                  HOLO·v3.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Centro Operativo Inteligente · El campus bajo presión
              </p>
            </div>
          </div>

          {/* Navegación por Pestañas con Píldoras Luminosas */}
          <nav className="hidden lg:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            {tabs.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                    active
                      ? 'text-white bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-[10px] font-extrabold text-white flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Acciones y Conexión */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onToggleDemoMode}
              title="Alternar entre modo autónomo demo y API en vivo"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
                isDemoMode 
                  ? 'bg-amber-950/50 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20' 
                  : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isDemoMode ? 'text-amber-400' : 'text-emerald-400 animate-pulse'}`} />
              <span className="hidden sm:inline">{isDemoMode ? 'Modo Demo' : 'Live /api'}</span>
            </button>

            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#FF007A] to-[#FF2A55] hover:from-[#ff1a8c] hover:to-[#ff456a] text-white shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Reportar Incidente</span>
            </button>
          </div>
        </div>

        {/* Pestañas en Móvil */}
        <div className="lg:hidden flex overflow-x-auto px-2 py-2 gap-1.5 border-t border-white/5 mt-1">
          {tabs.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  active
                    ? 'text-white bg-cyan-500/20 border border-cyan-400/50'
                    : 'text-slate-400 hover:text-white'
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
      </div>
    </header>
  )
}
