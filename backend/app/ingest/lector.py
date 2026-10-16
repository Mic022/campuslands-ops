"""Lectura del dataset oficial sin modificarlo.

Devuelve una lista de dicts por archivo. Soporta CSV y JSON; prueba utf-8-sig
y, si falla, latin-1. Detecta texto con codificación rota ('SalÃ³n').
"""
import csv
import io
import json
from pathlib import Path

CODIFICACIONES = ("utf-8-sig", "latin-1")
MARCAS_MOJIBAKE = ("Ã¡", "Ã©", "Ã\xad", "Ã³", "Ãº", "Ã±", "Ã‘", "Â")


class ErrorLectura(Exception):
    pass


def leer_texto(ruta: Path) -> tuple[str, str]:
    """Devuelve (contenido, codificación usada)."""
    datos = ruta.read_bytes()
    for codificacion in CODIFICACIONES:
        try:
            return datos.decode(codificacion), codificacion
        except UnicodeDecodeError:
            continue
    raise ErrorLectura(f"{ruta.name}: no se pudo decodificar")


def tiene_mojibake(texto: str) -> bool:
    return any(marca in texto for marca in MARCAS_MOJIBAKE)


def reparar_mojibake(texto: str) -> str:
    """'SalÃ³n' -> 'Salón'. Si no se puede reparar, devuelve el texto original."""
    try:
        return texto.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return texto


def leer_csv(contenido: str) -> list[dict]:
    muestra = contenido[:4096]
    try:
        dialecto = csv.Sniffer().sniff(muestra, delimiters=",;\t|")
    except csv.Error:
        dialecto = csv.excel
    lector = csv.DictReader(io.StringIO(contenido), dialect=dialecto)
    filas = []
    for fila in lector:
        # Encabezados con espacios; columnas sobrantes quedan bajo la clave None.
        filas.append({(k or "").strip(): v for k, v in fila.items() if k is not None})
    return filas


def leer_json(contenido: str) -> list[dict] | dict:
    try:
        return json.loads(contenido)
    except json.JSONDecodeError as e:
        raise ErrorLectura(f"JSON inválido: {e}") from e


def leer_archivo(ruta: Path) -> tuple[list[dict] | dict, dict]:
    """Devuelve (registros, metadatos de lectura para el reporte)."""
    if not ruta.exists():
        raise ErrorLectura(f"No existe {ruta}")
    contenido, codificacion = leer_texto(ruta)
    meta = {"archivo": ruta.name, "codificacion": codificacion, "mojibake_reparado": False}
    if tiene_mojibake(contenido):
        reparado = reparar_mojibake(contenido)
        if reparado != contenido:
            contenido = reparado
            meta["mojibake_reparado"] = True

    sufijo = ruta.suffix.lower()
    if sufijo == ".csv":
        return leer_csv(contenido), meta
    if sufijo == ".json":
        return leer_json(contenido), meta
    raise ErrorLectura(f"Formato no soportado: {ruta.suffix}")
