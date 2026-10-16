"""Traduce los archivos oficiales al modelo de datos.

Si cambian los nombres de archivo o de columnas del dataset, se ajusta aquí.
"""
import re

from app.ingest.normalizar import clave

# Archivo esperado en data/raw/ por cada entidad.
ARCHIVOS = {
    "espacios": "capacidad_instalada.csv",
}

# Nombres de columna aceptados para cada campo del modelo (se comparan normalizados).
COLUMNAS = {
    "espacios": {
        "nombre": ["nombre", "espacio", "sala", "aula"],
        "aforo": ["capacidad", "aforo", "capacidad_instalada"],
        "tipo": ["tipo", "tipo_espacio"],
        "estado": ["estado"],
        "ubicacion": ["ubicacion", "piso", "sede"],
    },
}

# El dataset de capacidad no trae el tipo: los espacios de hasta este aforo se
# consideran cubículos y el resto aulas (decisión acordada por el equipo).
AFORO_MAX_CUBICULO = 12


def campo(fila: dict, entidad: str, nombre_campo: str):
    """Busca el valor de un campo probando los nombres de columna aceptados."""
    alias = COLUMNAS[entidad][nombre_campo]
    for columna, valor in fila.items():
        if clave(columna) in alias:
            return valor
    return None


def slug(nombre: str) -> str:
    """'Sala Cosmos 1' -> 'sala-cosmos-1'."""
    return re.sub(r"_+", "-", re.sub(r"[^a-z0-9_]", "", clave(nombre)))


def tipo_por_aforo(aforo: int) -> str:
    return "cubiculo" if aforo <= AFORO_MAX_CUBICULO else "aula"
