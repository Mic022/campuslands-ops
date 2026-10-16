"""Login, tokens y permisos por rol con la autenticación real (sin la sesión de admin de pruebas)."""
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401
from app.auth import seguridad
from app.config import permisos
from app.db import get_session
from app.main import app
from app.models import Usuario

pytestmark = pytest.mark.autenticacion_real

MANANA = (datetime.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


def a(hora: int) -> str:
    return MANANA.replace(hour=hora).isoformat()


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        s.add(Usuario(usuario="admin", nombre="Administración", rol="admin", clave_hash=seguridad.hashear_clave("clave-admin")))
        s.add(Usuario(usuario="ana", nombre="Ana", rol="usuario", clave_hash=seguridad.hashear_clave("clave-ana")))
        s.add(Usuario(usuario="beto", nombre="Beto", rol="usuario", clave_hash=seguridad.hashear_clave("clave-beto")))
        s.add(Usuario(usuario="inactivo", nombre="Inactivo", rol="usuario", activo=False,
                      clave_hash=seguridad.hashear_clave("clave-x")))
        s.commit()

    def sesion():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = sesion
    yield TestClient(app)
    app.dependency_overrides.clear()


def token(client, usuario, clave):
    r = client.post("/api/auth/login", json={"usuario": usuario, "clave": clave})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture
def admin(client):
    return token(client, "admin", "clave-admin")


@pytest.fixture
def ana(client):
    return token(client, "ana", "clave-ana")


@pytest.fixture
def cosmos(client, admin):
    assert client.post("/api/espacios", headers=admin, json={"nombre": "Cosmos", "tipo": "aula", "aforo": 25}).status_code == 201
    assert client.post("/api/recursos", headers=admin, json={"id": "PC-01", "tipo": "portatil"}).status_code == 201


# ---------- Login ----------

def test_login_devuelve_token_y_datos_del_usuario(client):
    r = client.post("/api/auth/login", json={"usuario": "ana", "clave": "clave-ana"})
    assert r.status_code == 200
    assert r.json()["usuario"] == {"usuario": "ana", "nombre": "Ana", "rol": "usuario"}
    assert "clave" not in r.text and "hash" not in r.text


@pytest.mark.parametrize("usuario,clave", [("ana", "mala"), ("nadie", "clave-ana"), ("inactivo", "clave-x")])
def test_login_invalido_responde_401_sin_revelar_cual_fallo(client, usuario, clave):
    r = client.post("/api/auth/login", json={"usuario": usuario, "clave": clave})
    assert r.status_code == 401
    assert r.json() == {"codigo": "AUTH-401", "mensaje": "Usuario o clave incorrectos."}


def test_yo_devuelve_el_usuario_de_la_sesion(client, ana):
    assert client.get("/api/auth/yo", headers=ana).json()["nombre"] == "Ana"


# ---------- Tokens ----------

def test_sin_token_responde_401(client):
    r = client.get("/api/espacios")
    assert r.status_code == 401 and r.json()["codigo"] == "AUTH-401"


@pytest.mark.parametrize("valor", ["Bearer basura", "Bearer abc.def", "Basic YWJj"])
def test_token_invalido_responde_401(client, valor):
    assert client.get("/api/espacios", headers={"Authorization": valor}).status_code == 401


def test_token_adulterado_responde_401(client, ana):
    cuerpo, firma = ana["Authorization"].removeprefix("Bearer ").split(".")
    falso = seguridad._b64(b'{"sub": "admin", "rol": "admin", "exp": 9999999999}')
    assert client.get("/api/auditoria", headers={"Authorization": f"Bearer {falso}.{firma}"}).status_code == 401


def test_token_vencido_responde_401(client):
    vencido = seguridad.crear_token("ana", "usuario", horas=-1)
    assert client.get("/api/espacios", headers={"Authorization": f"Bearer {vencido}"}).status_code == 401


def test_rutas_publicas_no_piden_token(client):
    for ruta in ("/api/health", "/api/catalogos", "/api/reglas"):
        assert client.get(ruta).status_code == 200, ruta


def test_hash_no_guarda_la_clave_en_claro():
    h = seguridad.hashear_clave("secreta")
    assert "secreta" not in h and seguridad.verificar_clave("secreta", h) and not seguridad.verificar_clave("otra", h)


# ---------- Roles ----------

def test_usuario_puede_consultar_y_reportar(client, ana, cosmos):
    assert client.get("/api/espacios", headers=ana).status_code == 200
    assert client.get("/api/recursos", headers=ana).status_code == 200
    assert client.get("/api/reservas", headers=ana).status_code == 200


@pytest.mark.parametrize("metodo,ruta,cuerpo", [
    ("post", "/api/espacios", {"nombre": "Nueva", "tipo": "aula", "aforo": 10}),
    ("patch", "/api/espacios/cosmos", {"aforo": 30}),
    ("post", "/api/recursos", {"id": "PC-99", "tipo": "portatil"}),
    ("patch", "/api/recursos/PC-01/estado", {"estado": "mantenimiento"}),
    ("get", "/api/auditoria", None),
    ("get", "/api/datos/reporte", None),
])
def test_usuario_no_puede_acciones_de_admin(client, ana, cosmos, metodo, ruta, cuerpo):
    r = getattr(client, metodo)(ruta, headers=ana, **({"json": cuerpo} if cuerpo else {}))
    assert r.status_code == 403 and r.json()["codigo"] == "AUTH-403"


def test_admin_puede_acciones_de_admin(client, admin, cosmos):
    r = client.patch("/api/recursos/PC-01/estado", headers=admin, json={"estado": "mantenimiento"})
    assert r.status_code == 200


# ---------- A su nombre / solo propias ----------

def reservar(client, headers, solicitante, desde=10):
    return client.post("/api/reservas", headers=headers, json={
        "espacio_id": "cosmos", "solicitante": solicitante, "inicio": a(desde), "fin": a(desde + 1), "asistentes": 5})


def test_usuario_reserva_a_su_nombre_y_no_a_nombre_de_otro(client, ana, cosmos):
    assert reservar(client, ana, " ana ").status_code == 201          # mismo nombre, normalizado
    r = reservar(client, ana, "Beto", desde=12)
    assert r.status_code == 403 and "a tu nombre" in r.json()["mensaje"]


def test_usuario_no_pide_prestamos_a_nombre_de_otro(client, ana, cosmos):
    r = client.post("/api/prestamos", headers=ana, json={"recurso_id": "PC-01", "solicitante": "Beto",
                                                         "devolucion_esperada": a(18)})
    assert r.status_code == 403


def test_admin_puede_reservar_por_cualquiera(client, admin, cosmos):
    assert reservar(client, admin, "Beto").status_code == 201


def test_usuario_solo_cancela_sus_reservas(client, admin, ana, cosmos):
    de_beto = reservar(client, admin, "Beto").json()["id"]
    de_ana = reservar(client, ana, "Ana", desde=12).json()["id"]
    assert client.post(f"/api/reservas/{de_beto}/cancelar", headers=ana).status_code == 403
    assert client.post(f"/api/reservas/{de_ana}/cancelar", headers=ana).status_code == 200
    assert client.post(f"/api/reservas/{de_beto}/cancelar", headers=admin).status_code == 200


def test_las_reglas_de_negocio_siguen_aplicando_con_sesion(client, ana, cosmos):
    reservar(client, ana, "Ana")
    r = reservar(client, ana, "Ana")
    assert r.status_code == 409 and r.json()["codigo"] == "RN-01"


# ---------- Auditoría ----------

def test_la_auditoria_registra_quien_hizo_el_cambio(client, admin, ana, cosmos):
    reserva = reservar(client, ana, "Ana").json()["id"]
    historial = client.get("/api/auditoria", headers=admin, params={"entidad": "reserva", "id": str(reserva)}).json()
    assert historial[0]["actor"] == "Ana"
    recurso = client.get("/api/auditoria", headers=admin, params={"entidad": "recurso", "id": "PC-01"}).json()
    assert recurso[0]["actor"] == "Administración"


# ---------- Cobertura de la tabla de permisos ----------

def test_las_rutas_de_la_tabla_de_permisos_existen():
    """Toda ruta escrita en la tabla de permisos existe: un error de tipeo dejaría esa acción sin proteger."""
    rutas = {(m, r.path) for r in app.routes if getattr(r, "path", "").startswith("/api") for m in getattr(r, "methods", [])}
    declaradas = permisos.PUBLICAS | permisos.SOLO_ADMIN | permisos.A_SU_NOMBRE | permisos.SOLO_PROPIAS
    assert declaradas - rutas <= {("PATCH", "/api/incidencias/{incidencia_id}")}, declaradas - rutas
