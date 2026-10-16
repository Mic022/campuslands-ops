from datetime import datetime

import pytest

from app.config.catalogos import EstadoRecurso
from app.ingest import lector
from app.ingest.normalizar import ValorInvalido, a_entero_positivo, a_enum, a_fecha, clave
from app.ingest.reporte import ReporteCarga


# ---------- Enums ----------

@pytest.mark.parametrize("entrada", ["Dañado", "DANADO", " dañado ", "dañado"])
def test_estado_con_variantes_se_normaliza(entrada):
    assert a_enum(entrada, EstadoRecurso, "estado") == EstadoRecurso.danado


def test_estado_desconocido_va_a_cuarentena():
    with pytest.raises(ValorInvalido, match="estado"):
        a_enum("roto", EstadoRecurso, "estado")


def test_sinonimos_del_dataset():
    assert a_enum("En reparación", EstadoRecurso, "estado", {"en_reparacion": "mantenimiento"}) == EstadoRecurso.mantenimiento


def test_clave_con_espacios_y_guiones():
    assert clave("En Proceso") == "en_proceso"
    assert clave("en-proceso") == "en_proceso"


# ---------- Enteros ----------

@pytest.mark.parametrize("entrada,esperado", [(" 20 ", 20), ("20", 20), (20, 20), (20.0, 20), ("20.0", 20)])
def test_aforo_valido(entrada, esperado):
    assert a_entero_positivo(entrada, "aforo") == esperado


@pytest.mark.parametrize("entrada", ["veinte", "-5", "0", 0, "", None, "20.5", 20.5, True])
def test_aforo_invalido(entrada):
    with pytest.raises(ValorInvalido):
        a_entero_positivo(entrada, "aforo")


# ---------- Fechas ----------

@pytest.mark.parametrize(
    "entrada",
    ["2026-10-16 14:00", "2026-10-16T14:00:00", "16/10/2026 14:00", "16/10/2026 2pm", "16/10/2026 2:00 p.m.", "2026-10-16T19:00:00Z"],
)
def test_formatos_de_fecha_mixtos(entrada):
    assert a_fecha(entrada, "inicio") == datetime(2026, 10, 16, 14, 0)


@pytest.mark.parametrize("entrada", ["31/02/2026", "mañana", "2026-13-01"])
def test_fecha_invalida(entrada):
    with pytest.raises(ValorInvalido):
        a_fecha(entrada, "inicio")


def test_fecha_opcional_vacia():
    assert a_fecha("", "devolucion", obligatorio=False) is None


# ---------- Lector ----------

def test_lee_csv_latin1_con_punto_y_coma(tmp_path):
    ruta = tmp_path / "espacios.csv"
    ruta.write_bytes("id;nombre;aforo\nA-101;Salón 1;20\n".encode("latin-1"))
    filas, meta = lector.leer_archivo(ruta)
    assert filas == [{"id": "A-101", "nombre": "Salón 1", "aforo": "20"}]
    assert meta["codificacion"] == "latin-1"


def test_repara_mojibake(tmp_path):
    ruta = tmp_path / "espacios.csv"
    ruta.write_text("id,nombre\nA-101,SalÃ³n 1\n", encoding="utf-8")
    filas, meta = lector.leer_archivo(ruta)
    assert filas[0]["nombre"] == "Salón 1"
    assert meta["mojibake_reparado"]


# ---------- Reporte ----------

def test_reporte_resume_y_guarda(tmp_path):
    reporte = ReporteCarga()
    e = reporte.entidad("espacios")
    e.leidos, e.cargados = 3, 2
    e.rechazar(3, "A-101", "id: duplicado", {"id": "A-101"})
    ruta = reporte.guardar(tmp_path)
    assert ruta.exists()
    assert reporte.a_dict()["resumen"][0]["en_cuarentena"] == 1
