"""Esquemas de entrada de la API de salas y reservas."""
from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field


class ReservaCrear(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    sala_id: str = Field(min_length=1, max_length=40)
    solicitante: str = Field(min_length=2, max_length=80)
    fecha: date
    hora_inicio: time
    hora_fin: time
    asistentes: int = Field(ge=1, le=500)
    motivo: str = Field(min_length=3, max_length=300)


class TokensReserva(BaseModel):
    tokens: list[str] = Field(default_factory=list, max_length=200)


class CambioMantenimiento(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    activo: bool
    motivo: str | None = Field(default=None, max_length=200)
