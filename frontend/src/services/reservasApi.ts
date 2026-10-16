/**
 * Cliente del módulo Torre Zenith · Nivel 6, sobre la API real del equipo.
 *
 * Conserva la interfaz que usan los componentes del plano 3D, pero todo sale del backend:
 *  - salas, aforo y estado        → GET /api/espacios
 *  - reservas del día y agenda    → GET /api/reservas
 *  - bloqueos por incidencias     → GET /api/incidencias + /api/reglas (prioridades bloqueantes)
 *  - equipamiento de cada sala    → GET /api/recursos (recursos fijos en esa sala)
 *  - reservar / cancelar          → POST /api/reservas, POST /api/reservas/{id}/cancelar
 *  - mantenimiento (solo admin)   → PATCH /api/espacios/{id}
 * Las reglas (RN-01, 02, 04, 05) las decide el backend; aquí solo se muestra su {codigo, mensaje}.
 */
import { ApiError, get, patch, post } from './api/baseClient'
import type { EspacioApi } from './api/espaciosApi'
import type { IncidenciaApi } from './api/incidenciasApi'
import type { RecursoApi } from './api/recursosApi'
import type { ReservaApi } from './api/reservasApi'
import { ENDPOINTS } from './endpoints'
import { esAdmin, leerSesion, mismaPersona, nombreSesion } from './sesion'
import { SALAS_GEOMETRIA } from '../data/torreZenithNivel6'
import type {
  Nivel6Estado,
  NuevaReserva,
  Ocupacion,
  ReglasReserva,
  ReservaPrivada,
  ReservaPublica,
  SalaEstado,
  SalaId,
  SalaInfo
} from '../types/torreZenith'

/** Mismo error que el resto del frontend: {status, codigo, mensaje, detalles}. */
export { ApiError as ReservaApiError }

type ReglasApi = ReglasReserva & { prioridades_bloqueantes: string[] }

const SALAS_PLANO = new Set<string>(SALAS_GEOMETRIA.map(g => g.id))
const geometria = (id: string) => SALAS_GEOMETRIA.find(g => g.id === id)

const dosDigitos = (n: number) => String(n).padStart(2, '0')
const hoyLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`
}
const horaLocal = () => {
  const d = new Date()
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`
}

/** Reserva del backend (inicio/fin ISO) → forma del plano (fecha + horas). */
const aReservaZ = (r: ReservaApi): ReservaPrivada => ({
  id: r.id,
  sala_id: r.espacio_id as SalaId,
  fecha: r.inicio.slice(0, 10),
  hora_inicio: r.inicio.slice(11, 16),
  hora_fin: r.fin.slice(11, 16),
  asistentes: r.asistentes,
  estado: r.estado,
  solicitante: r.solicitante,
  motivo: '',
  creada_en: r.creada_en,
  cancelada_en: null
})

const aSalaInfo = (e: EspacioApi, recursos: RecursoApi[], motivoBloqueo: string | null): SalaInfo => ({
  id: e.id as SalaId,
  nombre: e.nombre,
  tipo: e.tipo,
  descripcion: `${e.tipo === 'aula' ? 'Aula' : 'Cubículo'} · aforo oficial ${e.aforo} personas`,
  capacidad: e.aforo,
  aforo_maximo: e.aforo_permitido ?? e.aforo,
  equipamiento: recursos.filter(r => r.espacio_id === e.id).map(r => r.nombre || r.tipo),
  color: geometria(e.id)?.color ?? '#94A3B8',
  estado: e.estado,
  motivo_bloqueo: motivoBloqueo
})

export const reservasApi = {
  /** Estado del nivel en un instante (por defecto, ahora): ocupación, reserva actual y próxima de cada sala. */
  async getNivel6(consulta?: { fecha: string; hora: string }): Promise<Nivel6Estado> {
    const fecha = consulta?.fecha ?? hoyLocal()
    const hora = consulta?.hora ?? horaLocal()
    const [espacios, reservas, incidencias, recursos, reglas] = await Promise.all([
      get<EspacioApi[]>(ENDPOINTS.ESPACIOS.LISTAR),
      get<ReservaApi[]>(`${ENDPOINTS.RESERVAS.LISTAR}?fecha=${fecha}&estado=activa`),
      get<IncidenciaApi[]>(ENDPOINTS.INCIDENCIAS.LISTAR),
      get<RecursoApi[]>(ENDPOINTS.RECURSOS.LISTAR),
      get<ReglasApi>(ENDPOINTS.REGLAS)
    ])

    const salas: SalaEstado[] = espacios
      .filter(e => SALAS_PLANO.has(e.id))
      .map(e => {
        const bloqueante = incidencias.find(
          i =>
            i.estado !== 'resuelta' &&
            i.espacio_id === e.id &&
            i.prioridad !== null &&
            reglas.prioridades_bloqueantes.includes(i.prioridad)
        )
        const motivo = bloqueante
          ? `Incidencia INC-${bloqueante.id} (${bloqueante.prioridad}) sin resolver: ${bloqueante.titulo}`
          : e.estado !== 'disponible'
            ? `Espacio en estado "${e.estado}"`
            : null
        const del_dia = reservas
          .filter(r => r.espacio_id === e.id)
          .map(aReservaZ)
          .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
        const actual = del_dia.find(r => r.hora_inicio <= hora && hora < r.hora_fin) ?? null
        const proxima = del_dia.find(r => r.hora_inicio > hora) ?? null
        const ocupacion: Ocupacion = motivo ? 'mantenimiento' : actual ? 'reservada' : 'disponible'
        return {
          ...aSalaInfo(e, recursos, motivo),
          ocupacion,
          reserva_actual: actual,
          proxima_reserva: proxima,
          reservas_dia: del_dia
        }
      })

    return {
      torre: 'Torre Zenith',
      nivel: 6,
      area_m2: 0,
      consulta: { fecha, hora },
      resumen: {
        total: salas.length,
        disponibles: salas.filter(s => s.ocupacion === 'disponible').length,
        reservadas: salas.filter(s => s.ocupacion === 'reservada').length,
        mantenimiento: salas.filter(s => s.ocupacion === 'mantenimiento').length
      },
      salas
    }
  },

  getReglas() {
    return get<ReglasReserva>(ENDPOINTS.REGLAS)
  },

  /** Reservas de una sala, opcionalmente entre dos fechas (YYYY-MM-DD, inclusive). */
  async getReservasSala(salaId: SalaId, desde?: string, hasta?: string): Promise<ReservaPrivada[]> {
    const todas = (await get<ReservaApi[]>(`${ENDPOINTS.RESERVAS.LISTAR}?espacio_id=${salaId}`)).map(aReservaZ)
    return todas
      .filter(r => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta))
      .sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio))
  },

  /** El backend valida RN-01 (solapes), RN-02 (aforo), RN-04 (bloqueos) y RN-05 (horario). */
  async crearReserva(datos: NuevaReserva) {
    const r = await post<ReservaApi>(ENDPOINTS.RESERVAS.CREAR, {
      espacio_id: datos.sala_id,
      solicitante: datos.solicitante,
      inicio: `${datos.fecha}T${datos.hora_inicio}`,
      fin: `${datos.fecha}T${datos.hora_fin}`,
      asistentes: datos.asistentes
    })
    const reserva = aReservaZ(r)
    return { reserva, sala_nombre: geometria(r.espacio_id)?.nombre ?? r.espacio_id }
  },

  /** Reservas a nombre del usuario de la sesión. */
  async misReservas(): Promise<ReservaPrivada[]> {
    const nombre = nombreSesion()
    return (await get<ReservaApi[]>(ENDPOINTS.RESERVAS.LISTAR))
      .filter(r => mismaPersona(r.solicitante, nombre))
      .map(aReservaZ)
  },

  async todasLasReservas(): Promise<ReservaPrivada[]> {
    return (await get<ReservaApi[]>(ENDPOINTS.RESERVAS.LISTAR)).map(aReservaZ)
  },

  async cancelarReserva(id: number): Promise<ReservaPrivada> {
    return aReservaZ(await post<ReservaApi>(ENDPOINTS.RESERVAS.CANCELAR(id)))
  },

  /** Solo admin (el backend responde 403 a un usuario). */
  async cambiarMantenimiento(salaId: SalaId, activo: boolean, motivo?: string): Promise<SalaInfo> {
    const e = await patch<EspacioApi>(ENDPOINTS.ESPACIOS.ACTUALIZAR(salaId), {
      estado: activo ? 'mantenimiento' : 'disponible'
    })
    return aSalaInfo(e, [], activo ? motivo || 'Mantenimiento programado' : null)
  },

  /** El modo operador ya no usa un token aparte: lo da iniciar sesión como administrador. */
  async verificarAdmin(_token?: string): Promise<{ admin: boolean }> {
    if (esAdmin()) return { admin: true }
    throw new ApiError(403, 'AUTH-403', 'Inicia sesión como administrador para usar el modo operador.')
  }
}

/** Compatibilidad con los componentes: el "token de operador" es la sesión de un admin. */
export const tokenAdmin = {
  leer: () => (esAdmin() ? leerSesion()?.token ?? null : null),
  guardar: (_token: string | null) => undefined
}

/** La reserva es del usuario de la sesión (puede cancelarla). */
export const esPropia = (r: ReservaPublica | ReservaPrivada) =>
  'solicitante' in r && mismaPersona(r.solicitante, nombreSesion())
