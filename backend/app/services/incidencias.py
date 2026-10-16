# backend/app/services/incidencias.py
"""
Servicio de incidencias: orquesta el triaje de IA y la persistencia.
Por ahora solo maneja el triaje; cuando P1 entregue los repositorios,
se conectará a la BD para obtener contexto real.
"""
from app.ai.triaje import clasificar_incidencia
from app.ai.esquemas import ClasificacionIA

# TODO: Cuando P1 entregue los repositorios, descomentar estas líneas
# from app.repositories import espacios as repo_espacios
# from app.repositories import recursos as repo_recursos
# from app.repositories import incidencias as repo_incidencias

def ejecutar_triaje_ia(descripcion: str, espacio_id: int | None, recurso_id: int | None) -> ClasificacionIA | None:
    """
    Orquesta el triaje:
    1. Obtiene el contexto real de la BD (Espacio/Recurso).
    2. Llama al adaptador de IA.
    3. Valida la salida.
    
    Returns:
        ClasificacionIA si la IA responde correctamente, None si falla.
    """
    
    # 1. Construir el contexto (Mock por ahora hasta que P1 entregue los repos)
    contexto = "Contexto no disponible aún (BD en desarrollo)."
    
    # TODO (Cuando P1 termine):
    # if espacio_id:
    #     espacio = repo_espacios.obtener_por_id(espacio_id)
    #     if espacio:
    #         contexto = f"Espacio: {espacio.nombre}, Aforo: {espacio.aforo}"
    # 
    # if recurso_id:
    #     recurso = repo_recursos.obtener_por_id(recurso_id)
    #     if recurso:
    #         contexto += f" | Recurso: {recurso.serial}, Estado: {recurso.estado.value}"
    
    # 2. Llamar a la IA (El adaptador ya maneja los reintentos y la validación de Pydantic)
    resultado_ia = clasificar_incidencia(descripcion, contexto)
    
    # 3. Retornar el resultado (o None si falló, para que la API devuelva 503)
    return resultado_ia