# backend/app/services/incidencias.py
"""
Servicio de incidencias: orquesta el triaje de IA, persistencia y RN-04.
"""
from sqlmodel import Session
from app.ai.triaje import clasificar_incidencia
from app.ai.esquemas import ClasificacionIA
from app.config.catalogos import EstadoIncidencia, OrigenTriaje, EstadoRecurso
from app.models import Incidencia, ahora
from app.schemas.recursos import CambioEstadoRecurso
from app.services.recursos import cambiar_estado
from app.rules.base import ReglaNegocioError


def ejecutar_triaje_ia(descripcion: str, espacio_id: str | None, recurso_id: str | None) -> ClasificacionIA | None:
    """Orquesta el triaje de IA con contexto."""
    contexto = f"Espacio ID: {espacio_id}, Recurso ID: {recurso_id}" if (espacio_id or recurso_id) else "Sin contexto específico"
    return clasificar_incidencia(descripcion, contexto)


def aplicar_bloqueo_rn04(db: Session, recurso_id: str | None, prioridad: str, actor: str = "sistema_incidencia"):
    """
    RN-04: Una incidencia crítica/alta confirmada sobre un recurso lo pasa a mantenimiento.
    Manejo de máquina de estados: si está 'prestado', no puede ir directo a 'mantenimiento'.
    """
    if not recurso_id or prioridad not in {"critica", "alta"}:
        return
    
    try:
        # INTENTO 1: Transición directa (Funciona si el recurso está 'disponible')
        cambiar_estado(
            db, 
            recurso_id, 
            CambioEstadoRecurso(estado=EstadoRecurso.mantenimiento, motivo="Bloqueo por incidencia crítica/alta (RN-04)"), 
            actor=actor
        )
    except ReglaNegocioError:
        # INTENTO 2: Si falla, es porque la máquina de estados lo rechaza (ej: está 'prestado').
        # Un incidente crítico en un recurso prestado implica que se dañó durante su uso.
        # Transición válida en cascada: prestado -> danado -> mantenimiento
        cambiar_estado(
            db, 
            recurso_id, 
            CambioEstadoRecurso(estado=EstadoRecurso.danado, motivo="Daño reportado por incidencia crítica (RN-04)"), 
            actor=actor
        )
        cambiar_estado(
            db, 
            recurso_id, 
            CambioEstadoRecurso(estado=EstadoRecurso.mantenimiento, motivo="Paso a mantenimiento tras daño (RN-04)"), 
            actor=actor
        )


def confirmar_incidencia(
    db: Session, 
    titulo: str, 
    descripcion: str, 
    espacio_id: str | None, 
    recurso_id: str | None, 
    triaje: ClasificacionIA, 
    actor: str = "usuario"
) -> Incidencia:
    """Crea la incidencia con la clasificación confirmada y aplica RN-04 si aplica."""
    incidencia = Incidencia(
        titulo=titulo,
        descripcion=descripcion,
        categoria=triaje.categoria.value,
        prioridad=triaje.prioridad.value,
        area_responsable=triaje.area_responsable.value,
        estado=EstadoIncidencia.abierta.value,
        espacio_id=espacio_id,
        recurso_id=recurso_id,
        origen_triaje=OrigenTriaje.ia.value,
        confianza_ia=triaje.confianza,
        justificacion_ia=triaje.justificacion,
        creada_en=ahora()
    )
    
    db.add(incidencia)
    db.flush()  # Para obtener el ID antes del commit
    
    # Aplicar RN-04 (bloquear recurso si es crítica/alta)
    aplicar_bloqueo_rn04(db, recurso_id, triaje.prioridad.value, actor=f"incidencia_{incidencia.id}")
    
    db.commit()
    db.refresh(incidencia)
    return incidencia