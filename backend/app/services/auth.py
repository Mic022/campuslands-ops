"""Usuarios de prueba e inicio de sesión."""
import secrets

from sqlmodel import Session

from app.auth.seguridad import hashear_clave, verificar_clave
from app.config import settings
from app.config.permisos import ROL_ADMIN, ROL_USUARIO
from app.models import Usuario
from app.rules.base import NoAutenticadoError

_HASH_SEÑUELO = hashear_clave(secrets.token_urlsafe(16))


def sembrar_usuarios(db: Session) -> dict[str, str]:
    """Crea los usuarios de prueba que falten. Devuelve las claves que tuvo que generar (no definidas en .env)."""
    generadas: dict[str, str] = {}

    def asegurar(usuario: str, nombre: str, rol: str, clave: str) -> None:
        if db.get(Usuario, usuario):
            return
        if not clave:
            clave = secrets.token_urlsafe(9)
            generadas[usuario] = clave
        db.add(Usuario(usuario=usuario, nombre=nombre, rol=rol, clave_hash=hashear_clave(clave)))

    asegurar(settings.ADMIN_USUARIO, settings.ADMIN_NOMBRE, ROL_ADMIN, settings.ADMIN_CLAVE)
    for usuario in settings.USUARIOS_DEMO:
        asegurar(usuario, usuario.capitalize(), ROL_USUARIO, settings.USUARIO_CLAVE)
    db.commit()
    return generadas


def autenticar(db: Session, usuario: str, clave: str) -> Usuario:
    encontrado = db.get(Usuario, usuario.strip())
    # Se verifica siempre contra algún hash para no revelar por el tiempo de respuesta si el usuario existe.
    valida = verificar_clave(clave, encontrado.clave_hash if encontrado else _HASH_SEÑUELO)
    if not encontrado or not encontrado.activo or not valida:
        raise NoAutenticadoError("Usuario o clave incorrectos.")
    return encontrado
