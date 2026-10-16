"""Reglas puras de recursos: un caso válido y uno inválido por regla, más los bordes."""
from datetime import datetime

import pytest

from app.config import reglas as cfg
from app.config.catalogos import TRANSICIONES_RECURSO, EstadoRecurso
from app.rules.recursos import (
    validar_devolucion,
    validar_fechas_prestamo,
    validar_limite_prestamos,
    validar_transicion,
)

SALIDA = datetime(2030, 3, 4, 8)
DESPUES = datetime(2030, 3, 4, 12)


# ---------- RN-03: máquina de estados ----------

def test_rn03_valido():
    assert validar_transicion("disponible", "prestado").ok


def test_rn03_invalido():
    r = validar_transicion("mantenimiento", "prestado")
    assert (r.ok, r.codigo) == (False, "RN-03")
    assert "disponible" in r.mensaje  # indica a qué sí puede pasar


def test_rn03_baja_es_estado_final():
    r = validar_transicion("baja", "disponible")
    assert not r.ok and "final" in r.mensaje


def test_rn03_estado_desconocido():
    assert validar_transicion("disponible", "perdido").codigo == "RN-03"


@pytest.mark.parametrize("origen", list(EstadoRecurso))
@pytest.mark.parametrize("destino", list(EstadoRecurso))
def test_rn03_coincide_con_la_tabla_de_transiciones(origen, destino):
    esperado = destino in TRANSICIONES_RECURSO[origen]
    assert validar_transicion(origen.value, destino.value).ok is esperado


# ---------- RN-06: límite de préstamos ----------

def test_rn06_valido_por_debajo_del_limite():
    assert validar_limite_prestamos(cfg.MAX_PRESTAMOS_ACTIVOS - 1).ok


def test_rn06_invalido_en_el_limite():
    r = validar_limite_prestamos(cfg.MAX_PRESTAMOS_ACTIVOS)
    assert (r.ok, r.codigo) == (False, "RN-06")


def test_rn06_lee_el_limite_en_vivo(monkeypatch):
    monkeypatch.setattr(cfg, "MAX_PRESTAMOS_ACTIVOS", 3)
    assert validar_limite_prestamos(2).ok


def test_rn06_fechas_de_prestamo():
    assert validar_fechas_prestamo(SALIDA, DESPUES).ok
    assert validar_fechas_prestamo(DESPUES, SALIDA).codigo == "RN-06"


# ---------- RN-07: devolución válida ----------

def test_rn07_valido():
    assert validar_devolucion("activo", SALIDA, DESPUES, "prestado", "disponible").ok


def test_rn07_valido_devuelto_danado():
    assert validar_devolucion("activo", SALIDA, DESPUES, "prestado", "danado").ok


@pytest.mark.parametrize(
    "estado_prestamo,fecha,actual,final,motivo",
    [
        ("devuelto", DESPUES, "prestado", "disponible", "ya fue devuelto"),
        ("activo", datetime(2030, 3, 4, 7), "prestado", "disponible", "anterior a la salida"),
        ("activo", DESPUES, "disponible", "disponible", "no como prestado"),
        ("activo", DESPUES, "prestado", "baja", "inválido"),
    ],
)
def test_rn07_invalidos(estado_prestamo, fecha, actual, final, motivo):
    r = validar_devolucion(estado_prestamo, SALIDA, fecha, actual, final)
    assert (r.ok, r.codigo) == (False, "RN-07")
    assert motivo in r.mensaje
