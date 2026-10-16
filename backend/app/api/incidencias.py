# Agrega esto al final de backend/app/api/incidencias.py

from app.schemas.incidencias import IncidenciaActualizar, ResolverIncidencia
from app.services.incidencias import cambiar_estado_incidencia, resolver_incidencia
from app.rules.base import NoEncontradoError

# ==============================================================================
# Endpoint para cambiar estado (ej. abierta -> en_proceso)
# ==============================================================================
@router.patch("/{incidencia_id}", status_code=status.HTTP_200_OK)
def actualizar_estado_incidencia(
    incidencia_id: int, 
    payload: IncidenciaActualizar, 
    db: Session = Depends(get_session)
):
    """Cambia el estado de una incidencia y deja registro en auditoría."""
    try:
        incidencia = cambiar_estado_incidencia(
            db=db,
            incidencia_id=incidencia_id,
            nuevo_estado=payload.estado,
            actor="usuario_frontend",
            observacion=payload.observacion
        )
        return {"status": "success", "data": incidencia.model_dump(), "mensaje": "Estado actualizado correctamente."}
    except NoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"codigo": "ERR-404", "mensaje": str(e)})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"codigo": "ERR-500", "mensaje": str(e)})


# ==============================================================================
# Endpoint para resolver la incidencia
# ==============================================================================
@router.post("/{incidencia_id}/resolver", status_code=status.HTTP_200_OK)
def resolver_incidencia_endpoint(
    incidencia_id: int, 
    payload: ResolverIncidencia, 
    db: Session = Depends(get_session)
):
    """Marca una incidencia como resuelta, guarda la solución y la fecha."""
    try:
        incidencia = resolver_incidencia(
            db=db,
            incidencia_id=incidencia_id,
            solucion=payload.solucion,
            actor="usuario_frontend"
        )
        return {"status": "success", "data": incidencia.model_dump(), "mensaje": "Incidencia resuelta exitosamente."}
    except NoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"codigo": "ERR-404", "mensaje": str(e)})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"codigo": "ERR-500", "mensaje": str(e)})