import { Espacio, Recurso, Incidencia, Reserva, Prestamo, ReglasConfig } from '../types/domain'

export const REGLAS_INICIALES: ReglasConfig = {
  hora_apertura: 6,
  hora_cierre: 22,
  max_horas_reserva: 4,
  factor_aforo: 1.0,
  max_prestamos_activos: 2,
  prioridades_bloqueantes: ['critica', 'alta'],
  umbral_confianza_ia: 0.6,
  max_largo_descripcion: 1000
}

export const ESPACIOS_INICIALES: Espacio[] = [
  {
    id: 'ESP-01',
    nombre: 'Laboratorio Turing (Software & IA)',
    tipo: 'aula',
    piso: 1,
    capacidad: 35,
    estado: 'disponible',
    equipamiento: ['35 Estaciones de trabajo', 'Proyector Láser 4K', 'Fibra óptica 1Gbps', 'Audio envolvente'],
    coordenadas3D: [-3.5, 0.6, -1.8],
    dimensiones3D: [3.4, 1.2, 2.6],
    colorTema: '#10B981'
  },
  {
    id: 'ESP-02',
    nombre: 'Aula Lovelace (Fullstack Dev)',
    tipo: 'aula',
    piso: 1,
    capacidad: 30,
    estado: 'disponible',
    equipamiento: ['30 Estaciones de trabajo', 'Pantalla interactiva 85"', 'Pizarras magnéticas duales'],
    coordenadas3D: [0.8, 0.6, -1.8],
    dimensiones3D: [3.2, 1.2, 2.6],
    colorTema: '#10B981'
  },
  {
    id: 'ESP-03',
    nombre: 'Aula Hamilton (Hardware & Embedded)',
    tipo: 'aula',
    piso: 1,
    capacidad: 25,
    estado: 'inhabilitado',
    equipamiento: ['Osciloscopios', 'Bancos de soldadura', 'Estaciones Linux'],
    coordenadas3D: [4.8, 0.6, -1.8],
    dimensiones3D: [3.0, 1.2, 2.6],
    colorTema: '#EF4444',
    incidenciaActivaId: 'INC-301'
  },
  {
    id: 'ESP-04',
    nombre: 'Cubículo Delta 1 (Coworking)',
    tipo: 'cubiculo',
    piso: 2,
    capacidad: 6,
    estado: 'disponible',
    equipamiento: ['Smart TV 55"', 'Mesa de juntas ergonómica', 'Micrófono de conferencia'],
    coordenadas3D: [-3.8, 2.2, 1.8],
    dimensiones3D: [2.0, 1.1, 1.8],
    colorTema: '#10B981'
  },
  {
    id: 'ESP-05',
    nombre: 'Cubículo Delta 2 (Entrevistas & Pitch)',
    tipo: 'cubiculo',
    piso: 2,
    capacidad: 4,
    estado: 'disponible',
    equipamiento: ['Webcam 4K', 'Kit de iluminación', 'Aislamiento acústico'],
    coordenadas3D: [-1.4, 2.2, 1.8],
    dimensiones3D: [1.8, 1.1, 1.8],
    colorTema: '#10B981'
  },
  {
    id: 'ESP-06',
    nombre: 'Tech Lab & Rack Central',
    tipo: 'aula',
    piso: 2,
    capacidad: 12,
    estado: 'mantenimiento',
    equipamiento: ['Racks Cisco', 'Servidores ProLiant', 'Sensores de telemetría IoT'],
    coordenadas3D: [1.5, 2.2, 1.8],
    dimensiones3D: [2.6, 1.1, 1.8],
    colorTema: '#F59E0B'
  },
  {
    id: 'ESP-07',
    nombre: 'Cubículo Sigma (Mentoría 1:1)',
    tipo: 'cubiculo',
    piso: 2,
    capacidad: 3,
    estado: 'disponible',
    equipamiento: ['Pizarra acrílica', 'Monitor dual USB-C'],
    coordenadas3D: [4.6, 2.2, 1.8],
    dimensiones3D: [1.8, 1.1, 1.8],
    colorTema: '#10B981'
  }
]

export const RECURSOS_INICIALES: Recurso[] = [
  {
    id: 'REC-101',
    codigo: 'LAP-MBP-01',
    nombre: 'MacBook Pro M2 Max (32GB RAM)',
    tipo: 'laptop',
    estado: 'disponible',
    espacioActualNombre: 'Armario de Préstamos TI',
    fechaUltimoMantenimiento: '2026-09-15',
    observaciones: 'Batería 98%, Xcode y Docker preinstalados.'
  },
  {
    id: 'REC-102',
    codigo: 'LAP-XPS-04',
    nombre: 'Dell XPS 15 Developer Edition',
    tipo: 'laptop',
    estado: 'prestado',
    espacioActualNombre: 'Laboratorio Turing',
    solicitanteActual: 'camila.tech@campuslands.edu',
    fechaUltimoMantenimiento: '2026-09-20',
    observaciones: 'En préstamo activo para taller de backend.'
  },
  {
    id: 'REC-103',
    codigo: 'IOT-JET-02',
    nombre: 'Kit NVIDIA Jetson Nano AI Dev',
    tipo: 'kit_iot',
    estado: 'disponible',
    espacioActualNombre: 'Tech Lab Rack Central',
    fechaUltimoMantenimiento: '2026-10-01',
    observaciones: 'Incluye cámara CSI y sensor LiDAR.'
  },
  {
    id: 'REC-104',
    codigo: 'VR-MQ3-01',
    nombre: 'Visor Meta Quest 3 (512GB)',
    tipo: 'periferico',
    estado: 'mantenimiento',
    espacioActualNombre: 'Taller de Soporte TI',
    fechaUltimoMantenimiento: '2026-10-12',
    observaciones: 'Actualización de firmware y reemplazo de almohadilla.'
  },
  {
    id: 'REC-105',
    codigo: 'PROY-EPS-02',
    nombre: 'Proyector Láser Epson 4K 5000 Lumens',
    tipo: 'proyector',
    estado: 'disponible',
    espacioActualNombre: 'Aula Lovelace',
    fechaUltimoMantenimiento: '2026-08-30'
  },
  {
    id: 'REC-106',
    codigo: 'LAP-THK-12',
    nombre: 'Lenovo ThinkPad P16 Workstation',
    tipo: 'laptop',
    estado: 'prestado',
    espacioActualNombre: 'Cubículo Delta 1',
    solicitanteActual: 'felipe.code@campuslands.edu',
    fechaUltimoMantenimiento: '2026-10-05'
  },
  {
    id: 'REC-107',
    codigo: 'OSC-RIG-01',
    nombre: 'Osciloscopio Digital Rigol DS1054Z',
    tipo: 'kit_iot',
    estado: 'danado',
    espacioActualNombre: 'Aula Hamilton',
    fechaUltimoMantenimiento: '2026-07-11',
    observaciones: 'Sonda canal 2 averiada por sobrevoltaje. Pendiente calibración.'
  },
  {
    id: 'REC-108',
    codigo: 'PAN-LG-03',
    nombre: 'Monitor Ultrawide LG 34" Curvo',
    tipo: 'pantalla',
    estado: 'disponible',
    espacioActualNombre: 'Cubículo Delta 2',
    fechaUltimoMantenimiento: '2026-09-10'
  }
]

export const INCIDENCIAS_INICIALES: Incidencia[] = [
  {
    id: 'INC-301',
    codigo: 'INC-2026-001',
    titulo: 'Falla total de climatización y sobrecalentamiento',
    descripcion: 'El sistema de aire acondicionado del Aula Hamilton expulsó humo y saltó el breaker térmico. La temperatura superó los 34°C, poniendo en riesgo el equipamiento electrónico.',
    espacioId: 'ESP-03',
    espacioNombre: 'Aula Hamilton (Hardware & Embedded)',
    categoria: 'infraestructura',
    prioridad: 'critica',
    area: 'mantenimiento',
    estado: 'abierta',
    confianzaIA: 0.96,
    razonamientoIA: 'La presencia de humo, salto de breaker eléctrico y temperatura peligrosa clasifica el evento como riesgo crítico para la seguridad y equipos.',
    sugerenciaAccion: 'Inhabilitar inmediatamente el Aula Hamilton (RN-04). Evacuar personas y enviar cuadrilla técnica de mantenimiento eléctrico urgente.',
    origenTriaje: 'ia',
    timestamp: '2026-10-16 07:15:00'
  },
  {
    id: 'INC-302',
    codigo: 'INC-2026-002',
    titulo: 'Pérdida de paquetes en switch Gigabit piso 2',
    descripcion: 'Los cubículos Delta 1 y Delta 2 experimentan latencia superior a 800ms y microcortes frecuentes durante las videollamadas con mentores internacionales.',
    espacioId: 'ESP-04',
    espacioNombre: 'Cubículo Delta 1 (Coworking)',
    categoria: 'conectividad',
    prioridad: 'alta',
    area: 'soporte_ti',
    estado: 'en_proceso',
    confianzaIA: 0.91,
    razonamientoIA: 'Falla de red que degrada severamente actividades de evaluación y mentoría en vivo, afectando múltiples nodos.',
    sugerenciaAccion: 'Revisar transceptor SFP y reiniciar switch administrable de piso 2.',
    origenTriaje: 'ia',
    timestamp: '2026-10-16 07:30:00'
  },
  {
    id: 'INC-303',
    codigo: 'INC-2026-003',
    titulo: 'Sonda de osciloscopio en corto canal 2',
    descripcion: 'Durante la práctica de fuentes conmutadas, la sonda de prueba del osciloscopio sufrió chispazo.',
    recursoId: 'REC-107',
    recursoCodigo: 'OSC-RIG-01',
    categoria: 'equipo_tecnologico',
    prioridad: 'media',
    area: 'soporte_ti',
    estado: 'abierta',
    confianzaIA: 0.88,
    razonamientoIA: 'Equipo dañado que no representa peligro inminente para la sala pero requiere reemplazo de repuesto para volver a operar.',
    sugerenciaAccion: 'Pasar equipo a estado DAÑADO / MANTENIMIENTO y sustituir cable coaxial BNC.',
    origenTriaje: 'ia',
    timestamp: '2026-10-16 07:40:00'
  }
]

export const RESERVAS_INICIALES: Reserva[] = [
  {
    id: 'RES-01',
    espacioId: 'ESP-01',
    espacioNombre: 'Laboratorio Turing (Software & IA)',
    solicitanteNombre: 'Prof. Carlos Méndez',
    solicitanteEmail: 'carlos.mendez@campuslands.edu',
    horaInicio: '08:00',
    horaFin: '11:00',
    numPersonas: 28,
    motivo: 'Clase magistral de Arquitectura Cloud & Microservicios',
    estado: 'activa',
    creadaEn: '2026-10-16 06:30:00'
  },
  {
    id: 'RES-02',
    espacioId: 'ESP-05',
    espacioNombre: 'Cubículo Delta 2 (Entrevistas & Pitch)',
    solicitanteNombre: 'Valeria Gómez',
    solicitanteEmail: 'valeria.g@campuslands.edu',
    horaInicio: '09:00',
    horaFin: '10:30',
    numPersonas: 3,
    motivo: 'Ensayo de defensa técnica para Hackatón',
    estado: 'activa',
    creadaEn: '2026-10-16 07:00:00'
  }
]

export const PRESTAMOS_INICIALES: Prestamo[] = [
  {
    id: 'PRES-01',
    recursoId: 'REC-102',
    recursoNombre: 'Dell XPS 15 Developer Edition',
    recursoCodigo: 'LAP-XPS-04',
    solicitanteNombre: 'Camila Torres',
    solicitanteEmail: 'camila.tech@campuslands.edu',
    fechaPrestamo: '2026-10-16 07:00:00',
    fechaEstimadaDevolucion: '2026-10-16 13:00:00',
    estado: 'activo'
  },
  {
    id: 'PRES-02',
    recursoId: 'REC-106',
    recursoNombre: 'Lenovo ThinkPad P16 Workstation',
    recursoCodigo: 'LAP-THK-12',
    solicitanteNombre: 'Felipe Ruiz',
    solicitanteEmail: 'felipe.code@campuslands.edu',
    fechaPrestamo: '2026-10-16 07:20:00',
    fechaEstimadaDevolucion: '2026-10-16 12:00:00',
    estado: 'activo'
  }
]
