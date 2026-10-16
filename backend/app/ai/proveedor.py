# backend/app/ai/proveedor.py
"""
Adaptador de IA: el resto del código solo conoce la interfaz ProveedorIA.
El proveedor concreto se elige con la variable de entorno IA_PROVEEDOR.
Soporta OpenAI, Groq y modelos locales (Ollama) sin cambiar el código.
"""
import logging
from typing import Protocol

from app.config import settings

log = logging.getLogger("campus-ops.ai")

class ErrorProveedor(Exception):
    """La IA no está disponible o respondió con error. La UI ofrece triaje manual."""
    pass

class ProveedorIA(Protocol):
    def completar(self, mensajes: list[dict], temperatura: float, timeout_s: int) -> str: ...

class ProveedorOpenAICompatible:
    """
    Implementación compatible con OpenAI, Groq y Ollama.
    Todos usan el mismo SDK y estructura, solo cambian base_url y api_key.
    """
    def __init__(self):
        try:
            from openai import OpenAI, APIError, APITimeoutError
            self._OpenAI = OpenAI
            self._APIError = APIError
            self._APITimeoutError = APITimeoutError
        except ImportError:
            raise ErrorProveedor("Falta la librería 'openai'. Ejecuta: pip install openai")

    def completar(self, mensajes: list[dict], temperatura: float, timeout_s: int) -> str:
        # "dummy" funciona perfectamente para Ollama local que no requiere clave real
        api_key = settings.IA_API_KEY or "dummy"
        # Si base_url está vacío, OpenAI usa su default. Si tiene valor, lo usa (ej: Ollama)
        base_url = settings.IA_BASE_URL or None
        modelo = settings.IA_MODELO or "gpt-4o-mini"

        client = self._OpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout_s
        )

        try:
            response = client.chat.completions.create(
                model=modelo,
                messages=mensajes,
                temperature=temperatura,
                response_format={"type": "json_object"}  # Fuerza salida JSON en proveedores compatibles
            )
            
            contenido = response.choices[0].message.content
            if not contenido:
                raise ErrorProveedor("La IA devolvió una respuesta vacía")
            
            return contenido

        except self._APITimeoutError:
            log.error("Timeout al llamar a la IA")
            raise ErrorProveedor("Tiempo de espera agotado al contactar al proveedor de IA")
        except self._APIError as e:
            log.error(f"Error de API de IA: {e}")
            raise ErrorProveedor(f"Error del proveedor de IA: {e}")
        except Exception as e:
            log.exception("Error inesperado en el proveedor de IA")
            raise ErrorProveedor(f"Error inesperado: {str(e)}")

def obtener_proveedor() -> ProveedorIA:
    """Factory que devuelve la instancia del proveedor configurado."""
    nombre = settings.IA_PROVEEDOR or "openai"
    
    # OpenAI, Groq y Ollama son compatibles con esta misma implementación
    if nombre in ["openai", "groq", "ollama", "local"]:
        return ProveedorOpenAICompatible()
        
    raise ErrorProveedor(f"Proveedor de IA '{nombre}' no reconocido. Usa 'openai', 'groq' u 'ollama'.")