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
