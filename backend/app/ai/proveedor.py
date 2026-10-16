"""Adaptador de IA: el resto del código solo conoce la interfaz ProveedorIA.

El proveedor concreto se elige con la variable de entorno IA_PROVEEDOR.
Pendiente: implementar el proveedor autorizado para la jornada.
"""
from typing import Protocol

from app.config import settings


class ErrorProveedor(Exception):
    """La IA no está disponible o respondió con error. La UI ofrece triaje manual."""


class ProveedorIA(Protocol):
    def completar(self, mensajes: list[dict], temperatura: float, timeout_s: int) -> str: ...


def obtener_proveedor() -> ProveedorIA:
    nombre = settings.IA_PROVEEDOR
    if not nombre:
        raise ErrorProveedor("IA no configurada: define IA_PROVEEDOR en .env")
    raise ErrorProveedor(f"Proveedor de IA '{nombre}' aún no implementado")
