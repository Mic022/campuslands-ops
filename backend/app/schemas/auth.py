"""Esquemas de autenticación y gestión de usuarios.

- Las entradas públicas prohíben campos extra (422): nadie puede colar "rol" o "activo" en el registro.
- Las salidas nunca incluyen el hash de la clave, tokens de sesión ni contadores internos.
"""
import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.auth.seguridad import MAX_LARGO_CLAVE

# (?i): el patrón se evalúa antes de pasar a minúsculas.
USUARIO_PATRON = r"(?i)^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$"
EMAIL_PATRON = (
    r"(?i)^[a-z0-9.!#&'*+=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
    r"(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$"
)

# La clave no se recorta (los espacios forman parte de ella); solo se limita el tamaño.
Clave = Annotated[str, StringConstraints(min_length=1, max_length=MAX_LARGO_CLAVE)]
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=120)]
NombreUsuario = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=USUARIO_PATRON)]
Email = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, max_length=254, pattern=EMAIL_PATRON)]
Rol = Literal["admin", "usuario"]


def _normalizar_nombre(valor: str) -> str:
    valor = " ".join(valor.split())
    if re.search(r"[<>{}\[\]\\/@$%^*=|~`\"]", valor):
        raise ValueError("El nombre contiene caracteres no permitidos.")
    return valor


class _Estricto(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Credenciales(_Estricto):
    usuario: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=1, max_length=254)]
    clave: Clave
    recordar: bool = False


class RegistroEntrada(_Estricto):
    nombre: Nombre
    usuario: NombreUsuario
    email: Email
    clave: Clave
    confirmacion: Clave

    _nombre = field_validator("nombre")(_normalizar_nombre)


class RecuperarEntrada(_Estricto):
    email: Email


class RestablecerEntrada(_Estricto):
    token: Annotated[str, StringConstraints(strip_whitespace=True, min_length=20, max_length=200)]
    clave: Clave
    confirmacion: Clave


class UsuarioCrearAdmin(_Estricto):
    """Alta administrativa: el único camino para crear una cuenta con rol admin."""

    nombre: Nombre
    usuario: NombreUsuario
    email: Email | None = None
    clave: Clave
    rol: Rol = "usuario"

    _nombre = field_validator("nombre")(_normalizar_nombre)


class UsuarioActualizarAdmin(_Estricto):
    nombre: Nombre | None = None
    rol: Rol | None = None
    activo: bool | None = None

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v: str | None) -> str | None:
        return None if v is None else _normalizar_nombre(v)


class UsuarioPublico(BaseModel):
    usuario: str
    nombre: str
    email: str | None
    rol: Rol


class UsuarioAdminVista(UsuarioPublico):
    activo: bool
    bloqueado: bool
    ultimo_acceso: datetime | None
    creado_en: datetime | None


class SesionSalida(BaseModel):
    usuario: UsuarioPublico
    csrf_token: str
    expira_en: datetime
