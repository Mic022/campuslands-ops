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
import { StarfieldBackground } from './components/ui/StarfieldBackground'
import { ToastContainer, ToastMessage } from './components/ui/Toast'
import { TorreZenithNivel6 } from './components/features/torre-zenith/TorreZenithNivel6'
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
  Radio,
  Cpu,
  Zap,
  Gauge
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
        `Incidencia [${nueva.codigo}] registrada. Espacio bloqueado preventivamente por regla integradora (RN-04).`,
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
      addToast('exito', `Incidencia [${res.codigo}] marcada como resuelta. Espacio reactivado inmediatamente.`, 'RN-04-RESTORE')
    } catch (err: any) {
      addToast('error', err.message)
    }
  }

  const handleUpdateConfig = async (nueva: Partial<ReglasConfig>) => {
    const actualizada = await apiClient.updateReglas(nueva)
    setConfig(actualizada)
    addToast('info', 'Parámetros de negocio actualizados en caliente.', 'CONFIG-APPLIED')
  }

  const handleToggleDemoMode = () => {
    const nuevoModo = !isDemoMode
    setIsDemoMode(nuevoModo)
    apiClient.setModoDemo(nuevoModo)
    addToast('info', nuevoModo ? 'Cambiado a Modo Demostración Offline.' : 'Sincronizando con Backend FastAPI (/api)...')
  }

  const incidenciasCriticasCount = incidencias.filter(
    i => i.prioridad === 'critica' && i.estado !== 'resuelta'
  ).length

  const espaciosDisponibles = espacios.filter(e => e.estado === 'disponible').length
  const porcentajeDisponibilidad = espacios.length > 0 
    ? Math.round((espaciosDisponibles / espacios.length) * 100) 
    : 100

  return (
    <div className="relative min-h-screen flex flex-col cosmic-void-bg text-slate-100 selection:bg-cyan-400 selection:text-black">
      {/* Cielo estrellado con cometas fugaces */}
      <StarfieldBackground />

      {/* Navbar Superior Flotante */}
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
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* HUD Holográfico de Telemetría Superior */}
        <section className="holo-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-r from-[#050814]/90 via-[#0A1128]/85 to-[#050814]/90 backdrop-blur-2xl">
          {/* Brillos ambientales */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 text-xs font-mono mb-3">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>TELEMETRÍA EN VIVO · HUB CAMPUSLANDS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-50 leading-tight">
                Control Operativo <span className="titulo-aurora">Holográfico & Triaje IA</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Plataforma unificada para resolver la fricción del campus: semáforo de aforo 3D, máquina de estados de hardware y enrutamiento inteligente de solicitudes.
              </p>
            </div>

            {/* Cuadrícula de Indicadores HUD */}
            <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Disponibilidad de Aulas */}
              <div className="holo-card p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Salas Libres</span>
                  <Building2 className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-mono font-black text-white">
                    {espaciosDisponibles}<span className="text-xs font-normal text-slate-400">/{espacios.length}</span>
                  </p>
                  <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeDisponibilidad}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Hardware Prestado */}
              <div className="holo-card p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">En Custodia</span>
                  <Laptop className="w-4 h-4 text-purple-400" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-mono font-black text-purple-300">
                    {prestamos.filter(p => p.estado === 'activo').length}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">Límite: {config.max_prestamos_activos}/usr</span>
                </div>
              </div>

              {/* Incidencias Críticas (RN-04) */}
              <div className="holo-card p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400">RN-04 Bloqueo</span>
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-mono font-black text-[#FF2A55]">
                    {incidenciasCriticasCount}
                  </p>
                  <span className="text-[10px] font-mono text-rose-300">
                    {incidenciasCriticasCount > 0 ? 'Espacio bloqueado' : 'Sin alertas'}
                  </span>
                </div>
              </div>

              {/* Motor de Reglas Activo */}
              <div className="holo-card p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Reglas Dominio</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-mono font-black text-emerald-400">
                    RN 1·2·3·4
                  </p>
                  <span className="text-[10px] font-mono text-emerald-300">Validador Activo</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contenido Dinámico de la Pestaña Activa */}
        <section className="space-y-6">
          {activeTab === '3d-twin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Zap className="w-5 h-5 text-sky-300" />
                    <span className="titulo-aurora">Torre Zenith · Nivel 6 — Reserva de salas</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Recorre el plano en 3D, selecciona cualquiera de las diez salas y resérvala. Las reservas se guardan en el backend.
                  </p>
                </div>
              </div>

              {/* Plano 3D de Torre Zenith · Nivel 6 con reservas persistentes (backend /api/nivel6) */}
              <TorreZenithNivel6 onToast={addToast} />

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

      {/* Modales con Glassmorphism Holográfico */}
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
