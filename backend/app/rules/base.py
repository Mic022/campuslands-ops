"""Resultado estándar de una regla de negocio."""
from dataclasses import dataclass


@dataclass(frozen=True)
class ResultadoRegla:
    ok: bool
    codigo: str = ""
    mensaje: str = ""


OK = ResultadoRegla(ok=True)


class ReglaNegocioError(Exception):
    """Se lanza desde los servicios cuando una regla falla; la API responde 409."""

    def __init__(self, resultado: ResultadoRegla):
        super().__init__(resultado.mensaje)
        self.resultado = resultado


class NoEncontradoError(Exception):
    """Entidad inexistente; la API responde 404."""


class _ErrorConCodigo(Exception):
    codigo = "ERR"

    def __init__(self, mensaje: str, codigo: str | None = None):
        super().__init__(mensaje)
        if codigo:
            self.codigo = codigo


class NoAutenticadoError(_ErrorConCodigo):
    """Sin sesión, sesión caducada/revocada o credenciales inválidas; la API responde 401."""

    codigo = "AUTH-401"


class PermisoError(_ErrorConCodigo):
    """El usuario no tiene permiso para esta acción; la API responde 403."""

    codigo = "AUTH-403"


class DemasiadosIntentosError(_ErrorConCodigo):
    """Límite de intentos superado (fuerza bruta); la API responde 429 con Retry-After."""

    codigo = "AUTH-429"

    def __init__(self, mensaje: str, reintentar_en_s: int):
        super().__init__(mensaje)
        self.reintentar_en_s = reintentar_en_s
