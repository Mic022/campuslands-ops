"""Reglas de reserva de salas: funciones puras, sin acceso a la base de datos."""
from datetime import date, datetime, time

from app.config import reglas as cfg
from app.config.catalogos import EstadoEspacio
from app.rules.base import OK, ResultadoRegla


def _minutos(t: time) -> int:
    return t.hour * 60 + t.minute


def validar_horario(fecha: date, inicio: time, fin: time, ahora: datetime) -> ResultadoRegla:
    if _minutos(fin) <= _minutos(inicio):
        return ResultadoRegla(False, "RES-01", "La hora de finalización debe ser posterior a la de inicio.")
    if inicio.hour < cfg.HORA_APERTURA or _minutos(fin) > cfg.HORA_CIERRE * 60:
        return ResultadoRegla(
            False, "RES-02",
            f"Las salas solo se reservan entre las {cfg.HORA_APERTURA:02d}:00 y las {cfg.HORA_CIERRE:02d}:00.",
        )
    if _minutos(fin) - _minutos(inicio) > cfg.MAX_HORAS_RESERVA * 60:
        return ResultadoRegla(False, "RES-03", f"Una reserva no puede durar más de {cfg.MAX_HORAS_RESERVA} horas.")
    if datetime.combine(fecha, inicio) < ahora.replace(second=0, microsecond=0):
        return ResultadoRegla(False, "RES-04", "No se puede reservar en una fecha u hora que ya pasó.")
    return OK


def validar_aforo(asistentes: int, capacidad: int) -> ResultadoRegla:
    maximo = int(capacidad * cfg.FACTOR_AFORO)
    if asistentes < 1:
        return ResultadoRegla(False, "RES-05", "Debe haber al menos un asistente.")
    if asistentes > maximo:
        return ResultadoRegla(
            False, "RES-05", f"La sala admite como máximo {maximo} personas y se solicitaron {asistentes}."
        )
    return OK


def validar_sala_operativa(estado: EstadoEspacio, nombre: str) -> ResultadoRegla:
    if estado != EstadoEspacio.disponible:
        return ResultadoRegla(False, "RES-07", f"{nombre} está bloqueada por mantenimiento y no admite reservas.")
    return OK


def se_solapan(a_inicio: time, a_fin: time, b_inicio: time, b_fin: time) -> bool:
    return _minutos(a_inicio) < _minutos(b_fin) and _minutos(b_inicio) < _minutos(a_fin)


def validar_sin_solape(inicio: time, fin: time, ocupados: list[tuple[time, time]]) -> ResultadoRegla:
    for o_inicio, o_fin in ocupados:
        if se_solapan(inicio, fin, o_inicio, o_fin):
            return ResultadoRegla(
                False, "RES-06",
                f"El horario se cruza con una reserva confirmada de {o_inicio:%H:%M} a {o_fin:%H:%M}.",
            )
    return OK
