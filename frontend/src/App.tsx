import React, { useState, useEffect } from 'react'
import { 
  Espacio, 
  Recurso, 
  Incidencia, 
  Reserva, 
  Prestamo, 
  ReglasConfig, 
  TriajeIAResponse,
  EstadoRecurso
} from './types/domain'
import { apiClient } from './services/apiClient'
import { Navbar, TabType } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { ToastContainer, ToastMessage } from './components/ui/Toast'
import { CampusScene3D } from './scenes/CampusScene3D'
import { SceneFallback2D } from './scenes/SceneFallback2D'
import { SpacesMatrix } from './components/features/spaces/SpacesMatrix'
import { SpaceBookingModal } from './components/features/spaces/SpaceBookingModal'
import { ResourceInventory } from './components/features/resources/ResourceInventory'
import { ResourceLoanModal } from './components/features/resources/ResourceLoanModal'
import { IncidentBoard } from './components/features/incidents/IncidentBoard'
import { IncidentReportModal } from './components/features/incidents/IncidentReportModal'
import { JuryRulesInspector } from './components/features/live-jury/JuryRulesInspector'
import { 
  Building2, 
  Laptop, 
  ShieldAlert, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('3d-twin')
  const [is3DMode, setIs3DMode] = useState<boolean>(true)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true)

  // Datos principales
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [config, setConfig] = useState<ReglasConfig>({
    hora_apertura: 6,
    hora_cierre: 22,
    max_horas_reserva: 4,
    factor_aforo: 1.0,
    max_prestamos_activos: 2,
    prioridades_bloqueantes: ['critica', 'alta'],
    umbral_confianza_ia: 0.6,
    max_largo_descripcion: 1000
  })

  // Modales
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [espacioParaReserva, setEspacioParaReserva] = useState<Espacio | null>(null)

  const [isLoanOpen, setIsLoanOpen] = useState(false)
  const [recursoParaPrestamo, setRecursoParaPrestamo] = useState<Recurso | null>(null)

  const [isReportOpen, setIsReportOpen] = useState(false)
  const [triajePrecargado, setTriajePrecargado] = useState<{
    resultado: TriajeIAResponse
    descripcion: string
  } | null>(null)

  // Notificaciones Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (tipo: ToastMessage['tipo'], mensaje: string, codigo?: string) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, tipo, mensaje, codigo }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Carga inicial de datos
  const cargarTodo = async () => {
    try {
      const [esp, rec, inc, res, pres, cfg] = await Promise.all([
        apiClient.getEspacios(),
        apiClient.getRecursos(),
        apiClient.getIncidencias(),
        apiClient.getReservas(),
        apiClient.getPrestamos(),
        apiClient.getReglas()
      ])
      setEspacios(esp)
      setRecursos(rec)
      setIncidencias(inc)
      setReservas(res)
      setPrestamos(pres)
      setConfig(cfg)
    } catch {
      addToast('error', 'Error al sincronizar datos del campus.')
    }
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  // Acciones de Negocio
  const handleCrearReserva = async (datos: {
    espacioId: string
    solicitanteNombre: string
    solicitanteEmail: string
    horaInicio: string
    horaFin: string
    numPersonas: number
    motivo: string
  }) => {
    try {
      const nueva = await apiClient.crearReserva(datos)
      await cargarTodo()
      addToast('exito', `Reserva ${nueva.id} confirmada para ${nueva.espacioNombre}.`, 'RN-01-OK')
    } catch (err: any) {
      addToast('error', err.message, err.codigo || 'ERR-RESERVA')
      throw err
    }
  }

  const handleCrearPrestamo = async (datos: {
    recursoId: string
    solicitanteNombre: string
    solicitanteEmail: string
    fechaEstimadaDevolucion: string
  }) => {
    try {
      const nuevo = await apiClient.crearPrestamo(datos)
      await cargarTodo()
      addToast('exito', `Préstamo ${nuevo.id} asignado a ${nuevo.solicitanteNombre}.`, 'RN-02-OK')
    } catch (err: any) {
      addToast('error', err.message, err.codigo || 'ERR-PRESTAMO')
      throw err
    }
  }

  const handleCambiarEstadoRecurso = async (recursoId: string, nuevoEstado: EstadoRecurso) => {
    try {
      const actualizado = await apiClient.actualizarEstadoRecurso(recursoId, nuevoEstado)
      await cargarTodo()
      addToast('exito', `Recurso ${actualizado.codigo} pasó a estado ${nuevoEstado.toUpperCase()}.`, 'RN-03-OK')
    } catch (err: any) {
      addToast('error', err.message, err.codigo || 'RN-03-ERROR')
    }
  }

  const handleDevolverPrestamo = async (prestamoId: string, estadoEntrega: 'optimo' | 'danado') => {
    try {
      await apiClient.devolverPrestamo(prestamoId, estadoEntrega)
      await cargarTodo()
      addToast(
        estadoEntrega === 'danado' ? 'advertencia' : 'exito',
        `Equipo devuelto con estado: ${estadoEntrega.toUpperCase()}.`,
        'RN-03-DEVOLUCION'
      )
    } catch (err: any) {
      addToast('error', err.message)
    }
  }

  const handleCrearIncidencia = async (datos: any) => {
    try {
      const nueva = await apiClient.crearIncidencia(datos)
      await cargarTodo()
      addToast(
        datos.prioridad === 'critica' ? 'advertencia' : 'exito',
        `Incidencia [${nueva.codigo}] registrada. Espacio bloqueado preventivamente si aplica (RN-04).`,
        'RN-04-TRIAGE'
      )
    } catch (err: any) {
      addToast('error', err.message)
      throw err
    }
  }

  const handleResolverIncidencia = async (incidenciaId: string) => {
    try {
      const res = await apiClient.resolverIncidencia(incidenciaId)
      await cargarTodo()
      addToast('exito', `Incidencia [${res.codigo}] marcada como resuelta. Espacio reactivado si no hay otros bloqueos.`, 'RN-04-RESTORE')
    } catch (err: any) {
      addToast('error', err.message)
    }
  }

  const handleUpdateConfig = async (nueva: Partial<ReglasConfig>) => {
    const actualizada = await apiClient.updateReglas(nueva)
    setConfig(actualizada)
    addToast('info', 'Parámetros de negocio actualizados en tiempo real.', 'CONFIG-APPLIED')
  }

  const handleToggleDemoMode = () => {
    const nuevoModo = !isDemoMode
    setIsDemoMode(nuevoModo)
    apiClient.setModoDemo(nuevoModo)
    addToast('info', nuevoModo ? 'Cambiado a Modo Demostración Offline.' : 'Intentando conectar con Backend FastAPI (/api)...')
  }

  const incidenciasCriticasCount = incidencias.filter(
    i => i.prioridad === 'critica' && i.estado !== 'resuelta'
  ).length

  return (
    <div className="min-h-screen flex flex-col tech-grid-bg text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      {/* Navbar Superior */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenReportModal={() => {
          setTriajePrecargado(null)
          setIsReportOpen(true)
        }}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
        incidenciasCriticasCount={incidenciasCriticasCount}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section & KPIs en Vivo */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 shadow-2xl relative overflow-hidden bg-gradient-to-r from-slate-950 via-[#0C1222] to-slate-950">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-3">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Monitoreo Operativo Centralizado · Campuslands Hub</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Gestión Operativa de Espacios, Hardware e <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Incidencias con IA</span>
              </h1>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Control unificado contra la fricción diaria del campus: semáforo de aforo 3D, trazabilidad estricta de préstamos, y triaje inteligente de incidentes con reglas de negocio activas.
              </p>
            </div>

            {/* Micro-Dashboard de KPIs */}
            <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Aulas & Cubículos</span>
                <p className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                  {espacios.filter(e => e.estado === 'disponible').length} / {espacios.length}
                </p>
                <span className="text-[10px] text-emerald-400 font-mono">Disponibles ahora</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Hardware Prestado</span>
                <p className="text-xl font-bold font-mono text-purple-400 mt-0.5">
                  {prestamos.filter(p => p.estado === 'activo').length}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Equipos activos</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 font-medium">Incidencias Críticas</span>
                <p className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                  {incidenciasCriticasCount}
                </p>
                <span className="text-[10px] text-rose-400/80 font-mono">
                  {incidenciasCriticasCount > 0 ? 'Espacios bloqueados' : 'Operación normal'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Contenido Dinámico de la Pestaña Activa */}
        <section>
          {activeTab === '3d-twin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-cyan-400" />
                    <span>Gemelo Digital 3D del Campus</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Interactúa con la maqueta tridimensional: rota, haz zoom e inspecciona las aulas en tiempo real.
                  </p>
                </div>
              </div>

              {is3DMode ? (
                <CampusScene3D
                  espacios={espacios}
                  incidencias={incidencias}
                  onSelectEspacio={(esp) => setEspacioParaReserva(esp)}
                  onReservarEspacio={(esp) => {
                    setEspacioParaReserva(esp)
                    setIsBookingOpen(true)
                  }}
                  onSwitchTo2D={() => setIs3DMode(false)}
                />
              ) : (
                <SceneFallback2D
                  espacios={espacios}
                  incidencias={incidencias}
                  onSelectEspacio={(esp) => setEspacioParaReserva(esp)}
                  onReservarEspacio={(esp) => {
                    setEspacioParaReserva(esp)
                    setIsBookingOpen(true)
                  }}
                  onSwitchTo3D={() => setIs3DMode(true)}
                />
              )}
            </div>
          )}

          {activeTab === 'spaces' && (
            <SpacesMatrix
              espacios={espacios}
              reservas={reservas}
              incidencias={incidencias}
              config={config}
              onSelectEspacio={(esp) => setEspacioParaReserva(esp)}
              onReservarEspacio={(esp) => {
                setEspacioParaReserva(esp)
                setIsBookingOpen(true)
              }}
              onFocusIn3D={(esp) => {
                setEspacioParaReserva(esp)
                setActiveTab('3d-twin')
                setIs3DMode(true)
              }}
            />
          )}

          {activeTab === 'resources' && (
            <ResourceInventory
              recursos={recursos}
              prestamos={prestamos}
              incidencias={incidencias}
              config={config}
              onPrestarRecurso={(rec) => {
                setRecursoParaPrestamo(rec)
                setIsLoanOpen(true)
              }}
              onCambiarEstado={handleCambiarEstadoRecurso}
              onDevolverPrestamo={handleDevolverPrestamo}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentBoard
              incidencias={incidencias}
              espacios={espacios}
              recursos={recursos}
              config={config}
              onResolverIncidencia={handleResolverIncidencia}
              onAbrirReporteModalConTriaje={(triaje) => {
                setTriajePrecargado(triaje)
                setIsReportOpen(true)
              }}
            />
          )}

          {activeTab === 'jury' && (
            <JuryRulesInspector
              config={config}
              onUpdateConfig={handleUpdateConfig}
              espacios={espacios}
              recursos={recursos}
              reservas={reservas}
              prestamos={prestamos}
              incidencias={incidencias}
            />
          )}
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Modales */}
      <SpaceBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        espacio={espacioParaReserva}
        reservasExistentes={reservas}
        incidenciasActivas={incidencias}
        config={config}
        onSubmitReserva={handleCrearReserva}
      />

      <ResourceLoanModal
        isOpen={isLoanOpen}
        onClose={() => setIsLoanOpen(false)}
        recurso={recursoParaPrestamo}
        prestamosActivos={prestamos}
        incidenciasActivas={incidencias}
        config={config}
        onSubmitPrestamo={handleCrearPrestamo}
      />

      <IncidentReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        espacios={espacios}
        recursos={recursos}
        config={config}
        triajePrecargado={triajePrecargado}
        onSubmitIncidencia={handleCrearIncidencia}
      />

      {/* Notificaciones Toasts Flotantes */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </div>
  )
}
