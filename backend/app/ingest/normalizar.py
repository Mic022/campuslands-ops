"""Normalización segura de valores del dataset.

Cada función devuelve el valor limpio o lanza ValorInvalido con el motivo exacto,
que termina en el reporte de cuarentena. Nunca se corrige en silencio.

Decisión de fechas: todo se guarda como hora local de Colombia sin zona horaria
(naive). Colombia no tiene horario de verano, así que UTC-5 es fijo.
"""
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from enum import Enum

ZONA_COLOMBIA = timezone(timedelta(hours=-5))

FORMATOS_FECHA = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M",
    "%Y-%m-%d",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y %I:%M %p",
    "%d/%m/%Y %I%p",
    "%d/%m/%Y",
    "%d-%m-%Y %H:%M",
    "%d-%m-%Y",
)


class ValorInvalido(ValueError):
    """Un valor del origen no se puede convertir de forma segura."""


def vacio(valor) -> bool:
    return valor is None or (isinstance(valor, str) and valor.strip() == "")


def texto(valor, campo: str, obligatorio: bool = True, max_largo: int | None = None) -> str | None:
    if vacio(valor):
        if obligatorio:
            raise ValorInvalido(f"{campo}: vacío")
        return None
    limpio = re.sub(r"\s+", " ", str(valor)).strip()
    if max_largo and len(limpio) > max_largo:
        raise ValorInvalido(f"{campo}: supera {max_largo} caracteres")
    return limpio


def clave(valor) -> str:
    """'  Dañado ' -> 'danado'; 'En Proceso' -> 'en_proceso'."""
    sin_tildes = unicodedata.normalize("NFKD", str(valor)).encode("ascii", "ignore").decode()
    return re.sub(r"[\s\-]+", "_", sin_tildes.strip().lower())


def a_enum(valor, enum_cls: type[Enum], campo: str, sinonimos: dict[str, str] | None = None):
    """Convierte variantes ('DAÑADO', ' dañado ') al valor del enum.

    `sinonimos` traduce valores del dataset que significan lo mismo
    (por ejemplo {"en_reparacion": "mantenimiento"}).
    """
    if vacio(valor):
        raise ValorInvalido(f"{campo}: vacío")
    k = clave(valor)
    if sinonimos:
        k = sinonimos.get(k, k)
    try:
        return enum_cls(k)
    except ValueError:
        permitidos = ", ".join(e.value for e in enum_cls)
        raise ValorInvalido(f"{campo}: '{valor}' no es válido (permitidos: {permitidos})") from None


def a_entero_positivo(valor, campo: str) -> int:
    """' 20 ' -> 20. Rechaza 'veinte', '-5', '0' y '20.5'."""
    if vacio(valor):
        raise ValorInvalido(f"{campo}: vacío")
    if isinstance(valor, bool):
        raise ValorInvalido(f"{campo}: '{valor}' no es un número")
    if isinstance(valor, float):
        if not valor.is_integer():
            raise ValorInvalido(f"{campo}: '{valor}' no es un entero")
        numero = int(valor)
    else:
        s = str(valor).strip()
        if s.endswith(".0"):
            s = s[:-2]
        if not re.fullmatch(r"[+-]?\d+", s):
            raise ValorInvalido(f"{campo}: '{valor}' no es un número entero")
        numero = int(s)
    if numero <= 0:
        raise ValorInvalido(f"{campo}: debe ser mayor que 0 (recibido {numero})")
    return numero


def a_fecha(valor, campo: str, obligatorio: bool = True) -> datetime | None:
    """Prueba ISO 8601 y una lista de formatos conocidos; devuelve hora local naive."""
    if vacio(valor):
        if obligatorio:
            raise ValorInvalido(f"{campo}: vacío")
        return None
    if isinstance(valor, datetime):
        fecha = valor
    else:
        s = re.sub(r"\s+", " ", str(valor)).strip()
        s_ampm = re.sub(r"\s*([ap])\.?\s*m\.?$", r" \1m", s, flags=re.IGNORECASE).upper()
        fecha = None
        try:
            fecha = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            for formato in FORMATOS_FECHA:
                for candidato in (s, s_ampm):
                    try:
                        fecha = datetime.strptime(candidato, formato)
                        break
                    except ValueError:
                        continue
                if fecha:
                    break
        if fecha is None:
            raise ValorInvalido(f"{campo}: fecha '{valor}' no reconocida")
    if fecha.tzinfo is not None:
        fecha = fecha.astimezone(ZONA_COLOMBIA).replace(tzinfo=None)
    return fecha
