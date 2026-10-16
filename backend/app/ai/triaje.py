# backend/app/ai/triaje.py
"""
Orquestador del triaje de IA.
Llama al proveedor configurado con un esquema JSON estricto, valida la respuesta con
Pydantic, reintenta una vez si el JSON es inválido y registra cada llamada en llamadas_ia.
Si la IA falla devuelve None: nunca se inventa una clasificación.
"""
import logging

from pydantic import ValidationError
from sqlmodel import Session

from app.ai.auditoria_ia import registrar_llamada_ia
from app.ai.esquemas import ClasificacionIA
from app.ai.prompt import construir_prompt_triaje
from app.ai.proveedor import ErrorProveedor, esquema_estricto, medir, obtener_proveedor
from app.config import settings

log = logging.getLogger("campus-ops.ai")


def clasificar_incidencia(
    descripcion: str,
    contexto_espacio: str = "",
    db: Session | None = None,
) -> ClasificacionIA | None:
    """Devuelve la clasificación propuesta por la IA, o None si no se pudo obtener una válida."""
    mensajes = construir_prompt_triaje(descripcion, contexto_espacio)

    try:
        proveedor = obtener_proveedor()
    except ErrorProveedor as e:
        log.error(f"Proveedor de IA no disponible: {e}")
        if db:
            registrar_llamada_ia(db, "triaje", settings.IA_MODELO or None, None, False, str(e))
        return None

    esquema = esquema_estricto(ClasificacionIA)
    for intento in range(2):  # 1 intento + 1 reintento con corrección
        try:
            crudo, latencia_ms = medir(proveedor.completar, mensajes, esquema=esquema)
        except ErrorProveedor as e:
            log.error(f"Fallo del proveedor de IA: {e}")
            if db:
                registrar_llamada_ia(db, "triaje", proveedor.modelo, None, False, str(e))
            return None  # no se reintenta si el proveedor está caído o la credencial es inválida

        try:
            resultado = ClasificacionIA.model_validate_json(crudo)
        except ValidationError as e:
            log.warning(f"La IA devolvió JSON inválido (intento {intento + 1}): {e}")
            if db:
                registrar_llamada_ia(db, "triaje", proveedor.modelo, latencia_ms, False, f"JSON inválido: {e.error_count()} errores")
            mensajes.append({
                "role": "system",
                "content": f"El JSON anterior fue inválido. Errores: {e.errors(include_url=False)}. Responde SOLO con un objeto JSON válido.",
            })
            continue

        log.info(f"Triaje de IA: {resultado.categoria.value} / {resultado.prioridad.value}")
        if db:
            registrar_llamada_ia(db, "triaje", proveedor.modelo, latencia_ms, True)
        return resultado

    return None
