# backend/app/api/incidencias.py
"""
Endpoints de incidencias: triaje inteligente con IA y gestión del ciclo de vida.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from sqlmodel import Session
from pydantic import BaseModel, Field
from app.db import get_session
from app.services.incidencias import ejecutar_triaje_ia, confirmar_incidencia
from app.ai.esquemas import ClasificacionIA

router = APIRouter(prefix="/api/incidencias", tags=["Incidencias"])


class SolicitudTriaje(BaseModel):
    descripcion: str = Field(..., min_length=10, max_length=1000, description="Texto libre del usuario")
    espacio_id: str | None = Field(None, description="ID del espacio afectado")
    recurso_id: str | None = Field(None, description="ID del recurso afectado")


@router.post("/triaje", status_code=status.HTTP_200_OK)
async def triaje_inteligente(payload: SolicitudTriaje):
    """Endpoint para clasificar una incidencia usando IA (propuesta)."""
    try:
        resultado = ejecutar_triaje_ia(
            descripcion=payload.descripcion,
            espacio_id=payload.espacio_id,
            recurso_id=payload.recurso_id
        )
        
        if resultado is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"codigo": "IA-503", "mensaje": "El servicio de triaje inteligente no está disponible. Por favor, use el triaje manual."}
            )
            
        return {
            "status": "success",
            "data": resultado.model_dump(),
            "mensaje": "Triaje completado. Por favor, confirme o ajuste la clasificación."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"codigo": "ERR-500", "mensaje": "Error interno al procesar el triaje."}
        )


# ==============================================================================
# NUEVO: Endpoint para confirmar la incidencia y aplicar RN-04
# ==============================================================================

class ConfirmarIncidencia(BaseModel):
    titulo: str = Field(..., min_length=5, max_length=200)
    descripcion: str = Field(..., min_length=10, max_length=1000)
    espacio_id: str | None = None
    recurso_id: str | None = None
    triaje: ClasificacionIA  # El frontend envía lo que la IA propuso (o el usuario ajustó)


@router.post("/", status_code=status.HTTP_201_CREATED)
def crear_incidencia_confirmada(payload: ConfirmarIncidencia, db: Session = Depends(get_session)):
    """
    Confirma el triaje de IA, guarda la incidencia en la BD y aplica RN-04 
    (bloquea el recurso si la prioridad es crítica o alta).
    """
    try:
        incidencia = confirmar_incidencia(
            db=db,
            titulo=payload.titulo,
            descripcion=payload.descripcion,
            espacio_id=payload.espacio_id,
            recurso_id=payload.recurso_id,
            triaje=payload.triaje,
            actor="usuario_frontend"
        )
        return {
            "status": "success", 
            "data": incidencia.model_dump(), 
            "mensaje": "Incidencia creada y recurso bloqueado si aplica (RN-04)."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"codigo": "ERR-500", "mensaje": f"Error al crear la incidencia: {str(e)}"}
        )
    