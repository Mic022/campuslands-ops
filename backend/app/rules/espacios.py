"""Reglas de reservas de espacios: RN-01 (sin solapamiento), RN-02 (aforo) y RN-05 (horario y duración).

Funciones puras: no tocan la BD. Los parámetros se leen de config/reglas.py en
cada llamada (cfg.X), así un cambio en la modificación en vivo aplica de inmediato.
"""
import math
from collections.abc import Iterable
from datetime import datetime, timedelta

from app.config import reglas as cfg
from app.rules.base import OK, ResultadoRegla


def validar_horario(inicio: datetime, fin: datetime, ahora: datetime | None = None) -> ResultadoRegla:
    """RN-05: la reserva cabe en el horario del campus, dura lo permitido y no está en el pasado."""
    if fin <= inicio:
        return ResultadoRegla(False, "RN-05", "La hora de fin debe ser posterior a la de inicio.")
    if ahora is not None and inicio < ahora:
        return ResultadoRegla(False, "RN-05", "No se puede reservar en una fecha u hora que ya pasó.")
    if inicio.date() != fin.date():
        return ResultadoRegla(False, "RN-05", "La reserva debe empezar y terminar el mismo día.")

    apertura = inicio.replace(hour=cfg.HORA_APERTURA, minute=0, second=0, microsecond=0)
    cierre = inicio.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(hours=cfg.HORA_CIERRE)
    if inicio < apertura or fin > cierre:
        return ResultadoRegla(
            False, "RN-05",
            f"El campus atiende de {cfg.HORA_APERTURA}:00 a {cfg.HORA_CIERRE}:00; la reserva queda por fuera.",
        )

    if fin - inicio > timedelta(hours=cfg.MAX_HORAS_RESERVA):
        return ResultadoRegla(False, "RN-05", f"Una reserva dura como máximo {cfg.MAX_HORAS_RESERVA} horas.")
    return OK


def aforo_permitido(aforo: int) -> int:
    """Personas que admite un espacio según el factor de aforo vigente."""
    return math.floor(aforo * cfg.FACTOR_AFORO)


def validar_aforo(asistentes: int, aforo: int) -> ResultadoRegla:
    """RN-02: los asistentes no superan el aforo permitido del espacio."""
    if asistentes < 1:
        return ResultadoRegla(False, "RN-02", "La reserva debe tener al menos un asistente.")
    maximo = aforo_permitido(aforo)
    if asistentes > maximo:
        return ResultadoRegla(
            False, "RN-02",
            f"El espacio admite {maximo} personas y la reserva pide {asistentes}.",
        )
    return OK


def se_solapan(inicio_a: datetime, fin_a: datetime, inicio_b: datetime, fin_b: datetime) -> bool:
    """Intervalos semiabiertos [inicio, fin): una reserva puede empezar justo cuando termina otra."""
    return inicio_a < fin_b and inicio_b < fin_a


def validar_sin_solapamiento(inicio: datetime, fin: datetime, reservas_activas: Iterable) -> ResultadoRegla:
    """RN-01: no hay otra reserva activa del mismo espacio que se cruce con [inicio, fin).

    `reservas_activas` son objetos con `inicio` y `fin` (y opcionalmente `id`).
    """
    for r in reservas_activas:
        if se_solapan(inicio, fin, r.inicio, r.fin):
            ref = f" #{r.id}" if getattr(r, "id", None) is not None else ""
            return ResultadoRegla(
                False, "RN-01",
                f"El espacio ya está reservado de {r.inicio:%H:%M} a {r.fin:%H:%M} "
                f"(reserva{ref} del {r.inicio:%Y-%m-%d}).",
            )
    return OK
