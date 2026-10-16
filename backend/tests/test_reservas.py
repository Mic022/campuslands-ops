from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel

from app.config import salas as catalogo
from app.config import settings
from app.db import crear_tablas, engine
from app.main import app
from app.services.reservas import sembrar_salas

client = TestClient(app)
MANANA = (date.today() + timedelta(days=1)).isoformat()
ADMIN = "token-de-prueba"


@pytest.fixture(autouse=True)
def bd_limpia(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_TOKEN", ADMIN)
    SQLModel.metadata.drop_all(engine)
    crear_tablas()
    with Session(engine) as session:
        sembrar_salas(session)


def reservar(**cambios):
    datos = {
        "sala_id": "salon-cosmos", "solicitante": "Ana Pérez", "fecha": MANANA,
        "hora_inicio": "10:00", "hora_fin": "11:00", "asistentes": 8, "motivo": "Planeación sprint",
    }
    datos.update(cambios)
    return client.post("/api/reservas", json=datos)


def test_catalogo_tiene_exactamente_diez_salas_con_nombre():
    r = client.get("/api/salas")
    assert r.status_code == 200
    nombres = {s["nombre"] for s in r.json()}
    assert len(nombres) == 10
    assert nombres == {s["nombre"] for s in catalogo.SALAS_NIVEL6}
    assert "Sala Blanca" in nombres


def test_crear_reserva_cambia_ocupacion_en_ese_horario():
    r = reservar()
    assert r.status_code == 201, r.text
    assert r.json()["token"]
    assert r.json()["reserva"]["solicitante"] == "Ana Pérez"

    nivel = client.get("/api/nivel6", params={"fecha": MANANA, "hora": "10:30"}).json()
    cosmos = next(s for s in nivel["salas"] if s["id"] == "salon-cosmos")
    assert cosmos["ocupacion"] == "reservada"
    assert nivel["resumen"] == {"total": 10, "disponibles": 9, "reservadas": 1, "mantenimiento": 0}

    libre = client.get("/api/nivel6", params={"fecha": MANANA, "hora": "11:00"}).json()
    assert next(s for s in libre["salas"] if s["id"] == "salon-cosmos")["ocupacion"] == "disponible"


def test_la_agenda_publica_no_expone_datos_personales():
    reservar()
    agenda = client.get("/api/salas/salon-cosmos/reservas").json()
    assert len(agenda) == 1 and "solicitante" not in agenda[0]


@pytest.mark.parametrize("inicio,fin", [("10:30", "11:30"), ("09:00", "10:01"), ("10:15", "10:45")])
def test_rechaza_solapes(inicio, fin):
    assert reservar().status_code == 201
    r = reservar(hora_inicio=inicio, hora_fin=fin)
    assert r.status_code == 409
    assert r.json()["codigo"] == "RES-06"


def test_permite_reservas_contiguas_y_en_otra_sala():
    assert reservar().status_code == 201
    assert reservar(hora_inicio="11:00", hora_fin="12:00").status_code == 201
    assert reservar(sala_id="skylab").status_code == 201


@pytest.mark.parametrize("cambios,codigo", [
    ({"hora_inicio": "11:00", "hora_fin": "10:00"}, "RES-01"),
    ({"hora_inicio": "10:00", "hora_fin": "10:00"}, "RES-01"),
    ({"hora_inicio": "05:00", "hora_fin": "06:30"}, "RES-02"),
    ({"hora_inicio": "21:00", "hora_fin": "22:30"}, "RES-02"),
    ({"hora_inicio": "08:00", "hora_fin": "13:00"}, "RES-03"),
    ({"fecha": (date.today() - timedelta(days=1)).isoformat()}, "RES-04"),
    ({"asistentes": 13}, "RES-05"),
])
def test_validaciones_de_negocio(cambios, codigo):
    r = reservar(**cambios)
    assert r.status_code == 409
    assert r.json()["codigo"] == codigo


def test_datos_invalidos_responden_422():
    assert reservar(fecha="2026-02-31").status_code == 422
    assert reservar(solicitante="").status_code == 422
    assert reservar(asistentes=0).status_code == 422


def test_sala_en_mantenimiento_no_admite_reservas():
    sin_token = client.put("/api/salas/skylab/mantenimiento", json={"activo": True})
    assert sin_token.status_code == 403

    r = client.put("/api/salas/skylab/mantenimiento", json={"activo": True, "motivo": "Pintura"},
                   headers={"X-Admin-Token": ADMIN})
    assert r.status_code == 200 and r.json()["estado"] == "mantenimiento"
    assert reservar(sala_id="skylab").json()["codigo"] == "RES-07"

    nivel = client.get("/api/nivel6").json()
    assert next(s for s in nivel["salas"] if s["id"] == "skylab")["ocupacion"] == "mantenimiento"


def test_cancelar_exige_token_del_propietario_o_de_operador():
    creada = reservar().json()
    rid, token = creada["reserva"]["id"], creada["token"]

    assert client.delete(f"/api/reservas/{rid}").status_code == 403
    assert client.delete(f"/api/reservas/{rid}", headers={"X-Reserva-Token": "otro"}).status_code == 403

    r = client.delete(f"/api/reservas/{rid}", headers={"X-Reserva-Token": token})
    assert r.status_code == 200 and r.json()["estado"] == "cancelada"
    # El hueco queda libre de nuevo
    assert reservar().status_code == 201

    otra = reservar(hora_inicio="14:00", hora_fin="15:00").json()["reserva"]["id"]
    assert client.delete(f"/api/reservas/{otra}", headers={"X-Admin-Token": ADMIN}).status_code == 200


def test_historial_por_tokens_y_completo_para_operador():
    t1 = reservar().json()["token"]
    reservar(sala_id="skylab")
    mias = client.post("/api/reservas/mias", json={"tokens": [t1]}).json()
    assert [m["sala_id"] for m in mias] == ["salon-cosmos"]

    assert client.get("/api/reservas").status_code == 403
    assert len(client.get("/api/reservas", headers={"X-Admin-Token": ADMIN}).json()) == 2


def test_reservas_simultaneas_del_mismo_hueco_solo_una_gana():
    with ThreadPoolExecutor(max_workers=6) as pool:
        codigos = list(pool.map(lambda _: reservar().status_code, range(6)))
    assert codigos.count(201) == 1
    assert codigos.count(409) == 5
