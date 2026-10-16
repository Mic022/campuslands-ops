"""Hash de contraseñas y tokens firmados, solo con la librería estándar.

- Contraseñas: PBKDF2-SHA256 con sal aleatoria (nunca se guarda la clave en claro).
- Token: base64url(JSON con usuario, rol y vencimiento) + "." + firma HMAC-SHA256.
"""
import base64
import hashlib
import hmac
import json
import secrets
import time

from app.config import settings

_ITERACIONES = 120_000
_CLAVE_FIRMA = (settings.SECRET_KEY or secrets.token_urlsafe(32)).encode()


def hashear_clave(clave: str) -> str:
    sal = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", clave.encode(), bytes.fromhex(sal), _ITERACIONES).hex()
    return f"pbkdf2_sha256${_ITERACIONES}${sal}${digest}"


def verificar_clave(clave: str, guardado: str) -> bool:
    try:
        _, iteraciones, sal, digest = guardado.split("$")
        calculado = hashlib.pbkdf2_hmac("sha256", clave.encode(), bytes.fromhex(sal), int(iteraciones)).hex()
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(calculado, digest)


def _b64(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).rstrip(b"=").decode()


def _desb64(texto: str) -> bytes:
    return base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))


def _firmar(cuerpo: str) -> str:
    return _b64(hmac.new(_CLAVE_FIRMA, cuerpo.encode(), hashlib.sha256).digest())


def crear_token(usuario: str, rol: str, horas: int = settings.TOKEN_HORAS) -> str:
    cuerpo = _b64(json.dumps({"sub": usuario, "rol": rol, "exp": int(time.time()) + horas * 3600}).encode())
    return f"{cuerpo}.{_firmar(cuerpo)}"


def leer_token(token: str) -> dict | None:
    """Datos del token si la firma es válida y no venció; si no, None."""
    try:
        cuerpo, firma = token.split(".")
    except ValueError:
        return None
    if not hmac.compare_digest(firma, _firmar(cuerpo)):
        return None
    try:
        datos = json.loads(_desb64(cuerpo))
    except (ValueError, UnicodeDecodeError):
        return None
    if datos.get("exp", 0) < time.time():
        return None
    return datos
