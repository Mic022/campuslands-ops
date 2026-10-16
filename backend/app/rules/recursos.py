"""Reglas de recursos: RN-03 (máquina de estados), RN-06 (límite de préstamos) y RN-07 (devolución válida).

Funciones puras: no tocan la BD. Los parámetros se leen de config/ en cada llamada.
"""
from datetime import datetime

from app.config import reglas as cfg
from app.config.catalogos import TRANSICIONES_RECURSO, EstadoPrestamo, EstadoRecurso
from app.rules.base import OK, ResultadoRegla


def _estado(valor) -> EstadoRecurso | None:
    try:
        return EstadoRecurso(valor)
    except ValueError:
        return None


def validar_transicion(actual: str, nuevo: str) -> ResultadoRegla:
    """RN-03: solo se permiten las transiciones de TRANSICIONES_RECURSO."""
    origen, destino = _estado(actual), _estado(nuevo)
    if origen is None or destino is None:
        return ResultadoRegla(False, "RN-03", f"Estado de recurso desconocido: '{nuevo if origen else actual}'.")
    if destino not in TRANSICIONES_RECURSO[origen]:
        permitidos = ", ".join(sorted(e.value for e in TRANSICIONES_RECURSO[origen])) or "ninguno (estado final)"
        return ResultadoRegla(
            False, "RN-03",
            f"Un recurso en '{origen.value}' no puede pasar a '{destino.value}'. Permitidos: {permitidos}.",
        )
    return OK


def validar_limite_prestamos(prestamos_activos: int) -> ResultadoRegla:
    """RN-06: un solicitante no supera el máximo de préstamos activos simultáneos."""
    if prestamos_activos >= cfg.MAX_PRESTAMOS_ACTIVOS:
        return ResultadoRegla(
            False, "RN-06",
            f"El solicitante ya tiene {prestamos_activos} préstamo(s) activo(s); "
            f"el máximo es {cfg.MAX_PRESTAMOS_ACTIVOS}.",
        )
    return OK


def validar_fechas_prestamo(salida: datetime, devolucion_esperada: datetime) -> ResultadoRegla:
    """RN-06 (complemento): la devolución esperada es posterior a la salida."""
    if devolucion_esperada <= salida:
        return ResultadoRegla(False, "RN-06", "La devolución esperada debe ser posterior a la salida.")
    return OK


def validar_devolucion(
    estado_prestamo: str,
    salida: datetime,
    fecha_devolucion: datetime,
    estado_recurso_actual: str,
    estado_recurso_final: str,
) -> ResultadoRegla:
    """RN-07: solo se devuelve un préstamo activo, en una fecha coherente y a un estado válido del recurso."""
    if estado_prestamo != EstadoPrestamo.activo.value:
        return ResultadoRegla(False, "RN-07", "Este préstamo ya fue devuelto.")
    if fecha_devolucion < salida:
        return ResultadoRegla(False, "RN-07", "La fecha de devolución no puede ser anterior a la salida.")
    if estado_recurso_actual != EstadoRecurso.prestado.value:
        return ResultadoRegla(
            False, "RN-07",
            f"El recurso figura como '{estado_recurso_actual}', no como prestado; revisa el inventario.",
        )
    transicion = validar_transicion(estado_recurso_actual, estado_recurso_final)
    if not transicion.ok:
        return ResultadoRegla(False, "RN-07", f"Estado de devolución inválido. {transicion.mensaje}")
    return OK
