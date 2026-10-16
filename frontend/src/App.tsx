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
import { ApiError, apiClient } from './services/apiClient'
import { alExpirarSesion, guardarSesion, leerSesion, Sesion } from './services/sesion'
import { LoginScreen } from './components/auth/LoginScreen'
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
import { DataLoadReport } from './components/features/datos/DataLoadReport'
import { AvisoError, EstadoCarga } from './components/ui/EstadoDatos'
import { Building2, Laptop, Sparkles, Sliders, Orbit } from 'lucide-react'

type Fuente = 'reglas' | 'espacios' | 'recursos' | 'reservas' | 'prestamos' | 'incidencias'

/** Sin sesión se muestra el login; un 401 del backend devuelve aquí. */
export default function App() {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion)

  useEffect(() => alExpirarSesion(() => setSesion(null)) as () => void, [])

  if (!sesion) return <LoginScreen onEntrar={setSesion} />
  return (
    <Campus
      key={sesion.usuario.usuario}
      sesion={sesion}
      onSalir={() => {
        guardarSesion(null)
        setSesion(null)
      }}
    />
  )
}

function Campus({ sesion, onSalir }: { sesion: Sesion; onSalir: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('3d-twin')

  // Datos principales: todos vienen del backend (no hay datos de demostración).
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [config, setConfig] = useState<ReglasConfig | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState<Partial<Record<Fuente, string>>>({})

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
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, tipo, mensaje, codigo }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5500)
  }

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  /**
   * Carga cada fuente por separado: si una falla (p. ej. incidencias aún no publicada),
   * las demás pantallas siguen funcionando y esa muestra el error real de la API.
   */
  const cargarTodo = async () => {
    const nuevosErrores: Partial<Record<Fuente, string>> = {}
    const intentar = async <T,>(fuente: Fuente, fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn()
      } catch (err) {
        const e = err as ApiError
        nuevosErrores[fuente] = e.codigo ? `[${e.codigo}] ${e.message}` : e.message
        return undefined
      }
    }

    const [cfg, esp] = await Promise.all([
      intentar('reglas', () => apiClient.getReglas()),
      intentar('espacios', () => apiClient.getEspacios())
    ])
    // Los recursos se piden antes que los préstamos para poder nombrar el equipo de cada préstamo.
    const rec = await intentar('recursos', () => apiClient.getRecursos())
    const [res, pres, inc] = await Promise.all([
      intentar('reservas', () => apiClient.getReservas()),
      intentar('prestamos', () => apiClient.getPrestamos()),
      intentar('incidencias', () => apiClient.getIncidencias())
    ])

    if (cfg) setConfig(cfg)
    if (inc) setIncidencias(inc)
    if (esp) {
      // Solo para pintar: el espacio con una incidencia abierta de prioridad bloqueante.
      const bloqueantes = cfg?.prioridades_bloqueantes ?? []
      setEspacios(esp.map(e => ({
        ...e,
        incidenciaActivaId: (inc ?? []).find(
          i => i.espacioId === e.id && i.estado !== 'resuelta' && i.prioridad !== null && bloqueantes.includes(i.prioridad)
        )?.id
      })))
    }
    if (res) setReservas(res)
    if (pres) setPrestamos(pres)
    if (rec) {
      setRecursos(rec.map(r => ({
        ...r,
        solicitanteActual: (pres ?? []).find(p => p.recursoId === r.id && p.estado === 'activo')?.solicitanteNombre
      })))
    }
    setErrores(nuevosErrores)
    setCargando(false)
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  const mostrarError = (err: unknown) => {
    const e = err as ApiError
    addToast('error', e.message, e.codigo)
  }

  // Acciones: el backend valida todo y responde {codigo, mensaje}; aquí solo se muestra.
  const handleCrearReserva = async (datos: {
    espacioId: string
    solicitanteNombre: string
    inicio: string
    fin: string
    numPersonas: number
  }) => {
    try {
      const nueva = await apiClient.crearReserva(datos)
      await cargarTodo()
      addToast('exito', `Reserva #${nueva.id} confirmada para ${nueva.espacioNombre}.`)
    } catch (err) {
      mostrarError(err)
      throw err
    }
  }

  const handleCrearPrestamo = async (datos: {
    recursoId: string
    solicitanteNombre: string
    fechaEstimadaDevolucion: string
  }) => {
    try {
      const nuevo = await apiClient.crearPrestamo(datos)
      await cargarTodo()
      addToast('exito', `Préstamo #${nuevo.id} registrado a nombre de ${nuevo.solicitanteNombre}.`)
    } catch (err) {
      mostrarError(err)
      throw err
    }
  }

  const handleCambiarEstadoRecurso = async (recursoId: string, nuevoEstado: EstadoRecurso) => {
    try {
      const actualizado = await apiClient.actualizarEstadoRecurso(recursoId, nuevoEstado)
      await cargarTodo()
      addToast('exito', `El recurso ${actualizado.codigo} pasó a "${nuevoEstado}".`)
    } catch (err) {
      mostrarError(err)
    }
  }

  const handleDevolverPrestamo = async (prestamoId: string, estadoEntrega: 'optimo' | 'danado') => {
    try {
      await apiClient.devolverPrestamo(prestamoId, estadoEntrega)
      await cargarTodo()
      addToast(
        estadoEntrega === 'danado' ? 'advertencia' : 'exito',
        estadoEntrega === 'danado' ? 'Equipo devuelto y marcado como dañado.' : 'Equipo devuelto y disponible.'
      )
    } catch (err) {
      mostrarError(err)
    }
  }

  const handleCrearIncidencia = async (datos: Parameters<typeof apiClient.crearIncidencia>[0]) => {
    try {
      const nueva = await apiClient.crearIncidencia(datos)
      await cargarTodo()
      addToast('exito', `Incidencia ${nueva.codigo} registrada.`)
    } catch (err) {
      mostrarError(err)
      throw err
    }
  }

  const handleResolverIncidencia = async (incidenciaId: string) => {
    try {
      const res = await apiClient.resolverIncidencia(incidenciaId)
      await cargarTodo()
      addToast('exito', `Incidencia ${res.codigo} marcada como resuelta.`)
    } catch (err) {
      mostrarError(err)
    }
  }

  const incidenciasCriticasCount = incidencias.filter(
    i => i.prioridad === 'critica' && i.estado !== 'resuelta'
  ).length

  // Disponible = estado 'disponible' y sin incidencia abierta bloqueante (RN-04; la decisión final es del backend).
  const espacioBloqueado = (id: string) =>
    incidencias.some(
      i => i.espacioId === id && i.estado !== 'resuelta' && !!i.prioridad &&
        !!config?.prioridades_bloqueantes.includes(i.prioridad)
    )
  const espaciosDisponibles = espacios.filter(e => e.estado === 'disponible' && !espacioBloqueado(e.id)).length
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
        incidenciasCriticasCount={incidenciasCriticasCount}
        usuario={sesion.usuario}
        onSalir={onSalir}
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
            {/* Plano 3D de Torre Zenith · Nivel 6: espacios, reservas, incidencias y recursos del backend */}
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
              {!config && <EstadoCarga cargando={cargando} error={errores.reglas} onReintentar={cargarTodo} />}

              {config && activeTab === 'spaces' && (
                <>
                  <PageHero
                    acento="52 211 153"
                    modulo="Módulo 02 · Espacios y aforo"
                    icono={<Building2 />}
                    titulo="Cada espacio, con su"
                    tituloAcento="semáforo de aforo"
                    descripcion="Los espacios oficiales del campus con su aforo y estado. Reserva indicando fecha y horario: el servidor valida aforo, horario, solapes y bloqueos y responde con el código de la regla."
                    reglas={[`Horario ${config.hora_apertura}:00–${config.hora_cierre}:00`, `Máx. ${config.max_horas_reserva} h por reserva`, 'Validado por el servidor']}
                    kpis={[
                      { etiqueta: 'Espacios', valor: espacios.length, detalle: `${capacidadTotal} plazas en total` },
                      { etiqueta: 'Disponibles', valor: <span className="text-emerald-300">{espaciosDisponibles}</span>, detalle: 'Listos para reservar' },
                      { etiqueta: 'Reservas activas', valor: reservasActivas, detalle: `Máx. ${config.max_horas_reserva} h por reserva` },
                      { etiqueta: 'Horario', valor: `${config.hora_apertura}–${config.hora_cierre} h`, detalle: `Aforo al ${Math.round(config.factor_aforo * 100)} %` }
                    ]}
                  />
                  <AvisoError mensaje={errores.espacios ?? errores.reservas} />
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

              {config && activeTab === 'resources' && (
                <>
                  <PageHero
                    acento="167 139 250"
                    modulo="Módulo 03 · Hardware y préstamos"
                    icono={<Laptop />}
                    titulo="Equipos con"
                    tituloAcento="trazabilidad total"
                    descripcion="Inventario de equipos con una máquina de estados estricta: cada préstamo, devolución y daño queda registrado en el servidor, que también controla el cupo de préstamos por persona."
                    reglas={[`Máx. ${config.max_prestamos_activos} préstamos por persona`, 'Máquina de estados', 'Validado por el servidor']}
                    kpis={[
                      { etiqueta: 'Equipos', valor: recursos.length, detalle: 'En inventario' },
                      { etiqueta: 'Disponibles', valor: <span className="text-violet-300">{recursosDisponibles}</span>, detalle: 'Listos para prestar' },
                      { etiqueta: 'En préstamo', valor: prestamosActivos, detalle: 'Bajo custodia' },
                      { etiqueta: 'Fuera de servicio', valor: recursosFueraDeServicio, detalle: 'Dañados o en mantenimiento' }
                    ]}
                  />
                  <AvisoError mensaje={errores.recursos ?? errores.prestamos} />
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

              {config && activeTab === 'incidents' && (
                <>
                  <PageHero
                    acento="251 113 133"
                    modulo="Módulo 04 · Incidentes con IA"
                    icono={<Sparkles />}
                    titulo="Del reporte a la solución,"
                    tituloAcento="priorizado por IA"
                    descripcion="Describe el problema en lenguaje natural: la IA propone categoría, prioridad y área responsable. Lo dudoso pasa a revisión humana y lo crítico bloquea el espacio afectado."
                    reglas={[`Prioridades bloqueantes: ${config.prioridades_bloqueantes.join(', ')}`, `Revisión humana bajo ${Math.round(config.umbral_confianza_ia * 100)} % de confianza`]}
                    kpis={[
                      { etiqueta: 'Abiertas', valor: incidenciasAbiertas, detalle: 'En curso o sin asignar' },
                      { etiqueta: 'Críticas', valor: <span className="text-rose-300">{incidenciasCriticasCount}</span>, detalle: incidenciasCriticasCount ? 'Requieren atención' : 'Sin alertas' },
                      { etiqueta: 'Resueltas', valor: incidenciasResueltas, detalle: 'Cerradas' },
                      { etiqueta: 'Triaje IA', valor: `${triajeIA} %`, detalle: 'Clasificadas por IA' }
                    ]}
                  />
                  <AvisoError titulo="El módulo de incidencias de la API no respondió" mensaje={errores.incidencias} />
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

              {config && activeTab === 'jury' && (
                <>
                  <PageHero
                    acento="251 191 36"
                    modulo="Módulo 05 · Inspector del jurado"
                    icono={<Sliders />}
                    titulo="Reglas de negocio"
                    tituloAcento="vigentes en el servidor"
                    descripcion="Parámetros que aplica el backend en este momento, leídos de GET /api/reglas. Se cambian en backend/app/config/reglas.py y la interfaz los refleja sin tocar el frontend."
                    reglas={['Solo lectura', 'GET /api/reglas']}
                    kpis={[
                      { etiqueta: 'Aforo aplicado', valor: `${Math.round(config.factor_aforo * 100)} %`, detalle: 'Factor sobre el aforo oficial' },
                      { etiqueta: 'Horario', valor: `${config.hora_apertura}–${config.hora_cierre} h`, detalle: `Máx. ${config.max_horas_reserva} h por reserva` },
                      { etiqueta: 'Cupo préstamos', valor: config.max_prestamos_activos, detalle: 'Por persona' },
                      { etiqueta: 'Umbral IA', valor: `${Math.round(config.umbral_confianza_ia * 100)} %`, detalle: 'Confianza mínima' }
                    ]}
                  />
                  <JuryRulesInspector config={config} />
                  {/* Evidencia de la carga de datos oficiales (el endpoint es solo para administradores). */}
                  {sesion.usuario.rol === 'admin' && <DataLoadReport />}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />

      {/* Modales: envían al backend y muestran su {codigo, mensaje} */}
      {config && (
        <>
          <SpaceBookingModal
            isOpen={isBookingOpen}
            onClose={() => setIsBookingOpen(false)}
            espacio={espacioParaReserva}
            config={config}
            onSubmitReserva={handleCrearReserva}
          />

          <ResourceLoanModal
            isOpen={isLoanOpen}
            onClose={() => setIsLoanOpen(false)}
            recurso={recursoParaPrestamo}
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
        </>
      )}

      {/* Notificaciones Toasts Flotantes */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </div>
  )
}
