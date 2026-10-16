"""Tipos y validadores compartidos por los esquemas de entrada."""
from datetime import datetime
from typing import Annotated

from pydantic import StringConstraints

from app.ingest.normalizar import ZONA_COLOMBIA

# Texto sin espacios sobrantes y no vacío.
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def a_hora_local(valor: datetime | None) -> datetime | None:
    """La BD guarda hora local de Colombia sin zona (decisión de la ingesta).

    Si el cliente manda una fecha con zona ('...Z' o '-05:00'), se convierte a hora
    local; si llega sin zona, se asume que ya es hora local.
    """
    if valor is None:
        return None
    if valor.tzinfo is not None:
        valor = valor.astimezone(ZONA_COLOMBIA).replace(tzinfo=None)
    return valor.replace(microsecond=0)
