import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db import get_session
from app.main import app
from app.models import Espacio


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        s.add(Espacio(id="cosmos", nombre="Cosmos", tipo="aula", aforo=25))
        s.add(Espacio(id="azul", nombre="Azul", tipo="cubiculo", aforo=10))
        s.commit()

    def sesion():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = sesion
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_lista_espacios(client):
    r = client.get("/api/espacios")
    assert r.status_code == 200
    assert [e["id"] for e in r.json()] == ["cosmos", "azul"]


def test_espacio_inexistente_responde_404_con_codigo(client):
    r = client.get("/api/espacios/no-existe")
    assert r.status_code == 404
    assert r.json()["codigo"] == "ERR-404"


def test_resumen_calcula_desde_la_bd(client):
    r = client.get("/api/resumen").json()
    assert r["espacios_por_tipo"] == {"aula": 1, "cubiculo": 1}
    assert r["aforo_total"] == 35
    assert r["prestamos_activos"] == 0


def test_recursos_vacio(client):
    assert client.get("/api/recursos").json() == []
