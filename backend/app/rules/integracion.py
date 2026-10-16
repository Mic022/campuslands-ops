# backend/app/rules/integracion.py
"""
Regla integradora RN-04: Bloqueo por estado o incidencia abierta.
No se asignan espacios o recursos inhabilitados, en mantenimiento 
o con incidencia abierta de prioridad alta o crítica.
"""
from app.config import reglas as cfg
from app.config.catalogos import EstadoEspacio, EstadoRecurso
from app.rules.base import ResultadoRegla, OK


def rn04_bloqueo_por_incidencia_o_estado(espacio, recurso=None, incidencias_abiertas=None) -> ResultadoRegla:
    """
    Valida que un espacio o recurso pueda ser asignado/prestado.
    
    Args:
        espacio: Objeto o dict con 'estado' y 'nombre' del espacio.
        recurso: (Opcional) Objeto o dict con 'estado' y 'serial' del recurso.
        incidencias_abiertas: (Opcional) Lista de incidencias abiertas asociadas.
    
    Returns:
        ResultadoRegla: OK si pasa todas las validaciones, o error con código RN-04.
    """
    incidencias_abiertas = incidencias_abiertas or []
    
    # 1. Validar estado base del espacio
    if espacio.estado in [EstadoEspacio.mantenimiento, EstadoEspacio.inhabilitado]:
        return ResultadoRegla(
            False, "RN-04", 
            f"El espacio '{espacio.nombre}' está en estado '{espacio.estado.value}' y no puede reservarse."
        )
    
    # 2. Validar estado base del recurso (si se está intentando prestar)
    if recurso and recurso.estado in [EstadoRecurso.mantenimiento, EstadoRecurso.danado, EstadoRecurso.baja]:
        return ResultadoRegla(
            False, "RN-04", 
            f"El recurso '{recurso.serial}' está en estado '{recurso.estado.value}' y no puede prestarse."
        )
    
    # 3. Validar incidencias abiertas bloqueantes (la magia de la integración)
    for inc in incidencias_abiertas:
        # Extraer el valor de prioridad (puede ser Enum o string)
        prioridad_str = inc.prioridad.value if hasattr(inc.prioridad, 'value') else inc.prioridad
        
        # Verificar si está en las prioridades bloqueantes (definidas en reglas.py)
        if prioridad_str in cfg.PRIORIDADES_BLOQUEANTES:  # {"critica", "alta"}
            return ResultadoRegla(
                False, "RN-04",
                f"Operación bloqueada: Existe una incidencia {prioridad_str} abierta (ID: {inc.id}) asociada a este recurso/espacio."
            )
            
    return OK