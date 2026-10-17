# backend/app/schemas/incidencias.py
"""Esquemas de validación de entrada para incidencias."""
from pydantic import BaseModel, Field

from app.ai.esquemas import ClasificacionIA
from app.config import reglas as cfg
from app.config.catalogos import Area, Categoria, EstadoIncidencia, Prioridad
from app.schemas.comunes import Texto, texto_entre


class SolicitudTriaje(BaseModel):
    """Texto libre a clasificar. No guarda nada."""
    descripcion: texto_entre(10, cfg.MAX_LARGO_DESCRIPCION)
    espacio_id: Texto | None = None
    recurso_id: Texto | None = None


class TriajeRespuesta(ClasificacionIA):
    """Propuesta de la IA más la indicación de si exige revisión humana."""
    requiere_revision: bool


class IncidenciaCrear(BaseModel):
    """Incidencia confirmada por la persona.

    `propuesta_ia` es lo que devolvió /triaje (si se usó). El backend compara la
    clasificación final con la propuesta para decidir si el triaje fue 'ia' o 'manual'.
    """
    titulo: texto_entre(5, 120)
    descripcion: texto_entre(10, cfg.MAX_LARGO_DESCRIPCION)
    espacio_id: Texto | None = None
    recurso_id: Texto | None = None
    categoria: Categoria
    prioridad: Prioridad
    area_responsable: Area
    propuesta_ia: ClasificacionIA | None = None


class IncidenciaActualizar(BaseModel):
    """Cambio de estado (abierta → en_proceso → resuelta)."""
    estado: EstadoIncidencia
    observacion: Texto | None = Field(default=None, max_length=500, description="Motivo del cambio o solución aplicada")
