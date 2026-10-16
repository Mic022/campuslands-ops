"""RN-04 aplicada a reservas y préstamos: bloqueo por estado o por incidencia abierta.

No se reserva un espacio ni se presta un recurso que esté fuera de servicio o que
tenga una incidencia abierta de prioridad bloqueante (cfg.PRIORIDADES_BLOQUEANTES).

Funciones puras: reciben el estado y las incidencias ya consultadas.
"""
from collections.abc import Iterable

from app.config import reglas as cfg
from app.config.catalogos import EstadoEspacio, EstadoIncidencia, EstadoRecurso
from app.rules.base import OK, ResultadoRegla

# 'prestado' no está aquí: un recurso ya prestado lo rechaza RN-03.
ESTADOS_RECURSO_BLOQUEADOS = {EstadoRecurso.mantenimiento.value, EstadoRecurso.danado.value, EstadoRecurso.baja.value}


def incidencia_bloqueante(incidencias: Iterable):
    """Primera incidencia sin resolver con prioridad bloqueante, o None.

    Una incidencia aún sin triaje (prioridad None) no bloquea: no se sabe si es grave.
    """
    for inc in incidencias:
        if inc.estado != EstadoIncidencia.resuelta.value and inc.prioridad in cfg.PRIORIDADES_BLOQUEANTES:
            return inc
    return None


def _por_incidencia(que: str, incidencias: Iterable) -> ResultadoRegla:
    inc = incidencia_bloqueante(incidencias)
    if inc is not None:
        return ResultadoRegla(
            False, "RN-04",
            f"{que} tiene la incidencia #{inc.id} de prioridad {inc.prioridad} sin resolver ('{inc.titulo}').",
        )
    return OK


def validar_espacio_operable(nombre: str, estado: str, incidencias: Iterable = ()) -> ResultadoRegla:
    """RN-04: el espacio está disponible y sin incidencias bloqueantes abiertas."""
    if estado != EstadoEspacio.disponible.value:
        return ResultadoRegla(False, "RN-04", f"El espacio '{nombre}' está en '{estado}' y no admite reservas.")
    return _por_incidencia(f"El espacio '{nombre}'", incidencias)


def validar_recurso_operable(nombre: str, estado: str, incidencias: Iterable = ()) -> ResultadoRegla:
    """RN-04: el recurso no está fuera de servicio y no tiene incidencias bloqueantes abiertas."""
    if estado in ESTADOS_RECURSO_BLOQUEADOS:
        return ResultadoRegla(False, "RN-04", f"El recurso '{nombre}' está en '{estado}' y no se puede prestar.")
    return _por_incidencia(f"El recurso '{nombre}'", incidencias)
