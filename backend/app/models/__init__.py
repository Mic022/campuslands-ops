"""Tablas SQLModel. Importar aquí cada modelo para que crear_tablas() lo registre."""
from datetime import date, datetime, time

from sqlmodel import Field, SQLModel

from app.config.catalogos import EstadoEspacio, EstadoReserva


class Sala(SQLModel, table=True):
    id: str = Field(primary_key=True, max_length=40)
    nombre: str
    tipo: str
    descripcion: str
    capacidad: int
    equipamiento: str = "[]"  # lista JSON
    color: str
    estado: EstadoEspacio = EstadoEspacio.disponible
    motivo_bloqueo: str | None = None
    actualizada_en: datetime = Field(default_factory=datetime.now)


class Reserva(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    sala_id: str = Field(foreign_key="sala.id", index=True)
    solicitante: str
    fecha: date = Field(index=True)
    hora_inicio: time
    hora_fin: time
    asistentes: int
    motivo: str
    estado: EstadoReserva = EstadoReserva.activa
    # Solo se guarda el hash; el token en claro se entrega una vez al crear la reserva.
    token_hash: str
    creada_en: datetime = Field(default_factory=datetime.now)
    cancelada_en: datetime | None = None
