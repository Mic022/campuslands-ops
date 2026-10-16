# backend/app/ai/triaje.py
"""
Orquestador del triaje de IA.
Maneja la llamada al proveedor, la validación estricta con Pydantic y los reintentos.
"""
import logging
from pydantic import ValidationError
from app.ai.prompt import construir_prompt_triaje
from app.ai.esquemas import ClasificacionIA
from app.ai.proveedor import obtener_proveedor, ErrorProveedor

log = logging.getLogger("campus-ops.ai")

def clasificar_incidencia(descripcion: str, contexto_espacio: str = "") -> ClasificacionIA | None:
    """
    Ejecuta el triaje. Si la IA falla o devuelve JSON inválido tras 2 intentos, retorna None.
    (El servicio/API deberá manejar el None devolviendo un 503 y ofreciendo triaje manual).
    """
    # 1. Limpiar y construir el prompt blindado
    mensajes = construir_prompt_triaje(descripcion, contexto_espacio)
    
    # 2. Obtener el proveedor concreto (OpenAI, Groq, Ollama, etc.)
    try:
        proveedor = obtener_proveedor()
    except ErrorProveedor as e:
        log.error(f"Proveedor de IA no disponible: {e}")
        return None
    
    # 3. Intentar obtener y validar la respuesta (1 intento + 1 reintento con corrección)
    for intento in range(2):
        try:
            # Llamada real al proveedor (Temperatura 0.1 para máxima determinación)
            crudo = proveedor.completar(
                mensajes=mensajes,
                temperatura=0.1,
                timeout_s=settings.IA_TIMEOUT_S
            )
            
            # Validación estricta: si falta un campo o el valor no está en el Enum, lanza error
            resultado = ClasificacionIA.model_validate_json(crudo)
            
            log.info(f"Triaje de IA exitoso: {resultado.categoria.value} - {resultado.prioridad.value}")
            return resultado
            
        except ValidationError as e:
            log.warning(f"La IA devolvió JSON inválido. Reintentando con corrección. Error: {e}")
            # Reintento: le decimos a la IA en qué se equivocó para que se corrija
            mensajes.append({
                "role": "system", 
                "content": f"El JSON anterior fue inválido. Errores: {e.errors()}. Responde SOLO con un objeto JSON válido."
            })
            continue
            
        except ErrorProveedor as e:
            log.error(f"Fallo del proveedor de IA: {e}")
            break # No reintentar si el proveedor está caído o hay error de auth
            
        except Exception as e:
            log.exception("Error inesperado en el orquestador de IA")
            break
            
    # Si falló los 2 intentos o el proveedor cayó, retornamos None (Nunca inventar una respuesta)
    return None

