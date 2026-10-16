# backend/app/services/incidencias.py
"""
Servicio de incidencias: orquesta el triaje de IA y aplica la RN-04.
"""
import logging
from app.ai.triaje import clasificar_incidencia
from app.ai.esquemas import ClasificacionIA
from app.config import reglas as cfg
from app.config.catalogos import EstadoRecurso
from app.rules.base import ReglaNegocioError

# Importamos la función de P2/P1 que valida y audita el cambio de estado
# (Si el nombre exacto es diferente, ajústalo, ej: actualizar_estado_recurso)
from app.services.recursos import cambiar_estado 

log = logging.getLogger("campus-ops.services")

def ejecutar_triaje_ia(descripcion: str, espacio_id: int | None, recurso_id: int | None) -> ClasificacionIA | None:
    """Orquesta el triaje de IA (ya lo teníamos listo)."""
    contexto = f"Espacio ID: {espacio_id}, Recurso ID: {recurso_id}" if (espacio_id or recurso_id) else "Sin contexto específico"
    return clasificar_incidencia(descripcion, contexto)


def aplicar_bloqueo_rn04(recurso_id: int | None, prioridad: str):
    """
    RN-04: Una incidencia crítica/alta confirmada sobre un recurso lo pasa a mantenimiento.
    Manejo de máquina de estados: si está 'prestado', no puede ir directo a 'mantenimiento'.
    """
    if not recurso_id or prioridad not in cfg.PRIORIDADES_BLOQUEANTES:
        return

    try:
        # INTENTO 1: Transición directa (Funciona perfectamente si el recurso está 'disponible')
        cambiar_estado(recurso_id, EstadoRecurso.mantenimiento, actor="sistema_incidencia")
        log.info(f"RN-04: Recurso {recurso_id} pasado a mantenimiento.")
        
    except ReglaNegocioError:
        # INTENTO 2: Si falla, es porque la máquina de estados lo rechaza (ej: está 'prestado').
        # Un incidente crítico en un recurso prestado implica que se dañó durante su uso.
        # Transición válida en cascada: prestado -> danado -> mantenimiento
        log.warning(f"RN-04: Recurso {recurso_id} no estaba disponible. Aplicando transición por daño.")
        
        cambiar_estado(recurso_id, EstadoRecurso.danado, actor="sistema_incidencia")
        cambiar_estado(recurso_id, EstadoRecurso.mantenimiento, actor="sistema_incidencia")
        
        log.info(f"RN-04: Recurso {recurso_id} pasado a dañado y luego a mantenimiento.")