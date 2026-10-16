"""Adaptador de IA: el resto del código solo conoce la interfaz ProveedorIA.

El proveedor se elige con IA_PROVEEDOR en .env:
  - anthropic → Claude con el SDK oficial (structured outputs con esquema JSON)
  - openai    → cualquier API compatible con OpenAI (OpenAI, Groq, Gemini, LM Studio...)
  - ollama    → modelo local con Ollama

Todos devuelven el texto JSON tal cual lo produjo el modelo: la validación con
Pydantic la hace quien llama (app/ai/triaje.py). Ante cualquier fallo se lanza
ErrorProveedor; nunca se inventa una respuesta.
"""
import copy
import time
from typing import Protocol

import httpx

from app.config import settings


class ErrorProveedor(Exception):
    """La IA no está disponible o respondió con error. La UI ofrece triaje manual."""


class ProveedorIA(Protocol):
    nombre: str
    modelo: str

    def completar(self, mensajes: list[dict], esquema: dict | None = None, timeout_s: int | None = None) -> str:
        """Envía mensajes estilo chat ({role, content}) y devuelve el texto de la respuesta.

        `esquema` es un JSON Schema: si se pasa, el proveedor restringe la salida a ese formato.
        """
        ...


# ---------- Utilidades comunes ----------

_CLAVES_NO_SOPORTADAS = {
    "title", "default", "examples", "minLength", "maxLength", "minimum", "maximum",
    "exclusiveMinimum", "exclusiveMaximum", "pattern", "format", "minItems", "maxItems",
}


def esquema_estricto(modelo_pydantic) -> dict:
    """JSON Schema de un modelo Pydantic apto para structured outputs.

    Resuelve las referencias ($defs), quita restricciones que algunos proveedores
    no aceptan (longitudes, rangos) y exige todas las claves sin propiedades extra.
    Las restricciones quitadas se siguen validando con Pydantic al recibir la respuesta.
    """
    crudo = modelo_pydantic.model_json_schema()
    definiciones = crudo.pop("$defs", {})

    def limpiar(nodo):
        if isinstance(nodo, dict):
            if "$ref" in nodo:
                return limpiar(copy.deepcopy(definiciones[nodo["$ref"].split("/")[-1]]))
            nodo = {k: limpiar(v) for k, v in nodo.items() if k not in _CLAVES_NO_SOPORTADAS}
            if nodo.get("type") == "object" and "properties" in nodo:
                nodo["required"] = list(nodo["properties"])
                nodo["additionalProperties"] = False
            return nodo
        if isinstance(nodo, list):
            return [limpiar(x) for x in nodo]
        return nodo

    return limpiar(crudo)


def _separar_system(mensajes: list[dict]) -> tuple[str, list[dict]]:
    """Une los mensajes 'system' en un solo texto (para APIs con campo system aparte)."""
    system = "\n\n".join(m["content"] for m in mensajes if m["role"] == "system")
    resto = [{"role": m["role"], "content": m["content"]} for m in mensajes if m["role"] != "system"]
    return system, resto


def _timeout(timeout_s: int | None) -> int:
    return timeout_s or settings.IA_TIMEOUT_S


# ---------- Anthropic (Claude) ----------

# Modelos que aceptan el reintento automático del lado del servidor ante un rechazo.
_MODELOS_CON_FALLBACK = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}


class ProveedorAnthropic:
    nombre = "anthropic"

    def __init__(self, modelo: str, api_key: str | None = None, base_url: str | None = None):
        import anthropic

        self._anthropic = anthropic
        self.modelo = modelo
        # Sin api_key explícita, el SDK la toma de ANTHROPIC_API_KEY.
        self._cliente = anthropic.Anthropic(api_key=api_key or None, base_url=base_url or None, max_retries=1)

    def completar(self, mensajes: list[dict], esquema: dict | None = None, timeout_s: int | None = None) -> str:
        a = self._anthropic
        system, resto = _separar_system(mensajes)

        # Los modelos actuales no aceptan temperature; la profundidad se controla con effort.
        output_config: dict = {"effort": "low"}
        if esquema:
            output_config["format"] = {"type": "json_schema", "schema": esquema}
        extra: dict = {}
        if self.modelo in _MODELOS_CON_FALLBACK:
            extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}

        try:
            respuesta = self._cliente.beta.messages.create(
                model=self.modelo,
                max_tokens=4096,
                system=system or a.NOT_GIVEN,
                messages=resto,
                output_config=output_config,
                timeout=_timeout(timeout_s),
                **extra,
            )
        except a.APITimeoutError as e:
            raise ErrorProveedor("la IA no respondió a tiempo") from e
        except a.AuthenticationError as e:
            raise ErrorProveedor("credencial de IA inválida") from e
        except a.RateLimitError as e:
            raise ErrorProveedor("límite de uso de la IA alcanzado") from e
        except a.APIStatusError as e:
            raise ErrorProveedor(f"la IA respondió con error {e.status_code}") from e
        except a.APIConnectionError as e:
            raise ErrorProveedor("no hay conexión con la IA") from e

        if respuesta.stop_reason == "refusal":
            raise ErrorProveedor("la IA declinó clasificar este texto")
        if respuesta.stop_reason == "max_tokens":
            raise ErrorProveedor("la respuesta de la IA quedó incompleta")
        texto = next((b.text for b in respuesta.content if b.type == "text"), "")
        if not texto:
            raise ErrorProveedor("la IA no devolvió texto")
        return texto


# ---------- API compatible con OpenAI ----------

class ProveedorOpenAICompatible:
    nombre = "openai"

    def __init__(self, modelo: str, api_key: str, base_url: str | None = None, transporte=None):
        self.modelo = modelo
        self._url = (base_url or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
        self._headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self._transporte = transporte  # solo para pruebas

    def completar(self, mensajes: list[dict], esquema: dict | None = None, timeout_s: int | None = None) -> str:
        cuerpo: dict = {"model": self.modelo, "messages": mensajes, "temperature": 0}
        if esquema:
            cuerpo["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": "respuesta", "schema": esquema, "strict": True},
            }
        datos = self._post(cuerpo, timeout_s)
        try:
            return datos["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as e:
            raise ErrorProveedor("respuesta de la IA con formato inesperado") from e

    def _post(self, cuerpo: dict, timeout_s: int | None) -> dict:
        try:
            with httpx.Client(timeout=_timeout(timeout_s), transport=self._transporte) as cliente:
                r = cliente.post(self._url, json=cuerpo, headers=self._headers)
                if r.status_code == 400 and "response_format" in cuerpo:
                    # Algunos servidores compatibles no soportan json_schema: se pide JSON genérico.
                    cuerpo = {**cuerpo, "response_format": {"type": "json_object"}}
                    r = cliente.post(self._url, json=cuerpo, headers=self._headers)
        except httpx.TimeoutException as e:
            raise ErrorProveedor("la IA no respondió a tiempo") from e
        except httpx.HTTPError as e:
            raise ErrorProveedor("no hay conexión con la IA") from e
        if r.status_code in (401, 403):
            raise ErrorProveedor("credencial de IA inválida")
        if r.status_code >= 400:
            raise ErrorProveedor(f"la IA respondió con error {r.status_code}")
        return r.json()


# ---------- Ollama (modelo local) ----------

class ProveedorOllama:
    nombre = "ollama"

    def __init__(self, modelo: str, base_url: str | None = None, transporte=None):
        self.modelo = modelo
        self._url = (base_url or "http://localhost:11434").rstrip("/") + "/api/chat"
        self._transporte = transporte  # solo para pruebas

    def completar(self, mensajes: list[dict], esquema: dict | None = None, timeout_s: int | None = None) -> str:
        cuerpo = {
            "model": self.modelo,
            "messages": mensajes,
            "stream": False,
            "format": esquema or "json",
            "options": {"temperature": 0},
        }
        try:
            with httpx.Client(timeout=_timeout(timeout_s), transport=self._transporte) as cliente:
                r = cliente.post(self._url, json=cuerpo)
        except httpx.TimeoutException as e:
            raise ErrorProveedor("el modelo local no respondió a tiempo") from e
        except httpx.HTTPError as e:
            raise ErrorProveedor("no hay conexión con Ollama (¿está corriendo?)") from e
        if r.status_code == 404:
            raise ErrorProveedor(f"Ollama no tiene el modelo '{self.modelo}' (ollama pull {self.modelo})")
        if r.status_code >= 400:
            raise ErrorProveedor(f"Ollama respondió con error {r.status_code}")
        try:
            return r.json()["message"]["content"]
        except (KeyError, TypeError, ValueError) as e:
            raise ErrorProveedor("respuesta de Ollama con formato inesperado") from e


# ---------- Selección ----------

MODELO_POR_DEFECTO = {"anthropic": "claude-opus-5-5"}


def obtener_proveedor() -> ProveedorIA:
    nombre = settings.IA_PROVEEDOR
    if not nombre:
        raise ErrorProveedor("IA no configurada: define IA_PROVEEDOR en .env")
    modelo = settings.IA_MODELO or MODELO_POR_DEFECTO.get(nombre, "")
    if not modelo:
        raise ErrorProveedor(f"define IA_MODELO en .env para el proveedor '{nombre}'")

    if nombre == "anthropic":
        return ProveedorAnthropic(modelo, settings.IA_API_KEY, settings.IA_BASE_URL)
    if nombre == "openai":
        if not settings.IA_API_KEY and not settings.IA_BASE_URL:
            raise ErrorProveedor("define IA_API_KEY (o IA_BASE_URL para un servidor local) en .env")
        return ProveedorOpenAICompatible(modelo, settings.IA_API_KEY, settings.IA_BASE_URL)
    if nombre == "ollama":
        return ProveedorOllama(modelo, settings.IA_BASE_URL)
    raise ErrorProveedor(f"proveedor de IA '{nombre}' no soportado (usa anthropic, openai u ollama)")


def medir(funcion, *args, **kwargs) -> tuple[str, int]:
    """Ejecuta una llamada al proveedor y devuelve (texto, latencia en ms) para registrar en LlamadaIA."""
    inicio = time.perf_counter()
    texto = funcion(*args, **kwargs)
    return texto, int((time.perf_counter() - inicio) * 1000)
