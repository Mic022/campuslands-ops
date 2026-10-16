"""Carga de recursos y préstamos con el pipeline completo, incluida la reconciliación R1–R4."""
import pytest
from sqlmodel import Session, SQLModel, create_engine, select

import app.models  # noqa: F401
from app.ingest import pipeline
from app.models import Auditoria, Prestamo, Recurso

ESPACIOS = "nombre,capacidad\nCosmos,25\nAzul,10\n"


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def correr(db, tmp_path, recursos=None, prestamos=None):
    (tmp_path / "capacidad_instalada.csv").write_text(ESPACIOS, encoding="utf-8")
    if recursos is not None:
        (tmp_path / "recursos.csv").write_text(recursos, encoding="utf-8")
    if prestamos is not None:
        (tmp_path / "prestamos.csv").write_text(prestamos, encoding="utf-8")
    return pipeline.ejecutar(db, tmp_path)


def motivos(reporte, entidad):
    return [r.motivo for r in reporte.entidad(entidad).cuarentena]


# ---------- Archivos opcionales ----------

def test_sin_archivos_de_recursos_ni_prestamos_se_reporta_no_entregado(db, tmp_path):
    reporte = correr(db, tmp_path)
    avisos = {a["entidad"]: a.get("aviso") for a in reporte.archivos}
    assert avisos["recursos"] == "no entregado" and avisos["prestamos"] == "no entregado"
    assert reporte.entidad("espacios").cargados == 2


# ---------- Recursos ----------

def test_recursos_validos_con_espacio_y_estado_normalizado(db, tmp_path):
    correr(db, tmp_path, recursos=(
        "codigo,tipo,nombre,estado,sala\n"
        "VB-01,videobeam,Epson,En reparación,Cosmos\n"
        "PC-01,portatil,Lenovo,DISPONIBLE,\n"
    ))
    vb = db.get(Recurso, "VB-01")
    assert (vb.estado, vb.espacio_id) == ("mantenimiento", "cosmos")
    assert db.get(Recurso, "PC-01").espacio_id is None


@pytest.mark.parametrize("fila,motivo", [
    ("PC-02,portatil,X,disponible,Marte", "espacio"),
    ("PC-02,portatil,X,explotado,", "estado"),
    (",portatil,X,disponible,", "id"),
    ("PC-02,,X,disponible,", "tipo"),
])
def test_recurso_invalido_va_a_cuarentena(db, tmp_path, fila, motivo):
    reporte = correr(db, tmp_path, recursos=f"codigo,tipo,nombre,estado,sala\n{fila}\n")
    assert reporte.entidad("recursos").cargados == 0
    assert motivos(reporte, "recursos")[0].startswith(motivo)


def test_recurso_duplicado_conserva_el_primero(db, tmp_path):
    reporte = correr(db, tmp_path, recursos="codigo,tipo\nPC-01,portatil\npc-01,tablet\n")
    assert db.get(Recurso, "PC-01").tipo == "portatil"
    assert "duplicado" in motivos(reporte, "recursos")[0]


# ---------- Préstamos ----------

RECURSOS = (
    "codigo,tipo,estado\n"
    "PC-01,portatil,disponible\n"
    "PC-02,portatil,prestado\n"
    "PC-03,portatil,mantenimiento\n"
    "PC-04,portatil,prestado\n"
)


def test_r1_prestamo_activo_sobre_recurso_disponible_lo_pasa_a_prestado(db, tmp_path):
    reporte = correr(db, tmp_path, RECURSOS, (
        "recurso,solicitante,salida,devolucion_esperada\n"
        "PC-01,Ana,2026-10-16 08:00,2026-10-16 12:00\n"
    ))
    assert db.get(Recurso, "PC-01").estado == "prestado"
    assert any("R1" in c.descripcion for c in reporte.entidad("recursos").correcciones)
    auditoria = db.exec(select(Auditoria).where(Auditoria.entidad_id == "PC-01", Auditoria.accion == "reconciliar")).all()
    assert len(auditoria) == 1


def test_r2_prestamo_activo_sobre_recurso_en_mantenimiento_va_a_cuarentena(db, tmp_path):
    reporte = correr(db, tmp_path, RECURSOS, (
        "recurso,solicitante,salida,devolucion_esperada\n"
        "PC-03,Ana,2026-10-16 08:00,2026-10-16 12:00\n"
    ))
    assert "mantenimiento" in motivos(reporte, "prestamos")[0]
    assert db.get(Recurso, "PC-03").estado == "mantenimiento"


def test_r3_dos_prestamos_activos_conserva_el_mas_antiguo(db, tmp_path):
    reporte = correr(db, tmp_path, RECURSOS, (
        "recurso,solicitante,salida,devolucion_esperada\n"
        "PC-02,Beto,2026-10-16 10:00,2026-10-16 12:00\n"
        "PC-02,Ana,2026-10-16 08:00,2026-10-16 12:00\n"
    ))
    activos = db.exec(select(Prestamo).where(Prestamo.recurso_id == "PC-02")).all()
    assert [p.solicitante for p in activos] == ["Ana"]
    assert "más antiguo" in motivos(reporte, "prestamos")[0]


def test_r4_recurso_prestado_sin_prestamo_activo_vuelve_a_disponible(db, tmp_path):
    reporte = correr(db, tmp_path, RECURSOS, (
        "recurso,solicitante,salida,devolucion_esperada\n"
        "PC-02,Ana,2026-10-16 08:00,2026-10-16 12:00\n"
    ))
    assert db.get(Recurso, "PC-02").estado == "prestado"     # tiene préstamo activo
    assert db.get(Recurso, "PC-04").estado == "disponible"   # no tenía
    assert any("R4" in c.descripcion and c.id_origen == "PC-04" for c in reporte.entidad("recursos").correcciones)


def test_prestamo_devuelto_no_cambia_el_recurso(db, tmp_path):
    correr(db, tmp_path, RECURSOS, (
        "recurso,solicitante,salida,devolucion_esperada,devolucion_real\n"
        "PC-01,Ana,2026-10-15 08:00,2026-10-15 12:00,2026-10-15 11:00\n"
    ))
    assert db.get(Recurso, "PC-01").estado == "disponible"
    assert db.exec(select(Prestamo)).one().estado == "devuelto"


@pytest.mark.parametrize("fila,motivo", [
    ("PC-99,Ana,2026-10-16 08:00,2026-10-16 12:00,,", "recurso"),
    ("PC-01,,2026-10-16 08:00,2026-10-16 12:00,,", "solicitante"),
    ("PC-01,Ana,31/02/2026,2026-10-16 12:00,,", "salida"),
    ("PC-01,Ana,2026-10-16 12:00,2026-10-16 08:00,,", "devolucion_esperada"),
    ("PC-01,Ana,2026-10-16 08:00,2026-10-16 12:00,2026-10-16 07:00,", "devolucion_real"),
    ("PC-01,Ana,2026-10-16 08:00,2026-10-16 12:00,,devuelto", "estado"),
    ("PC-01,Ana,2026-10-16 08:00,2026-10-16 12:00,2026-10-16 11:00,activo", "estado"),
])
def test_prestamo_invalido_va_a_cuarentena(db, tmp_path, fila, motivo):
    reporte = correr(db, tmp_path, RECURSOS, f"recurso,solicitante,salida,devolucion_esperada,devolucion_real,estado\n{fila}\n")
    assert reporte.entidad("prestamos").cargados == 0
    assert motivos(reporte, "prestamos")[0].startswith(motivo)
