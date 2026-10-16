"""Endpoints de espacios, reservas, recursos y préstamos sobre una BD en memoria."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

import app.models  # noqa: F401
from app.config import reglas as cfg
from app.db import get_session
from app.main import app
from app.models import Auditoria, Prestamo, Recurso

MANANA = (datetime.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


def a(hora: int) -> str:
    return MANANA.replace(hour=hora).isoformat()


@pytest.fixture
def engine():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def client(engine):
    def sesion():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = sesion
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def sala(client):
    r = client.post("/api/espacios", json={"nombre": "Sala Cosmos", "tipo": "aula", "aforo": 20})
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def portatil(client):
    r = client.post("/api/recursos", json={"id": "PC-01", "tipo": "portátil", "serial": "SN-1"})
    assert r.status_code == 201, r.text
    return r.json()


def reservar(client, espacio_id, inicio=8, fin=10, asistentes=10, solicitante="Ana"):
    return client.post(
        "/api/reservas",
        json={"espacio_id": espacio_id, "solicitante": solicitante, "inicio": a(inicio), "fin": a(fin), "asistentes": asistentes},
    )


def prestar(client, recurso_id, solicitante="ana"):
    return client.post(
        "/api/prestamos",
        json={"recurso_id": recurso_id, "solicitante": solicitante, "devolucion_esperada": a(18)},
    )


def auditorias(engine, entidad):
    with Session(engine) as s:
        return list(s.exec(select(Auditoria).where(Auditoria.entidad == entidad)))


# ---------- Espacios ----------

def test_crud_espacio(client, sala):
    assert sala["id"] == "sala-cosmos"
    assert client.get("/api/espacios/sala-cosmos").json()["aforo_permitido"] == 20

    r = client.patch("/api/espacios/sala-cosmos", json={"estado": "mantenimiento"})
    assert r.status_code == 200 and r.json()["estado"] == "mantenimiento"
    assert [e["id"] for e in client.get("/api/espacios?estado=mantenimiento").json()] == ["sala-cosmos"]


def test_espacio_duplicado_y_valores_fuera_de_catalogo(client, sala):
    r = client.post("/api/espacios", json={"nombre": "sala  cosmos", "tipo": "aula", "aforo": 5})
    assert r.status_code == 409 and r.json()["codigo"] == "ERR-409"

    r = client.post("/api/espacios", json={"nombre": "X", "tipo": "auditorio", "aforo": 5})
    assert r.status_code == 422 and r.json()["codigo"] == "ERR-422"


def test_espacio_inexistente_da_404(client):
    r = client.get("/api/espacios/no-existe")
    assert r.status_code == 404 and set(r.json()) >= {"codigo", "mensaje"}


def test_aforo_permitido_refleja_factor_en_vivo(client, sala, monkeypatch):
    monkeypatch.setattr(cfg, "FACTOR_AFORO", 0.5)
    assert client.get("/api/espacios").json()[0]["aforo_permitido"] == 10
    assert reservar(client, sala["id"], asistentes=11).json()["codigo"] == "RN-02"


# ---------- Reservas ----------

def test_reserva_valida_queda_auditada(client, engine, sala):
    r = reservar(client, sala["id"])
    assert r.status_code == 201, r.text
    assert r.json()["estado"] == "activa"
    assert [x.accion for x in auditorias(engine, "reserva")] == ["crear"]


@pytest.mark.parametrize(
    "kwargs,codigo",
    [
        ({"inicio": 9, "fin": 11}, "RN-01"),     # se cruza con 8-10
        ({"asistentes": 21}, "RN-02"),
        ({"inicio": 4, "fin": 6}, "RN-05"),
        ({"inicio": 10, "fin": 16}, "RN-05"),
    ],
)
def test_reservas_invalidas(client, engine, sala, kwargs, codigo):
    assert reservar(client, sala["id"]).status_code == 201
    datos = {"inicio": 10, "fin": 12, **kwargs}
    r = reservar(client, sala["id"], **datos)
    assert r.status_code == 409
    assert r.json()["codigo"] == codigo
    assert len(auditorias(engine, "reserva")) == 1  # la rechazada no deja rastro


def test_reservas_consecutivas_se_permiten(client, sala):
    assert reservar(client, sala["id"], 8, 10).status_code == 201
    assert reservar(client, sala["id"], 10, 12).status_code == 201


def test_espacio_en_mantenimiento_no_se_reserva(client, sala):
    client.patch(f"/api/espacios/{sala['id']}", json={"estado": "mantenimiento"})
    assert reservar(client, sala["id"]).json()["codigo"] == "RN-04"


def test_cancelar_libera_el_horario(client, sala):
    reserva_id = reservar(client, sala["id"]).json()["id"]
    assert client.post(f"/api/reservas/{reserva_id}/cancelar").json()["estado"] == "cancelada"
    assert client.post(f"/api/reservas/{reserva_id}/cancelar").status_code == 409
    assert reservar(client, sala["id"]).status_code == 201


def test_no_baja_aforo_por_debajo_de_reservas_futuras(client, sala):
    reservar(client, sala["id"], asistentes=15)
    r = client.patch(f"/api/espacios/{sala['id']}", json={"aforo": 10})
    assert r.json()["codigo"] == "RN-02"


def test_agenda_del_espacio(client, sala):
    reservar(client, sala["id"])
    r = client.get(f"/api/espacios/{sala['id']}/reservas?fecha={MANANA.date()}")
    assert len(r.json()) == 1


def test_doble_clic_concurrente_crea_una_sola_reserva(client, sala):
    with ThreadPoolExecutor(max_workers=8) as pool:
        codigos = list(pool.map(lambda _: reservar(client, sala["id"]).status_code, range(8)))
    assert sorted(codigos) == [201] + [409] * 7


# ---------- Recursos ----------

def test_crud_recurso(client, portatil):
    assert portatil["estado"] == "disponible"
    r = client.patch("/api/recursos/PC-01", json={"nombre": "Portátil Lenovo"})
    assert r.json()["nombre"] == "Portátil Lenovo"
    assert client.post("/api/recursos", json={"id": "PC-02", "tipo": "portátil", "serial": "SN-1"}).status_code == 409
    assert len(client.get("/api/recursos?tipo=PORTÁTIL").json()) == 1


def test_cambio_de_estado_sigue_la_maquina(client, portatil):
    r = client.patch("/api/recursos/PC-01/estado", json={"estado": "mantenimiento", "motivo": "teclado"})
    assert r.json()["estado"] == "mantenimiento"
    r = client.patch("/api/recursos/PC-01/estado", json={"estado": "baja"})
    assert (r.status_code, r.json()["codigo"]) == (409, "RN-03")


def test_prestado_solo_cambia_por_prestamo(client, portatil):
    r = client.patch("/api/recursos/PC-01/estado", json={"estado": "prestado"})
    assert r.json()["codigo"] == "RN-03"


# ---------- Préstamos y devoluciones ----------

def test_prestamo_y_devolucion(client, engine, portatil):
    r = prestar(client, "PC-01")
    assert r.status_code == 201, r.text
    prestamo_id = r.json()["id"]
    assert client.get("/api/recursos/PC-01").json()["estado"] == "prestado"

    r = client.post(f"/api/prestamos/{prestamo_id}/devolucion", json={"estado_recurso": "danado", "observacion": "pantalla rota"})
    assert r.status_code == 200 and r.json()["estado"] == "devuelto"
    assert client.get("/api/recursos/PC-01").json()["estado"] == "danado"
    acciones = [(x.estado_anterior, x.estado_nuevo) for x in auditorias(engine, "recurso")]
    assert acciones == [(None, "disponible"), ("disponible", "prestado"), ("prestado", "danado")]


def test_no_se_presta_un_recurso_prestado(client, portatil):
    prestar(client, "PC-01")
    r = prestar(client, "PC-01", "otro")
    assert (r.status_code, r.json()["codigo"]) == (409, "RN-03")


def test_limite_de_prestamos_por_solicitante(client):
    for i in range(cfg.MAX_PRESTAMOS_ACTIVOS + 1):
        client.post("/api/recursos", json={"id": f"R{i}", "tipo": "videobeam"})
    for i in range(cfg.MAX_PRESTAMOS_ACTIVOS):
        assert prestar(client, f"R{i}", "Ana Pérez").status_code == 201
    # Mismo solicitante escrito distinto (mayúsculas, tildes y espacios).
    r = prestar(client, f"R{cfg.MAX_PRESTAMOS_ACTIVOS}", "  ANA   PEREZ ")
    assert (r.status_code, r.json()["codigo"]) == (409, "RN-06")
    r = prestar(client, f"R{cfg.MAX_PRESTAMOS_ACTIVOS}", "ana PÉREZ")
    assert (r.status_code, r.json()["codigo"]) == (409, "RN-06")
    assert client.get(f"/api/recursos/R{cfg.MAX_PRESTAMOS_ACTIVOS}").json()["estado"] == "disponible"


def test_doble_devolucion(client, portatil):
    prestamo_id = prestar(client, "PC-01").json()["id"]
    assert client.post(f"/api/prestamos/{prestamo_id}/devolucion").status_code == 200
    r = client.post(f"/api/prestamos/{prestamo_id}/devolucion")
    assert (r.status_code, r.json()["codigo"]) == (409, "RN-07")


def test_devolucion_a_estado_invalido(client, portatil):
    prestamo_id = prestar(client, "PC-01").json()["id"]
    r = client.post(f"/api/prestamos/{prestamo_id}/devolucion", json={"estado_recurso": "baja"})
    assert r.json()["codigo"] == "RN-07"
    assert client.get("/api/recursos/PC-01").json()["estado"] == "prestado"


def test_regla_fallida_no_deja_cambios_a_medias(client, engine, portatil):
    r = client.post(
        "/api/prestamos",
        json={"recurso_id": "PC-01", "solicitante": "ana", "salida": a(12), "devolucion_esperada": a(10)},
    )
    assert r.json()["codigo"] == "RN-06"
    with Session(engine) as s:
        assert s.get(Recurso, "PC-01").estado == "disponible"
        assert s.exec(select(Prestamo)).first() is None


def test_doble_clic_concurrente_crea_un_solo_prestamo(client, portatil):
    with ThreadPoolExecutor(max_workers=8) as pool:
        codigos = list(pool.map(lambda i: prestar(client, "PC-01", f"p{i}").status_code, range(8)))
    assert sorted(codigos) == [201] + [409] * 7


def test_prestamos_vencidos(client, portatil):
    client.post(
        "/api/prestamos",
        json={"recurso_id": "PC-01", "solicitante": "ana", "salida": "2020-01-01T08:00", "devolucion_esperada": "2020-01-01T10:00"},
    )
    assert len(client.get("/api/prestamos?vencidos=true").json()) == 1
