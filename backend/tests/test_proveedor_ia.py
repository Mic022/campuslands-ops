"""Pruebas del adaptador de IA. Aquí sí se simula la red (en tests/, nunca en app/)."""
import json
from enum import Enum
from types import SimpleNamespace

import httpx
import pytest
from pydantic import BaseModel, Field

from app.ai import proveedor as p


class Color(str, Enum):
    rojo = "rojo"
    azul = "azul"


class Modelo(BaseModel):
    color: Color
    texto: str = Field(min_length=3, max_length=50)
    confianza: float = Field(ge=0, le=1)


MENSAJES = [
    {"role": "system", "content": "instrucciones"},
    {"role": "user", "content": "<incidencia>hola</incidencia>"},
]


# ---------- Esquema ----------

def test_esquema_estricto_resuelve_enums_y_quita_restricciones():
    e = p.esquema_estricto(Modelo)
    assert "$defs" not in json.dumps(e)
    assert e["properties"]["color"]["enum"] == ["rojo", "azul"]
    assert "maxLength" not in e["properties"]["texto"]
    assert "maximum" not in e["properties"]["confianza"]
    assert e["required"] == ["color", "texto", "confianza"]
    assert e["additionalProperties"] is False


# ---------- Selección ----------

def test_sin_proveedor_configurado_lanza_error(monkeypatch):
    monkeypatch.setattr(p.settings, "IA_PROVEEDOR", "")
    with pytest.raises(p.ErrorProveedor, match="IA_PROVEEDOR"):
        p.obtener_proveedor()


def test_proveedor_desconocido(monkeypatch):
    monkeypatch.setattr(p.settings, "IA_PROVEEDOR", "otro")
    monkeypatch.setattr(p.settings, "IA_MODELO", "x")
    with pytest.raises(p.ErrorProveedor, match="no soportado"):
        p.obtener_proveedor()


def test_ollama_exige_modelo(monkeypatch):
    monkeypatch.setattr(p.settings, "IA_PROVEEDOR", "ollama")
    monkeypatch.setattr(p.settings, "IA_MODELO", "")
    with pytest.raises(p.ErrorProveedor, match="IA_MODELO"):
        p.obtener_proveedor()


# ---------- OpenAI compatible ----------

def test_openai_envia_esquema_y_devuelve_contenido():
    enviado = {}

    def manejar(req: httpx.Request):
        enviado.update(json.loads(req.content))
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"ok": true}'}}]})

    prov = p.ProveedorOpenAICompatible("m", "clave", transporte=httpx.MockTransport(manejar))
    assert prov.completar(MENSAJES, esquema={"type": "object"}) == '{"ok": true}'
    assert enviado["response_format"]["type"] == "json_schema"
    assert enviado["temperature"] == 0


def test_openai_reintenta_con_json_object_si_no_soporta_esquema():
    formatos = []

    def manejar(req: httpx.Request):
        formato = json.loads(req.content)["response_format"]["type"]
        formatos.append(formato)
        if formato == "json_schema":
            return httpx.Response(400, json={"error": "unsupported"})
        return httpx.Response(200, json={"choices": [{"message": {"content": "{}"}}]})

    prov = p.ProveedorOpenAICompatible("m", "clave", transporte=httpx.MockTransport(manejar))
    assert prov.completar(MENSAJES, esquema={"type": "object"}) == "{}"
    assert formatos == ["json_schema", "json_object"]


@pytest.mark.parametrize("status,mensaje", [(401, "credencial"), (500, "error 500")])
def test_openai_errores_http(status, mensaje):
    prov = p.ProveedorOpenAICompatible("m", "k", transporte=httpx.MockTransport(lambda r: httpx.Response(status)))
    with pytest.raises(p.ErrorProveedor, match=mensaje):
        prov.completar(MENSAJES)


def test_openai_sin_conexion():
    def caer(req):
        raise httpx.ConnectError("sin red")

    prov = p.ProveedorOpenAICompatible("m", "k", transporte=httpx.MockTransport(caer))
    with pytest.raises(p.ErrorProveedor, match="conexión"):
        prov.completar(MENSAJES)


# ---------- Ollama ----------

def test_ollama_usa_esquema_como_format():
    enviado = {}

    def manejar(req: httpx.Request):
        enviado.update(json.loads(req.content))
        return httpx.Response(200, json={"message": {"content": '{"ok": true}'}})

    prov = p.ProveedorOllama("llama", transporte=httpx.MockTransport(manejar))
    assert prov.completar(MENSAJES, esquema={"type": "object"}) == '{"ok": true}'
    assert enviado["format"] == {"type": "object"} and enviado["stream"] is False


def test_ollama_modelo_no_descargado():
    prov = p.ProveedorOllama("llama", transporte=httpx.MockTransport(lambda r: httpx.Response(404)))
    with pytest.raises(p.ErrorProveedor, match="ollama pull"):
        prov.completar(MENSAJES)


# ---------- Anthropic ----------

class _ClienteFalso:
    def __init__(self, respuesta=None, error=None):
        self.llamadas = []
        self._respuesta, self._error = respuesta, error
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._crear))

    def _crear(self, **kwargs):
        self.llamadas.append(kwargs)
        if self._error:
            raise self._error
        return self._respuesta


def _anthropic(cliente, modelo="claude-opus-5-5"):
    prov = p.ProveedorAnthropic(modelo, api_key="clave-de-prueba")
    prov._cliente = cliente
    return prov


def _respuesta(texto='{"ok": true}', stop="end_turn"):
    return SimpleNamespace(stop_reason=stop, content=[SimpleNamespace(type="text", text=texto)])


def test_anthropic_separa_system_y_pide_structured_output():
    cliente = _ClienteFalso(_respuesta())
    assert _anthropic(cliente).completar(MENSAJES, esquema={"type": "object"}) == '{"ok": true}'
    args = cliente.llamadas[0]
    assert args["system"] == "instrucciones"
    assert [m["role"] for m in args["messages"]] == ["user"]
    assert args["output_config"]["format"] == {"type": "json_schema", "schema": {"type": "object"}}
    assert "temperature" not in args
    assert args["fallbacks"] == "default"


def test_anthropic_sin_fallback_en_modelos_que_no_lo_aceptan():
    cliente = _ClienteFalso(_respuesta())
    _anthropic(cliente, "claude-haiku-5-5").completar(MENSAJES)
    assert "fallbacks" not in cliente.llamadas[0]


def test_anthropic_rechazo_no_se_convierte_en_respuesta():
    cliente = _ClienteFalso(_respuesta("", stop="refusal"))
    with pytest.raises(p.ErrorProveedor, match="declinó"):
        _anthropic(cliente).completar(MENSAJES)


def test_anthropic_sin_conexion():
    import anthropic

    error = anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.com"))
    with pytest.raises(p.ErrorProveedor, match="conexión"):
        _anthropic(_ClienteFalso(error=error)).completar(MENSAJES)
