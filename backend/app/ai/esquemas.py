# backend/app/ai/esquemas.py
"""
Esquema de salida de la IA para el triaje de incidencias.
Si el LLM devuelve algo fuera de los enums, Pydantic lo rechaza.
"""
from pydantic import BaseModel, Field
from app.config.catalogos import Categoria, Prioridad, Area


class ClasificacionIA(BaseModel):
    categoria: Categoria
    prioridad: Prioridad
    area_responsable: Area
    justificacion: str = Field(
        min_length=15, 
        max_length=300, 
        description="Razón breve y objetiva de la clasificación"
    )
    confianza: float = Field(
        ge=0.0, 
        le=1.0, 
        description="Nivel de confianza del modelo entre 0.0 y 1.0"
    )