"""Esquemas de entrada de recursos, préstamos y devoluciones."""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.config.catalogos import EstadoRecurso
from app.schemas.comunes import Texto, a_hora_local


class RecursoCrear(BaseModel):
    id: Texto = Field(max_length=40, pattern=r"^[A-Za-z0-9_\-]+$")
    tipo: Texto = Field(max_length=60)
    nombre: Texto | None = Field(default=None, max_length=120)
    serial: Texto | None = Field(default=None, max_length=80)
    espacio_id: Texto | None = None


class RecursoActualizar(BaseModel):
    """Datos descriptivos. El estado se cambia solo por /estado (RN-03)."""

    tipo: Texto | None = Field(default=None, max_length=60)
    nombre: Texto | None = Field(default=None, max_length=120)
    serial: Texto | None = Field(default=None, max_length=80)
    espacio_id: Texto | None = None


class CambioEstadoRecurso(BaseModel):
    estado: EstadoRecurso
    motivo: Texto | None = Field(default=None, max_length=300)


class PrestamoCrear(BaseModel):
    recurso_id: Texto
    solicitante: Texto = Field(max_length=120)
    devolucion_esperada: datetime
    salida: datetime | None = None          # por defecto, ahora

    _hora_local = field_validator("devolucion_esperada", "salida")(a_hora_local)


class DevolucionCrear(BaseModel):
    # Estado en que vuelve el recurso; RN-07 valida que la transición desde 'prestado' exista (RN-03).
    estado_recurso: EstadoRecurso = EstadoRecurso.disponible
    observacion: Texto | None = Field(default=None, max_length=300)
    fecha: datetime | None = None           # por defecto, ahora

    _hora_local = field_validator("fecha")(a_hora_local)
