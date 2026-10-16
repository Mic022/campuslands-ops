"""Valores cerrados del dominio: fuente única para esquemas, prompt de IA y UI.

Ajustar a los valores reales del dataset oficial.
"""
from enum import Enum


class EstadoEspacio(str, Enum):
    disponible = "disponible"
    mantenimiento = "mantenimiento"
    inhabilitado = "inhabilitado"


class TipoEspacio(str, Enum):
    aula = "aula"
    cubiculo = "cubiculo"


class EstadoRecurso(str, Enum):
    disponible = "disponible"
    prestado = "prestado"
    mantenimiento = "mantenimiento"
    danado = "danado"
    baja = "baja"


class EstadoReserva(str, Enum):
    activa = "activa"
    cancelada = "cancelada"
    finalizada = "finalizada"


class EstadoPrestamo(str, Enum):
    activo = "activo"
    devuelto = "devuelto"


class EstadoIncidencia(str, Enum):
    abierta = "abierta"
    en_proceso = "en_proceso"
    resuelta = "resuelta"


class Categoria(str, Enum):
    infraestructura = "infraestructura"
    equipo_tecnologico = "equipo_tecnologico"
    conectividad = "conectividad"
    limpieza = "limpieza"
    seguridad = "seguridad"
    bienestar = "bienestar"
    otro = "otro"


class Prioridad(str, Enum):
    critica = "critica"
    alta = "alta"
    media = "media"
    baja = "baja"


class Area(str, Enum):
    mantenimiento = "mantenimiento"
    soporte_ti = "soporte_ti"
    bienestar = "bienestar"
    seguridad = "seguridad"
    administracion = "administracion"


class OrigenTriaje(str, Enum):
    ia = "ia"
    manual = "manual"
    pendiente = "pendiente"


# Máquina de estados de un recurso: cualquier transición fuera de aquí se rechaza (RN-03).
TRANSICIONES_RECURSO = {
    EstadoRecurso.disponible: {EstadoRecurso.prestado, EstadoRecurso.mantenimiento, EstadoRecurso.baja},
    EstadoRecurso.prestado: {EstadoRecurso.disponible, EstadoRecurso.danado},
    EstadoRecurso.danado: {EstadoRecurso.mantenimiento, EstadoRecurso.baja},
    EstadoRecurso.mantenimiento: {EstadoRecurso.disponible},
    EstadoRecurso.baja: set(),
}

# Ciclo de vida de una incidencia: una resuelta no se reabre (se reporta una nueva).
TRANSICIONES_INCIDENCIA = {
    EstadoIncidencia.abierta: {EstadoIncidencia.en_proceso, EstadoIncidencia.resuelta},
    EstadoIncidencia.en_proceso: {EstadoIncidencia.abierta, EstadoIncidencia.resuelta},
    EstadoIncidencia.resuelta: set(),
}


def valores(enum_cls) -> list[str]:
    return [e.value for e in enum_cls]


def como_dict() -> dict:
    """Catálogos serializables para el frontend (GET /api/catalogos)."""
    return {
        "estado_espacio": valores(EstadoEspacio),
        "tipo_espacio": valores(TipoEspacio),
        "estado_recurso": valores(EstadoRecurso),
        "estado_reserva": valores(EstadoReserva),
        "estado_prestamo": valores(EstadoPrestamo),
        "estado_incidencia": valores(EstadoIncidencia),
        "categoria": valores(Categoria),
        "prioridad": valores(Prioridad),
        "area": valores(Area),
    }
