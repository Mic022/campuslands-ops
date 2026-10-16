import pytest
from sqlmodel import Session, SQLModel, create_engine, select

import app.models  # noqa: F401
from app.ingest.pipeline import cargar_espacios
from app.ingest.reporte import ReporteCarga
from app.models import Auditoria, Espacio


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def cargar(db, filas):
    reporte = ReporteCarga()
    cargar_espacios(db, filas, reporte)
    db.commit()
    return reporte.entidad("espacios")


def test_carga_espacios_validos_y_deriva_tipo(db):
    rep = cargar(db, [{"nombre": "Auditorio", "capacidad": "100"}, {"nombre": "Azul", "capacidad": "10"}])
    assert (rep.leidos, rep.cargados, len(rep.cuarentena)) == (2, 2, 0)
    auditorio = db.get(Espacio, "auditorio")
    assert (auditorio.tipo, auditorio.aforo, auditorio.estado) == ("aula", 100, "disponible")
    assert db.get(Espacio, "azul").tipo == "cubiculo"


def test_duplicado_va_a_cuarentena_y_se_conserva_el_primero(db):
    rep = cargar(db, [{"nombre": "Cosmos", "capacidad": "25"}, {"nombre": " cosmos ", "capacidad": "30"}])
    assert rep.cargados == 1
    assert "duplicado" in rep.cuarentena[0].motivo
    assert db.get(Espacio, "cosmos").aforo == 25


@pytest.mark.parametrize("capacidad", ["veinte", "0", "-5", ""])
def test_aforo_invalido_va_a_cuarentena(db, capacidad):
    rep = cargar(db, [{"nombre": "Apolo", "capacidad": capacidad}])
    assert rep.cargados == 0
    assert rep.cuarentena[0].motivo.startswith("aforo")


def test_nombre_vacio_va_a_cuarentena(db):
    rep = cargar(db, [{"nombre": "  ", "capacidad": "10"}])
    assert rep.cuarentena[0].motivo.startswith("nombre")


def test_columnas_alternativas_y_estado_con_variantes(db):
    cargar(db, [{"Espacio": "Skylab", "Aforo": " 20 ", "Estado": "MANTENIMIENTO"}])
    assert db.get(Espacio, "skylab").estado == "mantenimiento"


def test_cada_carga_queda_auditada(db):
    cargar(db, [{"nombre": "Artemis", "capacidad": "32"}])
    registros = db.exec(select(Auditoria).where(Auditoria.entidad_id == "artemis")).all()
    assert len(registros) == 1 and registros[0].accion == "ingesta"
