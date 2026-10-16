# backend/app/api/incidencias.py
"""
Endpoints de incidencias: triaje inteligente con IA.
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.services.incidencias import ejecutar_triaje_ia

router = APIRouter(prefix="/api/incidencias", tags=["Incidencias"])


class SolicitudTriaje(BaseModel):
    """Schema de entrada para el triaje de IA."""
    descripcion: str = Field(
        ..., 
        min_length=10, 
        max_length=1000, 
        description="Texto libre del usuario describiendo la incidencia"
    )
    espacio_id: int | None = Field(
        None, 
        description="ID del espacio afectado (opcional, para dar contexto a la IA)"
    )
    recurso_id: int | None = Field(
        None, 
        description="ID del recurso afectado (opcional, para dar contexto a la IA)"
    )


@router.post("/triaje", status_code=status.HTTP_200_OK)
async def triaje_inteligente(payload: SolicitudTriaje):
    """
    Endpoint para clasificar una incidencia usando IA.
    
    Devuelve la propuesta de la IA para que el humano la confirme o ajuste.
    Si la IA falla o devuelve JSON inválido, retorna 503 con mensaje claro.
    """
    try:
        # El servicio se encarga de armar el contexto y llamar a la IA
        resultado = ejecutar_triaje_ia(
            descripcion=payload.descripcion,
            espacio_id=payload.espacio_id,
            recurso_id=payload.recurso_id
        )
        
        if resultado is None:
            # Si la IA falló o devolvió JSON inválido tras los reintentos
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "codigo": "IA-503", 
                    "mensaje": "El servicio de triaje inteligente no está disponible. Por favor, use el triaje manual."
                }
            )
            
        return {
            "status": "success",
            "data": resultado.model_dump(),
            "mensaje": "Triaje completado. Por favor, confirme o ajuste la clasificación."
        }
        
    except HTTPException:
        # Re-lanzar excepciones HTTP (como el 503 de arriba)
        raise
        
    except Exception as e:
        # Manejo global de errores inesperados
        # En producción, aquí harías logging del error real
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "codigo": "ERR-500", 
                "mensaje": "Error interno al procesar el triaje."
            }
        )