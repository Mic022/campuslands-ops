"""El guion de la defensa (scripts/demo_errores.py) obtiene cada código esperado y deja todo como estaba.

Corre con el login real (admin y un usuario), igual que contra la API en vivo.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

import app.models  # noqa: F401
from app.auth.seguridad import hashear_clave
from app.config import reglas as cfg
from app.db import get_session
from app.main import app
from app.models import Espacio, Prestamo, Recurso, Reserva, Usuario
from scripts.demo_errores import Demo, Sesion

pytestmark = pytest.mark.autenticacion_real


@pytest.fixture
def engine():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        s.add(Usuario(usuario="admin", nombre="Administración", rol="admin", clave_hash=hashear_clave("clave-admin")))
        s.add(Usuario(usuario="ana", nombre="Ana", rol="usuario", clave_hash=hashear_clave("clave-ana")))
        s.commit()
    return engine


@pytest.fixture
def transporte(engine):
    def sesion():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = sesion
    client = TestClient(app)

    def enviar(metodo, ruta, cuerpo, cabeceras):
        r = client.request(metodo, ruta, json=cuerpo, headers=cabeceras)
        return r.status_code, (r.json() if r.content else None)

    yield enviar
    app.dependency_overrides.clear()


def correr(transporte, con_usuario: bool = True, **kw) -> Demo:
    admin, ana = Sesion(transporte), Sesion(transporte)
    assert admin.iniciar("admin", "clave-admin")
    assert ana.iniciar("ana", "clave-ana")
    demo = Demo(admin, anonimo=Sesion(transporte), usuario=ana if con_usuario else None, salida=lambda _: None, **kw)
    assert demo.ejecutar(), [(c.esperado, c.obtenido, c.titulo) for c in demo.casos if not c.ok]
    return demo


def test_cada_caso_devuelve_su_codigo(transporte):
    demo = correr(transporte)
    codigos = {c.esperado for c in demo.casos}
    assert {
        "RN-01", "RN-02", "RN-03", "RN-04", "RN-05", "RN-06", "RN-07",
        "AUTH-401", "AUTH-403", "ERR-404", "ERR-409", "ERR-422",
    } <= codigos


def test_deja_todo_como_estaba(transporte, engine):
    correr(transporte)
    with Session(engine) as s:
        assert all(e.estado == "disponible" for e in s.exec(select(Espacio)))
        assert all(r.estado == "disponible" for r in s.exec(select(Recurso)))
        assert not s.exec(select(Prestamo).where(Prestamo.estado == "activo")).all()
        assert not s.exec(select(Reserva).where(Reserva.estado == "activa")).all()


def test_se_puede_correr_dos_veces(transporte):
    correr(transporte)
    correr(transporte)


def test_sin_usuario_omite_los_403(transporte):
    demo = correr(transporte, con_usuario=False)
    assert "AUTH-403" not in {c.esperado for c in demo.casos}


def test_sigue_los_cambios_en_vivo(transporte, monkeypatch):
    monkeypatch.setattr(cfg, "MAX_PRESTAMOS_ACTIVOS", 3)
    monkeypatch.setattr(cfg, "FACTOR_AFORO", 0.5)
    demo = correr(transporte)
    limite = next(c for c in demo.casos if c.titulo == "Superar el límite de préstamos activos")
    assert "el máximo es 3" in limite.respuesta["mensaje"]


def test_filtro_por_codigo(transporte):
    demo = correr(transporte, solo="RN-06")
    assert demo.casos and all(c.esperado == "RN-06" for c in demo.casos)
