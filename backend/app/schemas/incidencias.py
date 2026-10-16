# backend/app/schemas/incidencias.py
"""Esquemas de validación de entrada y salida para incidencias."""
from pydantic import BaseModel, Field
from app.config.catalogos import EstadoIncidencia

class IncidenciaActualizar(BaseModel):
    """Para cambiar el estado de una incidencia (ej. a 'en_proceso')."""
    estado: EstadoIncidencia
    observacion: str | None = Field(default=None, max_length=300, description="Motivo del cambio")

class ResolverIncidencia(BaseModel):
    """Para marcar una incidencia como resuelta."""
    solucion: str = Field(
        ..., 
        min_length=10, 
        max_length=500, 
        description="Descripción breve de cómo se resolvió el problema"
    )