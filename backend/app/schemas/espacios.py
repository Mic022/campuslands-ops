"""Esquemas de entrada de espacios y reservas. Los valores cerrados vienen de config/catalogos.py."""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.config.catalogos import EstadoEspacio, TipoEspacio
from app.schemas.comunes import Texto, a_hora_local


class EspacioCrear(BaseModel):
    nombre: Texto = Field(max_length=80)
    tipo: TipoEspacio
    aforo: int = Field(gt=0, le=10_000)
    estado: EstadoEspacio = EstadoEspacio.disponible
    ubicacion: Texto | None = Field(default=None, max_length=120)


class EspacioActualizar(BaseModel):
    """Todos los campos son opcionales; solo se cambia lo que llega."""

    nombre: Texto | None = Field(default=None, max_length=80)
    tipo: TipoEspacio | None = None
    aforo: int | None = Field(default=None, gt=0, le=10_000)
    estado: EstadoEspacio | None = None
    ubicacion: Texto | None = Field(default=None, max_length=120)


class ReservaCrear(BaseModel):
    espacio_id: Texto
    solicitante: Texto = Field(max_length=120)
    inicio: datetime
    fin: datetime
    asistentes: int = Field(gt=0, le=10_000)

    _hora_local = field_validator("inicio", "fin")(a_hora_local)
