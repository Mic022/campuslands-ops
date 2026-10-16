# backend/app/ai/triaje.py
"""
Orquestador del triaje de IA.
Maneja la llamada al proveedor, la validación estricta con Pydantic y los reintentos.
"""
import json
from pydantic import ValidationError
from app.ai.prompt import construir_prompt_triaje
from app.ai.esquemas import ClasificacionIA

# NOTA PARA P3: Esta función simula la llamada al proveedor para que puedas probar 
# el flujo sin depender de la API key en este instante. 
# DEBES REEMPLAZARLA con la llamada real (OpenAI, Anthropic, Ollama) antes de la hora 2:30.
def _llamar_proveedor_ia(mensajes: list[dict]) -> str:
    """Simula la red. Reemplazar por el SDK real del proveedor autorizado."""
    # Simulamos que la IA responde con un JSON válido basado en los catálogos
    return json.dumps({
        "categoria": "equipo_tecnologico",
        "prioridad": "critica",
        "area_responsable": "soporte_ti",
        "justificacion": "El reporte indica humo, lo cual representa un riesgo inmediato.",
        "confianza": 0.95
    })

def clasificar_incidencia(descripcion: str, contexto_espacio: str = "") -> ClasificacionIA | None:
    """
    Ejecuta el triaje. Si la IA falla o devuelve JSON inválido tras 2 intentos, retorna None.
    (El servicio/API deberá manejar el None devolviendo un 503 y ofreciendo triaje manual).
    """
    # 1. Limpiar y construir el prompt blindado
    mensajes = construir_prompt_triaje(descripcion, contexto_espacio)
    
    # 2. Intentar obtener y validar la respuesta (1 intento + 1 reintento con corrección)
    for intento in range(2):
        try:
            crudo = _llamar_proveedor_ia(mensajes)
            
            # Validación estricta: si falta un campo o el valor no está en el Enum, lanza error
            resultado = ClasificacionIA.model_validate_json(crudo)
            
            # TODO: Aquí puedes agregar el registro de auditoría de la llamada a la IA
            # registrar_llamada_ia(valida=True, latencia_ms=...)
            
            return resultado
            
        except ValidationError as e:
            # Si la IA devolvió un JSON mal formado o con valores fuera del catálogo
            # registrar_llamada_ia(valida=False, error=str(e))
            
            # Reintento: le decimos a la IA en qué se equivocó para que se corrija
            mensajes.append({
                "role": "system", 
                "content": f"El JSON anterior fue inválido. Errores: {e.errors()}. Responde SOLO con un JSON válido."
            })
            continue
            
        except Exception as e:
            # Error de red, timeout o proveedor caído
            # registrar_llamada_ia(valida=False, error=str(e))
            print(f"Error de proveedor IA: {e}")
            break # No reintentar si el proveedor está caído
            
    # Si falló los 2 intentos, retornamos None (Nunca inventar una respuesta)
    return None