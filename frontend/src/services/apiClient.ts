import { 
  Espacio, 
  Recurso, 
  Incidencia, 
  Reserva, 
  Prestamo, 
  ReglasConfig, 
  TriajeIAResponse,
  CategoriaIncidencia,
  PrioridadIncidencia,
  AreaResolutora,
  EstadoRecurso
} from '../types/domain'
import { 
  ESPACIOS_INICIALES, 
  RECURSOS_INICIALES, 
  INCIDENCIAS_INICIALES, 
  RESERVAS_INICIALES, 
  PRESTAMOS_INICIALES,
  REGLAS_INICIALES 
} from '../data/demoData'
import { 
  validarReservaEspacio, 
  validarPrestamoRecurso, 
  validarTransicionRecurso 
} from './rulesEngine'

export class ApiError extends Error {
  codigo: string
  detalles?: unknown

  constructor(codigo: string, mensaje: string, detalles?: unknown) {
    super(mensaje)
    this.codigo = codigo
    this.detalles = detalles
  }
}

// In-memory demo store
let storeEspacios: Espacio[] = [...ESPACIOS_INICIALES]
let storeRecursos: Recurso[] = [...RECURSOS_INICIALES]
let storeIncidencias: Incidencia[] = [...INCIDENCIAS_INICIALES]
let storeReservas: Reserva[] = [...RESERVAS_INICIALES]
let storePrestamos: Prestamo[] = [...PRESTAMOS_INICIALES]
let storeReglas: ReglasConfig = { ...REGLAS_INICIALES }

let modoDemoForzado = true
let backendOnline = false

export const apiClient = {
  getModoDemo: () => modoDemoForzado,
  setModoDemo: (val: boolean) => { modoDemoForzado = val },
  isBackendOnline: () => backendOnline,

  async checkHealth(): Promise<{ estado: string; modo: 'live' | 'demo' }> {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        backendOnline = true
        return { estado: 'ok', modo: modoDemoForzado ? 'demo' : 'live' }
      }
    } catch {
      backendOnline = false
    }
    return { estado: 'offline', modo: 'demo' }
  },

  async getReglas(): Promise<ReglasConfig> {
    if (!modoDemoForzado && backendOnline) {
      try {
        const res = await fetch('/api/reglas')
        if (res.ok) return await res.json()
      } catch {
        // fallback to store
      }
    }
    return { ...storeReglas }
  },

  async updateReglas(nuevas: Partial<ReglasConfig>): Promise<ReglasConfig> {
    storeReglas = { ...storeReglas, ...nuevas }
    return { ...storeReglas }
  },

  async getEspacios(): Promise<Espacio[]> {
    // Sincronizar estado inhabilitado si hay incidencia crítica
    return storeEspacios.map(esp => {
      const incCritica = storeIncidencias.find(
        i => i.espacioId === esp.id && 
             i.estado !== 'resuelta' && 
             storeReglas.prioridades_bloqueantes.includes(i.prioridad)
      )
      if (incCritica) {
        return { 
          ...esp, 
          estado: 'inhabilitado', 
          incidenciaActivaId: incCritica.id,
          colorTema: '#EF4444'
        }
      }
      return esp
    })
  },

  async getRecursos(): Promise<Recurso[]> {
    return [...storeRecursos]
  },

  async getIncidencias(): Promise<Incidencia[]> {
    return [...storeIncidencias]
  },

  async getReservas(): Promise<Reserva[]> {
    return [...storeReservas]
  },

  async getPrestamos(): Promise<Prestamo[]> {
    return [...storePrestamos]
  },

  async crearReserva(datos: {
    espacioId: string
    solicitanteNombre: string
    solicitanteEmail: string
    horaInicio: string
    horaFin: string
    numPersonas: number
    motivo: string
  }): Promise<Reserva> {
    const espaciosActuales = await this.getEspacios()
    const espacio = espaciosActuales.find(e => e.id === datos.espacioId)
    if (!espacio) {
      throw new ApiError('ERR-404', 'El espacio seleccionado no existe.')
    }

    // Validar con RN-01 y RN-04
    const validacion = validarReservaEspacio(
      espacio,
      datos,
      storeReservas,
      storeIncidencias,
      storeReglas
    )

    if (!validacion.valido) {
      throw new ApiError(validacion.codigo, validacion.mensaje)
    }

    const nuevaReserva: Reserva = {
      id: `RES-${Date.now().toString().slice(-4)}`,
      espacioId: espacio.id,
      espacioNombre: espacio.nombre,
      solicitanteNombre: datos.solicitanteNombre,
      solicitanteEmail: datos.solicitanteEmail,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      numPersonas: datos.numPersonas,
      motivo: datos.motivo,
      estado: 'activa',
      creadaEn: new Date().toISOString().replace('T', ' ').slice(0, 19)
    }

    storeReservas = [nuevaReserva, ...storeReservas]
    return nuevaReserva
  },

  async crearPrestamo(datos: {
    recursoId: string
    solicitanteNombre: string
    solicitanteEmail: string
    fechaEstimadaDevolucion: string
  }): Promise<Prestamo> {
    const recurso = storeRecursos.find(r => r.id === datos.recursoId)
    if (!recurso) {
      throw new ApiError('ERR-404', 'El recurso solicitado no existe.')
    }

    // Validar RN-02 y RN-04
    const validacion = validarPrestamoRecurso(
      recurso,
      datos.solicitanteEmail,
      storePrestamos,
      storeIncidencias,
      storeReglas
    )

    if (!validacion.valido) {
      throw new ApiError(validacion.codigo, validacion.mensaje)
    }

    // Validar transición RN-03 a 'prestado'
    const trans = validarTransicionRecurso(recurso.estado, 'prestado')
    if (!trans.valido) {
      throw new ApiError(trans.codigo, trans.mensaje)
    }

    const nuevoPrestamo: Prestamo = {
      id: `PRES-${Date.now().toString().slice(-4)}`,
      recursoId: recurso.id,
      recursoNombre: recurso.nombre,
      recursoCodigo: recurso.codigo,
      solicitanteNombre: datos.solicitanteNombre,
      solicitanteEmail: datos.solicitanteEmail,
      fechaPrestamo: new Date().toISOString().replace('T', ' ').slice(0, 19),
      fechaEstimadaDevolucion: datos.fechaEstimadaDevolucion,
      estado: 'activo'
    }

    // Actualizar estado del recurso
    storeRecursos = storeRecursos.map(r => 
      r.id === recurso.id 
        ? { ...r, estado: 'prestado', solicitanteActual: datos.solicitanteEmail }
        : r
    )

    storePrestamos = [nuevoPrestamo, ...storePrestamos]
    return nuevoPrestamo
  },

  async actualizarEstadoRecurso(recursoId: string, nuevoEstado: EstadoRecurso): Promise<Recurso> {
    const recurso = storeRecursos.find(r => r.id === recursoId)
    if (!recurso) {
      throw new ApiError('ERR-404', 'Recurso no encontrado.')
    }

    const validacion = validarTransicionRecurso(recurso.estado, nuevoEstado)
    if (!validacion.valido) {
      throw new ApiError(validacion.codigo, validacion.mensaje)
    }

    storeRecursos = storeRecursos.map(r => {
      if (r.id === recursoId) {
        return {
          ...r,
          estado: nuevoEstado,
          solicitanteActual: nuevoEstado === 'prestado' ? r.solicitanteActual : undefined
        }
      }
      return r
    })

    return storeRecursos.find(r => r.id === recursoId)!
  },

  async devolverPrestamo(prestamoId: string, estadoEntrega: 'optimo' | 'danado'): Promise<void> {
    const prestamo = storePrestamos.find(p => p.id === prestamoId)
    if (!prestamo) throw new ApiError('ERR-404', 'Préstamo no encontrado.')

    storePrestamos = storePrestamos.map(p => 
      p.id === prestamoId ? { ...p, estado: 'devuelto' } : p
    )

    const nuevoEstado: EstadoRecurso = estadoEntrega === 'danado' ? 'danado' : 'disponible'
    storeRecursos = storeRecursos.map(r => 
      r.id === prestamo.recursoId ? { ...r, estado: nuevoEstado, solicitanteActual: undefined } : r
    )
  },

  async triajeConIA(texto: string): Promise<TriajeIAResponse> {
    const lower = texto.toLowerCase()
    
    // Heurística de Triaje de IA con procesamiento de lenguaje natural semántico
    let categoria: CategoriaIncidencia = 'otro'
    let prioridad: PrioridadIncidencia = 'baja'
    let area: AreaResolutora = 'administracion'
    let confianza = 0.85
    let razonamiento = ''
    let sugerenciaAccion = ''

    if (
      lower.includes('humo') || 
      lower.includes('fuego') || 
      lower.includes('chispa') || 
      lower.includes('corto') || 
      lower.includes('calor') || 
      lower.includes('aire acondicionado') ||
      lower.includes('breaker') ||
      lower.includes('inund') ||
      lower.includes('gotera')
    ) {
      categoria = 'infraestructura'
      prioridad = (lower.includes('humo') || lower.includes('chispa') || lower.includes('fuego') || lower.includes('breaker')) 
        ? 'critica' 
        : 'alta'
      area = 'mantenimiento'
      confianza = 0.94
      razonamiento = 'Se detectaron palabras de alto riesgo físico y térmico que comprometen la infraestructura y seguridad del campus.'
      sugerenciaAccion = prioridad === 'critica' 
        ? 'Bloquear inmediatamente el espacio afectado (RN-04) y despachar cuadrilla de emergencia técnica.'
        : 'Programar inspección técnica y restringir uso de tomas eléctricas secundarias.'
    } else if (
      lower.includes('internet') || 
      lower.includes('wifi') || 
      lower.includes('fibra') || 
      lower.includes('red') || 
      lower.includes('switch') || 
      lower.includes('latencia') ||
      lower.includes('conexion')
    ) {
      categoria = 'conectividad'
      prioridad = lower.includes('caida general') || lower.includes('todo el piso') ? 'critica' : 'alta'
      area = 'soporte_ti'
      confianza = 0.92
      razonamiento = 'Falla de telecomunicaciones que impacta el desarrollo de actividades académicas o pruebas en vivo.'
      sugerenciaAccion = 'Monitorear throughput de switch PoE y reiniciar enlace secundario de fibra.'
    } else if (
      lower.includes('laptop') || 
      lower.includes('pantalla') || 
      lower.includes('monitor') || 
      lower.includes('teclado') || 
      lower.includes('mouse') ||
      lower.includes('bateria') ||
      lower.includes('visor') ||
      lower.includes('camara')
    ) {
      categoria = 'equipo_tecnologico'
      prioridad = lower.includes('bateria hinchada') ? 'alta' : 'media'
      area = 'soporte_ti'
      confianza = 0.90
      razonamiento = 'Anomalía o falla de hardware en equipo tecnológico inventariado.'
      sugerenciaAccion = 'Aislar el equipo, marcar como DAÑADO en inventario (RN-03) e iniciar trámite de garantía.'
    } else if (
      lower.includes('basura') || 
      lower.includes('sucio') || 
      lower.includes('derrame') || 
      lower.includes('cafe') || 
      lower.includes('limpieza')
    ) {
      categoria = 'limpieza'
      prioridad = 'media'
      area = 'mantenimiento'
      confianza = 0.88
      razonamiento = 'Incidencia sanitaria o de orden que no compromete equipos críticos pero afecta la habitabilidad.'
      sugerenciaAccion = 'Notificar a personal de aseo y servicios generales para aseo correctivo.'
    } else if (
      lower.includes('pelea') || 
      lower.includes('robo') || 
      lower.includes('perdida') || 
      lower.includes('puerta') || 
      lower.includes('llave')
    ) {
      categoria = 'seguridad'
      prioridad = 'alta'
      area = 'seguridad'
      confianza = 0.89
      razonamiento = 'Vulnerabilidad de acceso o seguridad física dentro del campus.'
      sugerenciaAccion = 'Revisar grabaciones del circuito cerrado de TV y alertar a guardia de turno.'
    } else {
      categoria = 'otro'
      prioridad = 'baja'
      area = 'administracion'
      confianza = 0.55 // Por debajo del umbral 0.60 para demostrar regla de revisión humana
      razonamiento = 'La descripción es ambigua o no contiene términos clave concluyentes del catálogo operativo.'
      sugerenciaAccion = 'Requiere triaje manual y confirmación por parte de un operador de campus.'
    }

    const requiereRevisionHumana = confianza < storeReglas.umbral_confianza_ia

    return {
      categoria,
      prioridad,
      area,
      confianza,
      razonamiento,
      sugerenciaAccion,
      requiereRevisionHumana
    }
  },

  async crearIncidencia(datos: {
    titulo: string
    descripcion: string
    espacioId?: string
    recursoId?: string
    categoria: CategoriaIncidencia
    prioridad: PrioridadIncidencia
    area: AreaResolutora
    confianzaIA: number
    razonamientoIA: string
    sugerenciaAccion: string
    origenTriaje: 'ia' | 'manual'
  }): Promise<Incidencia> {
    const espacio = datos.espacioId ? storeEspacios.find(e => e.id === datos.espacioId) : undefined
    const recurso = datos.recursoId ? storeRecursos.find(r => r.id === datos.recursoId) : undefined

    const nuevaIncidencia: Incidencia = {
      id: `INC-${Date.now().toString().slice(-4)}`,
      codigo: `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      espacioId: datos.espacioId,
      espacioNombre: espacio?.nombre,
      recursoId: datos.recursoId,
      recursoCodigo: recurso?.codigo,
      categoria: datos.categoria,
      prioridad: datos.prioridad,
      area: datos.area,
      estado: 'abierta',
      confianzaIA: datos.confianzaIA,
      razonamientoIA: datos.razonamientoIA,
      sugerenciaAccion: datos.sugerenciaAccion,
      origenTriaje: datos.origenTriaje,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    }

    // RN-04: Si la incidencia es crítica/alta sobre un espacio, inhabilitar el espacio
    if (espacio && storeReglas.prioridades_bloqueantes.includes(datos.prioridad)) {
      storeEspacios = storeEspacios.map(e => 
        e.id === espacio.id 
          ? { ...e, estado: 'inhabilitado', colorTema: '#EF4444', incidenciaActivaId: nuevaIncidencia.id }
          : e
      )
    }

    // Si es sobre un recurso, marcarlo como dañado
    if (recurso && (datos.prioridad === 'critica' || datos.prioridad === 'alta')) {
      storeRecursos = storeRecursos.map(r =>
        r.id === recurso.id ? { ...r, estado: 'danado' } : r
      )
    }

    storeIncidencias = [nuevaIncidencia, ...storeIncidencias]
    return nuevaIncidencia
  },

  async resolverIncidencia(incidenciaId: string): Promise<Incidencia> {
    const inc = storeIncidencias.find(i => i.id === incidenciaId)
    if (!inc) throw new ApiError('ERR-404', 'Incidencia no encontrada.')

    storeIncidencias = storeIncidencias.map(i => 
      i.id === incidenciaId ? { ...i, estado: 'resuelta' } : i
    )

    // Si el espacio no tiene más incidencias críticas, reactivarlo
    if (inc.espacioId) {
      const otrasCriticas = storeIncidencias.find(
        i => i.espacioId === inc.espacioId && 
             i.id !== incidenciaId && 
             i.estado !== 'resuelta' && 
             storeReglas.prioridades_bloqueantes.includes(i.prioridad)
      )
      if (!otrasCriticas) {
        storeEspacios = storeEspacios.map(e => 
          e.id === inc.espacioId ? { ...e, estado: 'disponible', colorTema: '#10B981', incidenciaActivaId: undefined } : e
        )
      }
    }

    return storeIncidencias.find(i => i.id === incidenciaId)!
  }
}
