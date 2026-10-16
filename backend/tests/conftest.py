import os

os.environ["DATABASE_URL"] = "sqlite:///./test_campus.db"

import pytest  # noqa: E402

from app.auth.dependencias import autorizar  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Usuario  # noqa: E402

ADMIN_PRUEBAS = Usuario(usuario="admin", nombre="Admin pruebas", rol="admin", clave_hash="-")


def pytest_configure(config):
    config.addinivalue_line("markers", "autenticacion_real: usa el login real en vez de la sesión de admin de pruebas")


@pytest.fixture(autouse=True)
def sesion_admin(request):
    """Las pruebas de reglas y endpoints corren como admin; las de login usan autenticación real."""
    if request.node.get_closest_marker("autenticacion_real"):
        yield
        return
    app.dependency_overrides[autorizar] = lambda: ADMIN_PRUEBAS
    yield
    app.dependency_overrides.pop(autorizar, None)
