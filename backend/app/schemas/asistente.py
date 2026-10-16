"""Entrada del asistente: la conversación tal como la lleva la UI."""
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.comunes import Texto

MAX_MENSAJES = 20


class MensajeAsistente(BaseModel):
    rol: Literal["usuario", "asistente"]
    texto: Texto = Field(max_length=1000)


class SolicitudAsistente(BaseModel):
    # Se envía la conversación completa para que la IA combine datos de varios mensajes
    # ("para 30" y luego "mañana a las 10"). Solo cuentan los últimos MAX_MENSAJES.
    mensajes: list[MensajeAsistente] = Field(min_length=1, max_length=50)
