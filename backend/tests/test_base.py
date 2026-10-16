from fastapi.testclient import TestClient

from app.config import catalogos
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"estado": "ok"}


def test_catalogos_expone_valores_cerrados():
    r = client.get("/api/catalogos")
    assert r.status_code == 200
    assert r.json()["prioridad"] == catalogos.valores(catalogos.Prioridad)


def test_transiciones_cubren_todos_los_estados():
    assert set(catalogos.TRANSICIONES_RECURSO) == set(catalogos.EstadoRecurso)


def test_reglas_expone_todos_los_parametros_que_usa_el_frontend():
    r = client.get("/api/reglas").json()
    esperados = {
        "hora_apertura", "hora_cierre", "max_horas_reserva", "factor_aforo",
        "max_prestamos_activos", "prioridades_bloqueantes", "umbral_confianza_ia", "max_largo_descripcion",
    }
    assert esperados <= set(r)
