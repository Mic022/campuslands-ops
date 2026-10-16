# Agrega esto al final de backend/app/services/incidencias.py

from app.models import Incidencia, ahora
from app.repositories.auditoria import auditar
from app.rules.base import NoEncontradoError
from app.config.catalogos import EstadoIncidencia

def cambiar_estado_incidencia(
    db: Session, 
    incidencia_id: int, 
    nuevo_estado: str, 
    actor: str = "usuario", 
    observacion: str | None = None
) -> Incidencia:
    """Cambia el estado de una incidencia y registra la auditoría."""
    incidencia = db.get(Incidencia, incidencia_id)
    if not incidencia:
        raise NoEncontradoError(f"No existe la incidencia con ID {incidencia_id}.")
    
    estado_anterior = incidencia.estado
    # Aseguramos que sea un string válido del enum
    estado_str = nuevo_estado.value if hasattr(nuevo_estado, 'value') else nuevo_estado
    incidencia.estado = estado_str
    
    detalle = observacion or f"Cambio de estado a {estado_str}"
    auditar(db, "incidencia", str(incidencia_id), "cambiar_estado", estado_anterior, estado_str, actor, detalle)
    
    db.commit()
    db.refresh(incidencia)
    return incidencia


def resolver_incidencia(
    db: Session, 
    incidencia_id: int, 
    solucion: str, 
    actor: str = "usuario"
) -> Incidencia:
    """Marca una incidencia como resuelta, guarda la solución y la fecha."""
    incidencia = db.get(Incidencia, incidencia_id)
    if not incidencia:
        raise NoEncontradoError(f"No existe la incidencia con ID {incidencia_id}.")
    
    estado_anterior = incidencia.estado
    incidencia.estado = EstadoIncidencia.resuelta.value
    incidencia.resuelta_en = ahora()
    
    auditar(db, "incidencia", str(incidencia_id), "resolver", estado_anterior, EstadoIncidencia.resuelta.value, actor, solucion)
    
    db.commit()
    db.refresh(incidencia)
    return incidencia