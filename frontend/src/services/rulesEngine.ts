import { 
  Espacio, 
  Recurso, 
  Reserva, 
  Prestamo, 
  Incidencia, 
  ReglasConfig, 
  ResultadoValidacion, 
  EstadoRecurso 
} from '../types/domain'

// Máquina de estados de recursos permitida (idéntica a TRANSICIONES_RECURSO en backend)
export const TRANSICIONES_VALIDAS: Record<EstadoRecurso, EstadoRecurso[]> = {
  disponible: ['prestado', 'mantenimiento', 'baja'],
  prestado: ['disponible', 'danado'],
  danado: ['mantenimiento', 'baja'],
  mantenimiento: ['disponible'],
  baja: []
}

/**
 * RN-01: Validación de Disponibilidad y Aforo de Espacio
 * Valida horario operativo, aforo permitido con factor, duración máxima y ausencia de solapamiento.
 */
export function validarReservaEspacio(
  espacio: Espacio,
  nuevaReserva: { horaInicio: string; horaFin: string; numPersonas: number; solicitanteEmail: string },
  reservasExistentes: Reserva[],
  incidenciasActivas: Incidencia[],
  config: ReglasConfig
): ResultadoValidacion {
  // 1. Verificar estado base del espacio
  if (espacio.estado === 'inhabilitado') {
    return {
      valido: false,
      codigo: 'RN-01-ESTADO-INHABILITADO',
      mensaje: `El espacio "${espacio.nombre}" está inhabilitado por condiciones de seguridad o daños.`
    }
  }

  if (espacio.estado === 'mantenimiento') {
    return {
      valido: false,
      codigo: 'RN-01-ESTADO-MANTENIMIENTO',
      mensaje: `El espacio "${espacio.nombre}" se encuentra bajo mantenimiento programado.`
    }
  }

  // 2. RN-04 Regla Integradora: Bloqueo por incidencia crítica activa
  const incidenciaBloqueante = incidenciasActivas.find(
    inc => inc.espacioId === espacio.id && 
           inc.estado !== 'resuelta' && 
           config.prioridades_bloqueantes.includes(inc.prioridad)
  )

  if (incidenciaBloqueante) {
    return {
      valido: false,
      codigo: 'RN-04-BLOQUEO-INCIDENCIA-CRITICA',
      mensaje: `Acceso restringido por RN-04: Existe una incidencia activa [${incidenciaBloqueante.codigo}] con prioridad ${incidenciaBloqueante.prioridad.toUpperCase()}: "${incidenciaBloqueante.titulo}".`
    }
  }

  // 3. Aforo permitido según factor_aforo
  const aforoMaximoPermitido = Math.floor(espacio.capacidad * config.factor_aforo)
  if (nuevaReserva.numPersonas > aforoMaximoPermitido) {
    return {
      valido: false,
      codigo: 'RN-01-EXCESO-AFORO',
      mensaje: `El aforo solicitado (${nuevaReserva.numPersonas}) excede el límite máximo permitido de ${aforoMaximoPermitido} personas (Capacidad base: ${espacio.capacidad}, Factor: ${(config.factor_aforo * 100).toFixed(0)}%).`
    }
  }

  if (nuevaReserva.numPersonas <= 0) {
    return {
      valido: false,
      codigo: 'RN-01-AFORO-INVALIDO',
      mensaje: 'El número de asistentes debe ser al menos 1 persona.'
    }
  }

  // 4. Parsear horas (formato HH:mm)
  const [hIni, mIni] = nuevaReserva.horaInicio.split(':').map(Number)
  const [hFin, mFin] = nuevaReserva.horaFin.split(':').map(Number)
  const decInicio = hIni + mIni / 60
  const decFin = hFin + mFin / 60

  if (decFin <= decInicio) {
    return {
      valido: false,
      codigo: 'RN-01-HORARIO-INCONSISTENTE',
      mensaje: 'La hora de fin debe ser posterior a la hora de inicio.'
    }
  }

  // 5. Horario de operación del campus
  if (decInicio < config.hora_apertura || decFin > config.hora_cierre) {
    return {
      valido: false,
      codigo: 'RN-01-FUERA-HORARIO-OPERATIVO',
      mensaje: `El campus opera únicamente de ${config.hora_apertura}:00 a ${config.hora_cierre}:00 horas.`
    }
  }

  // 6. Duración máxima permitida
  const duracionHoras = decFin - decInicio
  if (duracionHoras > config.max_horas_reserva) {
    return {
      valido: false,
      codigo: 'RN-01-MAX-DURACION-EXCEDIDA',
      mensaje: `La reserva excede el límite de ${config.max_horas_reserva} horas continuas (solicitadas: ${duracionHoras.toFixed(1)} h).`
    }
  }

  // 7. Detección de solapamiento con reservas activas
  const solapada = reservasExistentes.find(res => {
    if (res.espacioId !== espacio.id || res.estado !== 'activa') return false
    const [rHIni, rMIni] = res.horaInicio.split(':').map(Number)
    const [rHFin, rMFin] = res.horaFin.split(':').map(Number)
    const rDecIni = rHIni + rMIni / 60
    const rDecFin = rHFin + rMFin / 60

    // Conflicto de intervalos: max(ini1, ini2) < min(fin1, fin2)
    return Math.max(decInicio, rDecIni) < Math.min(decFin, rDecFin)
  })

  if (solapada) {
    return {
      valido: false,
      codigo: 'RN-01-SOLAPAMIENTO-RESERVA',
      mensaje: `Existe conflicto de horario con una reserva activa (${solapada.horaInicio} - ${solapada.horaFin}) a nombre de ${solapada.solicitanteNombre}.`
    }
  }

  return {
    valido: true,
    codigo: 'RN-01-OK',
    mensaje: 'Reserva validada con éxito.'
  }
}

/**
 * RN-02: Validación de Préstamo de Recursos Tecnológicos
 * Verifica operatividad del recurso y límite de préstamos por usuario.
 */
export function validarPrestamoRecurso(
  recurso: Recurso,
  solicitanteEmail: string,
  prestamosActivos: Prestamo[],
  incidenciasActivas: Incidencia[],
  config: ReglasConfig
): ResultadoValidacion {
  // 1. Estado del recurso
  if (recurso.estado !== 'disponible') {
    return {
      valido: false,
      codigo: 'RN-02-RECURSO-NO-DISPONIBLE',
      mensaje: `El recurso ${recurso.codigo} no está disponible (Estado actual: ${recurso.estado.toUpperCase()}).`
    }
  }

  // 2. Comprobar si el recurso tiene una incidencia activa
  const incidenciaRecurso = incidenciasActivas.find(
    inc => inc.recursoId === recurso.id && inc.estado !== 'resuelta'
  )
  if (incidenciaRecurso) {
    return {
      valido: false,
      codigo: 'RN-04-RECURSO-CON-INCIDENCIA',
      mensaje: `No se puede prestar el recurso ${recurso.codigo}: registra la incidencia activa "${incidenciaRecurso.titulo}".`
    }
  }

  // 3. Límite de préstamos activos por solicitante
  const conteoActivos = prestamosActivos.filter(
    p => p.solicitanteEmail.toLowerCase() === solicitanteEmail.toLowerCase() && p.estado === 'activo'
  ).length

  if (conteoActivos >= config.max_prestamos_activos) {
    return {
      valido: false,
      codigo: 'RN-02-LIMITE-PRESTAMOS-EXCEDIDO',
      mensaje: `El solicitante ${solicitanteEmail} ya posee ${conteoActivos} préstamo(s) activo(s). Límite permitido: ${config.max_prestamos_activos}.`
    }
  }

  return {
    valido: true,
    codigo: 'RN-02-OK',
    mensaje: 'Préstamo autorizado para despacho.'
  }
}

/**
 * RN-03: Validación de Máquina de Estados de Recursos
 */
export function validarTransicionRecurso(
  estadoActual: EstadoRecurso,
  nuevoEstado: EstadoRecurso
): ResultadoValidacion {
  if (estadoActual === nuevoEstado) {
    return {
      valido: true,
      codigo: 'RN-03-SIN-CAMBIO',
      mensaje: 'El estado no presenta cambios.'
    }
  }

  const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] || []
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    return {
      valido: false,
      codigo: 'RN-03-TRANSICION-INVALIDA',
      mensaje: `Transición no permitida: de "${estadoActual.toUpperCase()}" a "${nuevoEstado.toUpperCase()}". Estados válidos desde ${estadoActual}: [${transicionesPermitidas.join(', ') || 'NINGUNO (terminal)'}].`
    }
  }

  return {
    valido: true,
    codigo: 'RN-03-OK',
    mensaje: `Transición a ${nuevoEstado.toUpperCase()} validada.`
  }
}
