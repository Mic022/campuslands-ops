# backend/app/ai/triaje.py
"""
Orquestador del triaje de IA.
Maneja la llamada al proveedor, la validación estricta con Pydantic, los reintentos y la auditoría.
"""
import logging
import time
from sqlmodel import Session
from pydantic import ValidationError
from app.ai.prompt import construir_prompt_triaje
from app.ai.esquemas import ClasificacionIA
from app.ai.proveedor import obtener_proveedor, ErrorProveedor
from app.ai.auditoria_ia import registrar_llamada_ia
from app.config import settings

log = logging.getLogger("campus-ops.ai")

def clasificar_incidencia(
    descripcion: str, 
    contexto_espacio: str = "", 
    db: Session | None = None
) -> ClasificacionIA | None:
    """
    Ejecuta el triaje. Si la IA falla o devuelve JSON inválido tras 2 intentos, retorna None.
    Registra la métrica de la llamada si se proporciona una sesión de BD.
    """
    mensajes = construir_prompt_triaje(descripcion, contexto_espacio)
    
    try:
        proveedor = obtener_proveedor()
    except ErrorProveedor as e:
        log.error(f"Proveedor de IA no disponible: {e}")
        if db:
            registrar_llamada_ia(db, "triaje", settings.IA_MODELO, None, False, str(e))
        return None
    
    for intento in range(2):
        inicio = time.time()
        try:
            crudo = proveedor.completar(
                mensajes=mensajes,
                temperatura=0.1,
                timeout_s=settings.IA_TIMEOUT_S
            )
            latencia_ms = int((time.time() - inicio) * 1000)
            
            resultado = ClasificacionIA.model_validate_json(crudo)
            log.info(f"Triaje de IA exitoso: {resultado.categoria.value} - {resultado.prioridad.value}")
            
            if db:
                registrar_llamada_ia(db, "triaje", settings.IA_MODELO, latencia_ms, True)
                
            return resultado
            
        except ValidationError as e:
            latencia_ms = int((time.time() - inicio) * 1000)
            log.warning(f"La IA devolvió JSON inválido. Reintentando. Error: {e}")
            if db and intento == 1:
                registrar_llamada_ia(db, "triaje", settings.IA_MODELO, latencia_ms, False, str(e))
                
            mensajes.append({
                "role": "system", 
                "content": f"El JSON anterior fue inválido. Errores: {e.errors()}. Responde SOLO con un objeto JSON válido."
            })
            continue
            
        except ErrorProveedor as e:
            latencia_ms = int((time.time() - inicio) * 1000)
            log.error(f"Fallo del proveedor de IA: {e}")
            if db:
                registrar_llamada_ia(db, "triaje", settings.IA_MODELO, latencia_ms, False, str(e))
            break
            
        except Exception as e:
            latencia_ms = int((time.time() - inicio) * 1000)
            log.exception("Error inesperado en el orquestador de IA")
            if db:
                registrar_llamada_ia(db, "triaje", settings.IA_MODELO, latencia_ms, False, str(e))
            break
            
    return None