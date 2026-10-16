"""Reglas puras de espacios: un caso válido y uno inválido por regla, más los bordes."""
from datetime import datetime
from types import SimpleNamespace

import pytest

from app.config import reglas as cfg
from app.rules.espacios import validar_aforo, validar_horario, validar_sin_solapamiento

DIA = datetime(2030, 3, 4)


def h(hora: int, minuto: int = 0) -> datetime:
    return DIA.replace(hour=hora, minute=minuto)


def reserva(inicio: datetime, fin: datetime, id_: int = 1):
    return SimpleNamespace(id=id_, inicio=inicio, fin=fin)


# ---------- RN-01: sin solapamiento ----------

def test_rn01_valido_sin_cruce():
    assert validar_sin_solapamiento(h(10), h(12), [reserva(h(8), h(10))]).ok


def test_rn01_invalido_con_cruce():
    r = validar_sin_solapamiento(h(9), h(11), [reserva(h(8), h(10), 7)])
    assert (r.ok, r.codigo) == (False, "RN-01")
    assert "#7" in r.mensaje


@pytest.mark.parametrize("inicio,fin", [(h(9), h(10)), (h(7), h(12)), (h(8, 30), h(9, 30))])
def test_rn01_cruces_parciales_y_contenidos(inicio, fin):
    assert not validar_sin_solapamiento(inicio, fin, [reserva(h(8), h(11))]).ok


# ---------- RN-02: aforo ----------

def test_rn02_valido_en_el_limite():
    assert validar_aforo(30, 30).ok


def test_rn02_invalido_supera_aforo():
    r = validar_aforo(31, 30)
    assert (r.ok, r.codigo) == (False, "RN-02")


def test_rn02_invalido_sin_asistentes():
    assert validar_aforo(0, 30).codigo == "RN-02"


def test_rn02_respeta_factor_de_aforo(monkeypatch):
    monkeypatch.setattr(cfg, "FACTOR_AFORO", 0.5)
    assert validar_aforo(15, 30).ok
    assert not validar_aforo(16, 30).ok


# ---------- RN-05: horario y duración ----------

def test_rn05_valido():
    assert validar_horario(h(8), h(10), ahora=h(7)).ok


def test_rn05_valido_hasta_el_cierre():
    assert validar_horario(h(cfg.HORA_CIERRE - 2), h(cfg.HORA_CIERRE)).ok


@pytest.mark.parametrize(
    "inicio,fin,motivo",
    [
        (h(10), h(10), "posterior"),
        (h(10), h(9), "posterior"),
        (h(5), h(7), "atiende"),
        (h(21), h(23), "atiende"),
        (h(8), h(13), "máximo"),
        (h(20), datetime(2030, 3, 5, 1), "mismo día"),
    ],
)
def test_rn05_invalidos(inicio, fin, motivo):
    r = validar_horario(inicio, fin)
    assert (r.ok, r.codigo) == (False, "RN-05")
    assert motivo in r.mensaje


def test_rn05_invalido_en_el_pasado():
    assert validar_horario(h(8), h(9), ahora=h(12)).codigo == "RN-05"


def test_rn05_lee_parametros_en_vivo(monkeypatch):
    monkeypatch.setattr(cfg, "MAX_HORAS_RESERVA", 2)
    assert not validar_horario(h(8), h(11)).ok
    monkeypatch.setattr(cfg, "HORA_CIERRE", 23)
    assert validar_horario(h(21), h(23)).ok
