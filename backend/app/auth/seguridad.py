"""Hash de contraseñas, política de contraseñas y tokens aleatorios.

- Contraseñas: Argon2id (argon2-cffi, parámetros recomendados por OWASP). Los hashes PBKDF2
  de la versión anterior se siguen aceptando y se migran a Argon2id en el siguiente login.
- Tokens de sesión, CSRF y recuperación: aleatorios de 256 bits. Al cliente se le entrega el
  token; en la base solo se guarda su SHA-256, así una copia de la base no permite suplantar a nadie.
"""
import hashlib
import hmac
import re
import secrets
import string

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.config import settings

_hasher = PasswordHasher()
_PREFIJO_PBKDF2 = "pbkdf2_sha256$"

MAX_LARGO_CLAVE = 128  # evita hashear entradas enormes (DoS)

# Hash de una clave que nadie conoce: se verifica contra él cuando la cuenta no existe,
# para que el tiempo de respuesta no revele si un usuario está registrado.
_HASH_SEÑUELO = _hasher.hash(secrets.token_urlsafe(16))


# ---------- Contraseñas ----------

def hashear_clave(clave: str) -> str:
    return _hasher.hash(clave)


def _verificar_pbkdf2(clave: str, guardado: str) -> bool:
    try:
        _, iteraciones, sal, digest = guardado.split("$")
        calculado = hashlib.pbkdf2_hmac("sha256", clave.encode(), bytes.fromhex(sal), int(iteraciones)).hex()
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(calculado, digest)


def verificar_clave(clave: str, guardado: str | None) -> bool:
    """True si la clave coincide. Con `guardado` None verifica contra el señuelo y devuelve False."""
    if guardado and guardado.startswith(_PREFIJO_PBKDF2):
        return _verificar_pbkdf2(clave, guardado)
    try:
        return _hasher.verify(guardado or _HASH_SEÑUELO, clave) and guardado is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def necesita_rehash(guardado: str) -> bool:
    if guardado.startswith(_PREFIJO_PBKDF2):
        return True
    try:
        return _hasher.check_needs_rehash(guardado)
    except InvalidHashError:
        return True


def politica() -> dict:
    """Requisitos vigentes, para que la UI los muestre antes del registro sin duplicarlos."""
    return {
        "min_largo": settings.CLAVE_MIN,
        "max_largo": MAX_LARGO_CLAVE,
        "mayuscula": settings.CLAVE_MAYUSCULA,
        "minuscula": settings.CLAVE_MINUSCULA,
        "numero": settings.CLAVE_NUMERO,
        "simbolo": settings.CLAVE_SIMBOLO,
    }


def incumplimientos(clave: str, datos_personales: tuple[str, ...] = ()) -> list[str]:
    """Requisitos de la política que la clave no cumple (lista vacía si es válida)."""
    p = politica()
    errores: list[str] = []
    if len(clave) < p["min_largo"]:
        errores.append(f"Debe tener al menos {p['min_largo']} caracteres.")
    if len(clave) > p["max_largo"]:
        errores.append(f"Debe tener como máximo {p['max_largo']} caracteres.")
    if p["mayuscula"] and not re.search(r"[A-ZÁÉÍÓÚÑ]", clave):
        errores.append("Debe incluir al menos una letra mayúscula.")
    if p["minuscula"] and not re.search(r"[a-záéíóúñ]", clave):
        errores.append("Debe incluir al menos una letra minúscula.")
    if p["numero"] and not re.search(r"\d", clave):
        errores.append("Debe incluir al menos un número.")
    if p["simbolo"] and not re.search(r"[^\w\s]", clave):
        errores.append("Debe incluir al menos un símbolo.")
    if clave != clave.strip():
        errores.append("No puede empezar ni terminar con espacios.")
    minuscula = clave.lower()
    for dato in datos_personales:
        dato = (dato or "").lower().split("@")[0]
        if len(dato) >= 4 and dato in minuscula:
            errores.append("No puede contener tu nombre de usuario ni tu correo.")
            break
    return errores


def clave_aleatoria(largo: int = 16) -> str:
    """Clave que cumple cualquier combinación de la política (para usuarios de prueba generados)."""
    largo = max(largo, settings.CLAVE_MIN)
    alfabeto = string.ascii_letters + string.digits
    obligatorios = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!#%&*+-=?@_"),
    ]
    resto = [secrets.choice(alfabeto) for _ in range(largo - len(obligatorios))]
    caracteres = obligatorios + resto
    secrets.SystemRandom().shuffle(caracteres)
    return "".join(caracteres)


# ---------- Tokens ----------

def token_nuevo() -> str:
    return secrets.token_urlsafe(32)


def huella(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def iguales(a: str | None, b: str | None) -> bool:
    return bool(a) and bool(b) and hmac.compare_digest(a, b)
