import React, { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { IntroSplash } from './components/ui/IntroSplash'
import { PageHero } from './components/layout/PageHero'
import { ProjectContext } from './components/features/torre-zenith/ProjectContext'
import { ToastContainer, ToastMessage } from './components/ui/Toast'
import { TorreZenithNivel6 } from './components/features/torre-zenith/TorreZenithNivel6'
import { SpacesMatrix } from './components/features/spaces/SpacesMatrix'
import { SpaceBookingModal } from './components/features/spaces/SpaceBookingModal'
import { ResourceInventory } from './components/features/resources/ResourceInventory'
import { ResourceLoanModal } from './components/features/resources/ResourceLoanModal'
import { IncidentBoard } from './components/features/incidents/IncidentBoard'
import { IncidentReportModal } from './components/features/incidents/IncidentReportModal'
import { JuryRulesInspector } from './components/features/live-jury/JuryRulesInspector'
import { Building2, Laptop, Sparkles, Sliders, Orbit } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('3d-twin')
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
  const capacidadTotal = espacios.reduce((t, e) => t + e.capacidad, 0)
  const reservasActivas = reservas.filter(r => r.estado === 'activa').length
  const prestamosActivos = prestamos.filter(p => p.estado === 'activo').length
  const recursosDisponibles = recursos.filter(r => r.estado === 'disponible').length
  const recursosFueraDeServicio = recursos.filter(r => r.estado === 'danado' || r.estado === 'mantenimiento').length
  const incidenciasAbiertas = incidencias.filter(i => i.estado !== 'resuelta').length
  const incidenciasResueltas = incidencias.filter(i => i.estado === 'resuelta').length
  const triajeIA = incidencias.length
    ? Math.round((incidencias.filter(i => i.origenTriaje === 'ia').length / incidencias.length) * 100)
    : 0

  const visorRef = useRef<HTMLDivElement>(null)
  const irAPestana = (tab: TabType) => {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen flex flex-col cosmic-void-bg text-slate-100 selection:bg-sky-300 selection:text-slate-950">
      {/* Intro de marca en cada carga */}
      <IntroSplash />

      {/* Cielo estrellado con cometas fugaces */}
      <StarfieldBackground />

      <Navbar
        activeTab={activeTab}
        onSelectTab={irAPestana}
        onOpenReportModal={() => {
          setTriajePrecargado(null)
          setIsReportOpen(true)
        }}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
        incidenciasCriticasCount={incidenciasCriticasCount}
      />

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* El Gemelo 3D se mantiene montado (en pausa) al cambiar de pestaña: así no se destruye ni
            reconstruye el contexto WebGL, y volver es instantáneo. */}
        <div className={activeTab === '3d-twin' ? 'entrada-suave space-y-8' : 'hidden'}>
          <ProjectContext
            onIr={irAPestana}
            onVerPlano={() => visorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          <div ref={visorRef} className="scroll-mt-28 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="eyebrow flex items-center gap-2 text-sky-300">
                  <Orbit className="h-3.5 w-3.5" /> Módulo 01 · Gemelo digital
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Torre Zenith · <span className="titulo-aurora">Nivel 6</span>
                </h2>
              </div>
              <p className="max-w-md text-sm text-slate-400">
                Selecciona una sala para ver su estado y reservarla. Las reservas se guardan en el servidor y el plano se actualiza solo.
              </p>
            </div>
            {/* Plano 3D de Torre Zenith · Nivel 6 con reservas persistentes (backend /api/nivel6) */}
            <TorreZenithNivel6 onToast={addToast} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab !== '3d-twin' && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              {activeTab === 'spaces' && (
                <>
                  <PageHero
                    acento="52 211 153"
                    modulo="Módulo 02 · Espacios y aforo"
                    icono={<Building2 />}
                    titulo="Cada espacio, con su"
                    tituloAcento="semáforo de aforo"
                    descripcion="Supervisa la ocupación de aulas y cubículos, reserva con validación de horario y capacidad, y detecta al instante los espacios bloqueados por incidentes críticos."
                    reglas={['RN-01 · Aforo y horario', 'RN-04 · Bloqueo por incidente']}
                    kpis={[
                      { etiqueta: 'Espacios', valor: espacios.length, detalle: `${capacidadTotal} plazas en total` },
                      { etiqueta: 'Disponibles', valor: <span className="text-emerald-300">{espaciosDisponibles}</span>, detalle: 'Listos para reservar' },
                      { etiqueta: 'Reservas activas', valor: reservasActivas, detalle: `Máx. ${config.max_horas_reserva} h por reserva` },
                      { etiqueta: 'Horario', valor: `${config.hora_apertura}–${config.hora_cierre} h`, detalle: `Aforo al ${Math.round(config.factor_aforo * 100)} %` }
                    ]}
                  />
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
                      irAPestana('3d-twin')
                    }}
                  />
                </>
              )}

              {activeTab === 'resources' && (
                <>
                  <PageHero
                    acento="167 139 250"
                    modulo="Módulo 03 · Hardware y préstamos"
                    icono={<Laptop />}
                    titulo="Equipos con"
                    tituloAcento="trazabilidad total"
                    descripcion="Inventario de laptops, kits y periféricos con una máquina de estados estricta: cada préstamo, devolución y daño queda registrado, y nadie supera su cupo de préstamos."
                    reglas={[`RN-02 · Máx. ${config.max_prestamos_activos} préstamos por persona`, 'RN-03 · Máquina de estados']}
                    kpis={[
                      { etiqueta: 'Equipos', valor: recursos.length, detalle: 'En inventario' },
                      { etiqueta: 'Disponibles', valor: <span className="text-violet-300">{recursosDisponibles}</span>, detalle: 'Listos para prestar' },
                      { etiqueta: 'En préstamo', valor: prestamosActivos, detalle: 'Bajo custodia' },
                      { etiqueta: 'Fuera de servicio', valor: recursosFueraDeServicio, detalle: 'Dañados o en mantenimiento' }
                    ]}
                  />
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
                </>
              )}

              {activeTab === 'incidents' && (
                <>
                  <PageHero
                    acento="251 113 133"
                    modulo="Módulo 04 · Incidentes con IA"
                    icono={<Sparkles />}
                    titulo="Del reporte a la solución,"
                    tituloAcento="priorizado por IA"
                    descripcion="Describe el problema en lenguaje natural: la IA propone categoría, prioridad y área responsable. Lo dudoso pasa a revisión humana y lo crítico bloquea el espacio afectado."
                    reglas={['RN-04 · Bloqueo preventivo', `Revisión humana bajo ${Math.round(config.umbral_confianza_ia * 100)} % de confianza`]}
                    kpis={[
                      { etiqueta: 'Abiertas', valor: incidenciasAbiertas, detalle: 'En curso o sin asignar' },
                      { etiqueta: 'Críticas', valor: <span className="text-rose-300">{incidenciasCriticasCount}</span>, detalle: incidenciasCriticasCount ? 'Requieren atención' : 'Sin alertas' },
                      { etiqueta: 'Resueltas', valor: incidenciasResueltas, detalle: 'Cerradas' },
                      { etiqueta: 'Triaje IA', valor: `${triajeIA} %`, detalle: 'Clasificadas por IA' }
                    ]}
                  />
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
                </>
              )}

              {activeTab === 'jury' && (
                <>
                  <PageHero
                    acento="251 191 36"
                    modulo="Módulo 05 · Inspector del jurado"
                    icono={<Sliders />}
                    titulo="Reglas de negocio,"
                    tituloAcento="demostradas en vivo"
                    descripcion="Ajusta los parámetros del negocio en caliente y ejecuta la batería de pruebas que demuestra cada regla frente al jurado, con resultados y códigos verificables."
                    reglas={['RN-01', 'RN-02', 'RN-03', 'RN-04']}
                    kpis={[
                      { etiqueta: 'Reglas activas', valor: 4, detalle: 'RN-01 a RN-04' },
                      { etiqueta: 'Horario', valor: `${config.hora_apertura}–${config.hora_cierre} h`, detalle: `Máx. ${config.max_horas_reserva} h por reserva` },
                      { etiqueta: 'Cupo préstamos', valor: config.max_prestamos_activos, detalle: 'Por persona' },
                      { etiqueta: 'Umbral IA', valor: `${Math.round(config.umbral_confianza_ia * 100)} %`, detalle: 'Confianza mínima' }
                    ]}
                  />
                  <JuryRulesInspector
                    config={config}
                    onUpdateConfig={handleUpdateConfig}
                    espacios={espacios}
                    recursos={recursos}
                    reservas={reservas}
                    prestamos={prestamos}
                    incidencias={incidencias}
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
