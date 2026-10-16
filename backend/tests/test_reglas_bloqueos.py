"""RN-04 en reservas y préstamos: un caso válido y uno inválido por variante, más los bordes."""
from types import SimpleNamespace

import pytest

from app.config import reglas as cfg
from app.rules.bloqueos import validar_espacio_operable, validar_recurso_operable


def incidencia(prioridad, estado="abierta", id_=5):
    return SimpleNamespace(id=id_, titulo="Fuga de agua", prioridad=prioridad, estado=estado)


# ---------- Espacios ----------

def test_rn04_espacio_valido():
    assert validar_espacio_operable("Cosmos", "disponible", [incidencia("baja")]).ok


@pytest.mark.parametrize("estado", ["mantenimiento", "inhabilitado"])
def test_rn04_espacio_fuera_de_servicio(estado):
    r = validar_espacio_operable("Cosmos", estado)
    assert (r.ok, r.codigo) == (False, "RN-04")


@pytest.mark.parametrize("prioridad", ["critica", "alta"])
def test_rn04_espacio_con_incidencia_bloqueante(prioridad):
    r = validar_espacio_operable("Cosmos", "disponible", [incidencia(prioridad)])
    assert (r.ok, r.codigo) == (False, "RN-04")
    assert "#5" in r.mensaje


def test_rn04_incidencia_resuelta_no_bloquea():
    assert validar_espacio_operable("Cosmos", "disponible", [incidencia("critica", "resuelta")]).ok


def test_rn04_incidencia_en_proceso_si_bloquea():
    assert not validar_espacio_operable("Cosmos", "disponible", [incidencia("alta", "en_proceso")]).ok


def test_rn04_incidencia_sin_triaje_no_bloquea():
    assert validar_espacio_operable("Cosmos", "disponible", [incidencia(None)]).ok


def test_rn04_lee_prioridades_en_vivo(monkeypatch):
    monkeypatch.setattr(cfg, "PRIORIDADES_BLOQUEANTES", {"critica"})
    assert validar_espacio_operable("Cosmos", "disponible", [incidencia("alta")]).ok
    assert not validar_espacio_operable("Cosmos", "disponible", [incidencia("critica")]).ok


# ---------- Recursos ----------

def test_rn04_recurso_valido():
    assert validar_recurso_operable("PC-01", "disponible", []).ok


@pytest.mark.parametrize("estado", ["mantenimiento", "danado", "baja"])
def test_rn04_recurso_fuera_de_servicio(estado):
    assert validar_recurso_operable("PC-01", estado).codigo == "RN-04"


def test_rn04_recurso_con_incidencia_bloqueante():
    assert validar_recurso_operable("PC-01", "disponible", [incidencia("critica")]).codigo == "RN-04"
