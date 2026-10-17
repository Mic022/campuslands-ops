"""Login, sesiones, permisos por rol, registro y recuperación con la autenticación real.

Cada persona usa su propio TestClient: así cada una conserva su cookie de sesión, como en
navegadores distintos.
"""
import re
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

import app.models  # noqa: F401
from app.auth import correo, seguridad
from app.auth.limitador import limitador
from app.config import permisos, settings
from app.db import get_session
from app.main import app
from app.migraciones import migrar
from app.models import Sesion, TokenRecuperacion, Usuario

pytestmark = pytest.mark.autenticacion_real

MANANA = (datetime.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
CLAVE_NUEVA = "Campus2026seguro"


def a(hora: int) -> str:
    return MANANA.replace(hour=hora).isoformat()


@pytest.fixture
def engine():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        s.add(Usuario(usuario="admin", nombre="Administración", rol="admin", email="admin@campus.co",
                      clave_hash=seguridad.hashear_clave("clave-admin")))
        s.add(Usuario(usuario="ana", nombre="Ana", rol="usuario", email="ana@campus.co",
                      clave_hash=seguridad.hashear_clave("clave-ana")))
        s.add(Usuario(usuario="beto", nombre="Beto", rol="usuario", clave_hash=seguridad.hashear_clave("clave-beto")))
        s.add(Usuario(usuario="inactivo", nombre="Inactivo", rol="usuario", activo=False,
                      clave_hash=seguridad.hashear_clave("clave-x")))
        s.commit()
    return engine


@pytest.fixture
def client(engine):
    def sesion():
        with Session(engine) as s:
            yield s

    limitador.reiniciar()
    app.dependency_overrides[get_session] = sesion
    yield TestClient(app)
    app.dependency_overrides.clear()
    limitador.reiniciar()


def entrar(usuario: str, clave: str, recordar: bool = False) -> TestClient:
    """Cliente con la sesión iniciada y el token CSRF puesto en sus cabeceras."""
    c = TestClient(app)
    r = c.post("/api/auth/login", json={"usuario": usuario, "clave": clave, "recordar": recordar})
    assert r.status_code == 200, r.text
    c.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    return c


@pytest.fixture
def admin(client):
    return entrar("admin", "clave-admin")


@pytest.fixture
def ana(client):
    return entrar("ana", "clave-ana")


@pytest.fixture
def cosmos(admin):
    assert admin.post("/api/espacios", json={"nombre": "Cosmos", "tipo": "aula", "aforo": 25}).status_code == 201
    assert admin.post("/api/recursos", json={"id": "PC-01", "tipo": "portatil"}).status_code == 201


def login(client, usuario, clave):
    return client.post("/api/auth/login", json={"usuario": usuario, "clave": clave})


# ---------- Inicio de sesión ----------

def test_login_crea_cookie_httponly_y_no_expone_secretos(client):
    r = login(client, "ana", "clave-ana")
    assert r.status_code == 200
    assert r.json()["usuario"] == {"usuario": "ana", "nombre": "Ana", "email": "ana@campus.co", "rol": "usuario"}
    cookie = r.headers["set-cookie"]
    assert cookie.startswith(f"{settings.COOKIE_SESION}=") and "HttpOnly" in cookie and "samesite=lax" in cookie.lower()
    token_sesion = r.cookies.get(settings.COOKIE_SESION)
    assert token_sesion and token_sesion not in r.text      # el token de sesión solo viaja en la cookie
    assert "clave" not in r.text and "argon2" not in r.text
    assert r.headers["cache-control"] == "no-store"


def test_login_con_correo_en_mayusculas(client):
    assert login(client, " ANA@Campus.co ", "clave-ana").status_code == 200


@pytest.mark.parametrize("usuario,clave", [("ana", "mala"), ("nadie", "clave-ana"), ("inactivo", "mala")])
def test_login_invalido_responde_401_sin_revelar_cual_fallo(client, usuario, clave):
    r = login(client, usuario, clave)
    assert r.status_code == 401
    assert r.json() == {"codigo": "AUTH-CREDENCIALES", "mensaje": "Usuario o clave incorrectos."}


def test_cuenta_desactivada_solo_se_informa_a_quien_conoce_la_clave(client):
    r = login(client, "inactivo", "clave-x")
    assert r.status_code == 403 and r.json()["codigo"] == "AUTH-CUENTA-INACTIVA"
    assert settings.COOKIE_SESION not in r.headers.get("set-cookie", "")


@pytest.mark.parametrize("cuerpo", [{}, {"usuario": "", "clave": "x"}, {"usuario": "ana", "clave": ""}])
def test_campos_vacios_responden_422(client, cuerpo):
    assert client.post("/api/auth/login", json=cuerpo).status_code == 422


def test_bloqueo_tras_intentos_fallidos_incluso_con_la_clave_correcta(client, admin):
    for _ in range(settings.LOGIN_MAX_INTENTOS):
        assert login(client, "ana", "mala").status_code == 401
    r = login(client, "ana", "clave-ana")
    assert r.status_code == 429 and r.json()["codigo"] == "AUTH-429" and int(r.headers["retry-after"]) > 0
    # Un administrador puede desbloquearla.
    assert admin.post("/api/admin/usuarios/ana/desbloquear").status_code == 200
    assert login(client, "ana", "clave-ana").status_code == 200


def test_el_bloqueo_no_revela_si_la_cuenta_existe(client):
    for _ in range(settings.LOGIN_MAX_INTENTOS):
        login(client, "fantasma", "mala")
    assert login(client, "fantasma", "mala").status_code == 429


def test_hash_heredado_pbkdf2_se_migra_a_argon2id(client, engine):
    import hashlib
    sal = "00" * 16
    digest = hashlib.pbkdf2_hmac("sha256", b"clave-beto", bytes.fromhex(sal), 1000).hex()
    with Session(engine) as s:
        beto = s.get(Usuario, "beto")
        beto.clave_hash = f"pbkdf2_sha256$1000${sal}${digest}"
        s.add(beto)
        s.commit()
    assert login(client, "beto", "clave-beto").status_code == 200
    with Session(engine) as s:
        assert s.get(Usuario, "beto").clave_hash.startswith("$argon2id$")


# ---------- Sesión ----------

def test_sin_sesion_responde_401(client):
    r = client.get("/api/espacios")
    assert r.status_code == 401 and r.json()["codigo"] == "AUTH-401"


def test_cookie_inventada_responde_401(client):
    client.cookies.set(settings.COOKIE_SESION, "inventada")
    assert client.get("/api/espacios").status_code == 401


def test_yo_devuelve_el_usuario_de_la_sesion_al_recargar(ana):
    r = ana.get("/api/auth/yo")
    assert r.status_code == 200 and r.json()["usuario"]["nombre"] == "Ana" and r.json()["csrf_token"]


def test_logout_revoca_la_sesion_en_el_servidor(ana):
    cookie = ana.cookies.get(settings.COOKIE_SESION)
    assert ana.post("/api/auth/logout").status_code == 204
    reutilizada = TestClient(app)
    reutilizada.cookies.set(settings.COOKIE_SESION, cookie)
    r = reutilizada.get("/api/auth/yo")
    assert r.status_code == 401 and r.json()["codigo"] == "AUTH-SESION-INVALIDA"


def test_sesion_caducada_pide_iniciar_sesion(ana, engine):
    with Session(engine) as s:
        for sesion in s.exec(select(Sesion)):
            sesion.expira_en = datetime.now() - timedelta(minutes=1)
            s.add(sesion)
        s.commit()
    r = ana.get("/api/espacios")
    assert r.status_code == 401 and r.json()["codigo"] == "AUTH-SESION-CADUCADA"


def test_sesion_inactiva_caduca_salvo_que_se_recuerde(client, engine):
    normal = entrar("ana", "clave-ana")
    recordada = entrar("beto", "clave-beto", recordar=True)
    with Session(engine) as s:
        for sesion in s.exec(select(Sesion)):
            sesion.ultima_actividad = datetime.now() - timedelta(minutes=settings.SESION_INACTIVIDAD_MIN + 1)
            s.add(sesion)
        s.commit()
    assert normal.get("/api/espacios").status_code == 401
    assert recordada.get("/api/espacios").status_code == 200


def test_escritura_sin_token_csrf_responde_403(admin):
    del admin.headers["X-CSRF-Token"]
    r = admin.post("/api/espacios", json={"nombre": "Sin CSRF", "tipo": "aula", "aforo": 10})
    assert r.status_code == 403 and r.json()["codigo"] == "AUTH-CSRF"


def test_escritura_desde_otro_origen_responde_403(client):
    r = client.post("/api/auth/login", json={"usuario": "ana", "clave": "clave-ana"},
                    headers={"Origin": "https://sitio-malicioso.example"})
    assert r.status_code == 403 and r.json()["codigo"] == "AUTH-ORIGEN"


def test_rutas_publicas_no_piden_sesion(client):
    for ruta in ("/api/health", "/api/catalogos", "/api/reglas", "/api/auth/politica"):
        assert client.get(ruta).status_code == 200, ruta


def test_hash_no_guarda_la_clave_en_claro():
    h = seguridad.hashear_clave("secreta")
    assert h.startswith("$argon2id$") and "secreta" not in h
    assert seguridad.verificar_clave("secreta", h) and not seguridad.verificar_clave("otra", h)


# ---------- Roles ----------

def test_usuario_puede_consultar(ana, cosmos):
    for ruta in ("/api/espacios", "/api/recursos", "/api/reservas"):
        assert ana.get(ruta).status_code == 200


@pytest.mark.parametrize("metodo,ruta,cuerpo", [
    ("post", "/api/espacios", {"nombre": "Nueva", "tipo": "aula", "aforo": 10}),
    ("patch", "/api/espacios/cosmos", {"aforo": 30}),
    ("post", "/api/recursos", {"id": "PC-99", "tipo": "portatil"}),
    ("patch", "/api/recursos/PC-01/estado", {"estado": "mantenimiento"}),
    ("get", "/api/auditoria", None),
    ("get", "/api/datos/reporte", None),
    ("get", "/api/admin/usuarios", None),
    ("post", "/api/admin/usuarios", {"nombre": "Eva Ruiz", "usuario": "eva", "clave": CLAVE_NUEVA, "rol": "admin"}),
    ("patch", "/api/admin/usuarios/ana", {"rol": "admin"}),
])
def test_usuario_no_puede_acciones_de_admin(ana, cosmos, metodo, ruta, cuerpo):
    r = getattr(ana, metodo)(ruta, **({"json": cuerpo} if cuerpo else {}))
    assert r.status_code == 403 and r.json()["codigo"] == "AUTH-403"


def test_admin_puede_acciones_de_admin(admin, cosmos):
    assert admin.patch("/api/recursos/PC-01/estado", json={"estado": "mantenimiento"}).status_code == 200


# ---------- A su nombre / solo propias ----------

def reservar(c, solicitante, desde=10):
    return c.post("/api/reservas", json={
        "espacio_id": "cosmos", "solicitante": solicitante, "inicio": a(desde), "fin": a(desde + 1), "asistentes": 5})


def test_usuario_reserva_a_su_nombre_y_no_a_nombre_de_otro(ana, cosmos):
    assert reservar(ana, " ana ").status_code == 201
    r = reservar(ana, "Beto", desde=12)
    assert r.status_code == 403 and "a tu nombre" in r.json()["mensaje"]


def test_usuario_no_pide_prestamos_a_nombre_de_otro(ana, cosmos):
    r = ana.post("/api/prestamos", json={"recurso_id": "PC-01", "solicitante": "Beto", "devolucion_esperada": a(18)})
    assert r.status_code == 403


def test_admin_puede_reservar_por_cualquiera(admin, cosmos):
    assert reservar(admin, "Beto").status_code == 201


def test_usuario_solo_cancela_sus_reservas(admin, ana, cosmos):
    de_beto = reservar(admin, "Beto").json()["id"]
    de_ana = reservar(ana, "Ana", desde=12).json()["id"]
    assert ana.post(f"/api/reservas/{de_beto}/cancelar").status_code == 403
    assert ana.post(f"/api/reservas/{de_ana}/cancelar").status_code == 200
    assert admin.post(f"/api/reservas/{de_beto}/cancelar").status_code == 200


def test_las_reglas_de_negocio_siguen_aplicando_con_sesion(ana, cosmos):
    reservar(ana, "Ana")
    r = reservar(ana, "Ana")
    assert r.status_code == 409 and r.json()["codigo"] == "RN-01"


def test_la_auditoria_registra_quien_hizo_el_cambio(admin, ana, cosmos):
    reserva = reservar(ana, "Ana").json()["id"]
    historial = admin.get("/api/auditoria", params={"entidad": "reserva", "id": str(reserva)}).json()
    assert historial[0]["actor"] == "Ana"
    recurso = admin.get("/api/auditoria", params={"entidad": "recurso", "id": "PC-01"}).json()
    assert recurso[0]["actor"] == "Administración"


# ---------- Administración de cuentas ----------

def test_admin_lista_usuarios_sin_hashes(admin):
    r = admin.get("/api/admin/usuarios")
    assert r.status_code == 200 and {u["usuario"] for u in r.json()} >= {"admin", "ana", "beto"}
    assert "clave" not in r.text and "argon2" not in r.text


def test_admin_crea_otro_admin(admin):
    r = admin.post("/api/admin/usuarios", json={
        "nombre": "Eva Ruiz", "usuario": "eva", "email": "eva@campus.co", "clave": CLAVE_NUEVA, "rol": "admin"})
    assert r.status_code == 201 and r.json()["rol"] == "admin"
    assert entrar("eva", CLAVE_NUEVA).get("/api/admin/usuarios").status_code == 200


def test_desactivar_cuenta_cierra_sus_sesiones(admin, ana):
    assert admin.patch("/api/admin/usuarios/ana", json={"activo": False}).status_code == 200
    assert ana.get("/api/espacios").status_code == 401


def test_cambio_de_rol_exige_volver_a_iniciar_sesion(admin, ana):
    assert admin.patch("/api/admin/usuarios/ana", json={"rol": "admin"}).status_code == 200
    assert ana.get("/api/espacios").status_code == 401
    assert entrar("ana", "clave-ana").get("/api/admin/usuarios").status_code == 200


def test_admin_no_puede_quitarse_el_rol_ni_desactivarse(admin):
    for cambio in ({"rol": "usuario"}, {"activo": False}):
        r = admin.patch("/api/admin/usuarios/admin", json=cambio)
        assert r.status_code == 409 and r.json()["codigo"] == "ADMIN-409"


# ---------- Registro público ----------

def registro(client, **extra):
    datos = {"nombre": "Carla Gómez", "usuario": "carla", "email": "carla@campus.co",
             "clave": CLAVE_NUEVA, "confirmacion": CLAVE_NUEVA, **extra}
    return client.post("/api/auth/registro", json=datos)


def test_registro_publico_crea_un_usuario_normal_con_hash(client, engine):
    r = registro(client)
    assert r.status_code == 201 and r.json()["rol"] == "usuario"
    with Session(engine) as s:
        guardado = s.get(Usuario, "carla").clave_hash
    assert guardado.startswith("$argon2id$") and CLAVE_NUEVA not in guardado
    assert entrar("carla", CLAVE_NUEVA).get("/api/admin/usuarios").status_code == 403


@pytest.mark.parametrize("extra", [{"rol": "admin"}, {"activo": True}])
def test_registro_publico_no_acepta_rol_ni_otros_campos(client, extra):
    r = registro(client, **extra)
    assert r.status_code == 422


@pytest.mark.parametrize("extra,fragmento", [
    ({"confirmacion": "OtraClave2026x"}, "no coinciden"),
    ({"clave": "corta1A", "confirmacion": "corta1A"}, "al menos"),
    ({"clave": "sinnumerosaqui", "confirmacion": "sinnumerosaqui"}, "número"),
    ({"clave": "Carla2026segura", "confirmacion": "Carla2026segura"}, "nombre de usuario"),
])
def test_registro_valida_la_clave(client, extra, fragmento):
    r = registro(client, **extra)
    assert r.status_code == 409 and fragmento in r.json()["mensaje"]


@pytest.mark.parametrize("extra,campo", [({"email": "no-es-correo"}, "email"), ({"usuario": "a b"}, "usuario"),
                                         ({"nombre": ""}, "nombre")])
def test_registro_valida_formatos(client, extra, campo):
    r = registro(client, **extra)
    assert r.status_code == 422 and r.json()["detalles"][0]["campo"] == campo


@pytest.mark.parametrize("extra,codigo", [
    ({"usuario": "ana"}, "AUTH-USUARIO-EN-USO"),
    ({"email": "ANA@campus.co"}, "AUTH-EMAIL-EN-USO"),
    ({"nombre": "ana"}, "AUTH-NOMBRE-EN-USO"),
])
def test_registro_rechaza_duplicados(client, extra, codigo):
    r = registro(client, **extra)
    assert r.status_code == 409 and r.json()["codigo"] == codigo


# ---------- Recuperación de contraseña ----------

@pytest.fixture
def buzon(monkeypatch):
    """Sustituye el envío real de correo y guarda los mensajes (solo en pruebas)."""
    enviados: list[dict] = []
    monkeypatch.setattr(correo, "enviar", lambda para, asunto, texto: enviados.append({"para": para, "texto": texto}))
    return enviados


def token_de(mensaje: dict) -> str:
    return re.search(r"token=([\w-]+)", mensaje["texto"]).group(1)


def test_recuperar_responde_igual_exista_o_no_la_cuenta(client, buzon):
    existe = client.post("/api/auth/recuperar", json={"email": "ana@campus.co"})
    no_existe = client.post("/api/auth/recuperar", json={"email": "nadie@campus.co"})
    assert existe.status_code == no_existe.status_code == 202
    assert existe.json() == no_existe.json()
    assert [m["para"] for m in buzon] == ["ana@campus.co"]


def test_restablecer_cambia_la_clave_revoca_sesiones_y_el_enlace_es_de_un_uso(client, buzon, ana):
    client.post("/api/auth/recuperar", json={"email": "ana@campus.co"})
    token = token_de(buzon[0])
    cuerpo = {"token": token, "clave": CLAVE_NUEVA, "confirmacion": CLAVE_NUEVA}
    assert client.post("/api/auth/restablecer", json=cuerpo).status_code == 200
    assert ana.get("/api/espacios").status_code == 401                      # sesión anterior revocada
    assert login(client, "ana", "clave-ana").status_code == 401
    assert login(client, "ana", CLAVE_NUEVA).status_code == 200
    r = client.post("/api/auth/restablecer", json=cuerpo)                   # segundo uso
    assert r.status_code == 409 and r.json()["codigo"] == "AUTH-TOKEN-INVALIDO"


def test_enlace_caducado_no_sirve(client, buzon, engine):
    client.post("/api/auth/recuperar", json={"email": "ana@campus.co"})
    with Session(engine) as s:
        for t in s.exec(select(TokenRecuperacion)):
            t.expira_en = datetime.now() - timedelta(minutes=1)
            s.add(t)
        s.commit()
    r = client.post("/api/auth/restablecer",
                    json={"token": token_de(buzon[0]), "clave": CLAVE_NUEVA, "confirmacion": CLAVE_NUEVA})
    assert r.status_code == 409


def test_sin_servicio_de_correo_no_finge_el_envio(client, monkeypatch):
    monkeypatch.setattr(settings, "CORREO_MODO", "")
    assert correo.configurado() is False
    assert client.get("/api/auth/politica").json()["recuperacion_disponible"] is False
    with pytest.raises(correo.CorreoNoConfigurado):
        correo.enviar("ana@campus.co", "x", "y")


# ---------- Migración y cobertura de la tabla de permisos ----------

def test_migracion_agrega_columnas_sin_perder_cuentas():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    with engine.begin() as con:   # esquema de usuarios de la versión anterior
        con.execute(text("CREATE TABLE usuarios (usuario VARCHAR PRIMARY KEY, nombre VARCHAR, rol VARCHAR, "
                         "clave_hash VARCHAR, activo BOOLEAN)"))
        con.execute(text("INSERT INTO usuarios VALUES ('ana', 'Ana', 'usuario', 'x', 1)"))
    assert "usuarios.email" in migrar(engine)
    assert migrar(engine) == []   # idempotente
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        ana = s.get(Usuario, "ana")
        assert ana.nombre == "Ana" and ana.email is None


def test_las_rutas_de_la_tabla_de_permisos_existen():
    """Toda ruta escrita en la tabla de permisos existe: un error de tipeo dejaría esa acción sin proteger."""
    rutas = {(m, r.path) for r in app.routes if getattr(r, "path", "").startswith("/api") for m in getattr(r, "methods", [])}
    declaradas = permisos.PUBLICAS | permisos.SOLO_ADMIN | permisos.A_SU_NOMBRE | permisos.SOLO_PROPIAS
    assert declaradas - rutas <= {("PATCH", "/api/incidencias/{incidencia_id}")}, declaradas - rutas


def test_toda_ruta_de_administracion_esta_protegida():
    rutas = {(m, r.path) for r in app.routes if getattr(r, "path", "").startswith(permisos.PREFIJO_ADMIN)
             for m in getattr(r, "methods", [])}
    assert rutas and rutas <= permisos.SOLO_ADMIN
