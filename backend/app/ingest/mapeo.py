"""Traduce los archivos oficiales al modelo de datos.

Si cambian los nombres de archivo o de columnas del dataset, se ajusta aquí.
"""
import re

from app.ingest.normalizar import clave

# Archivo esperado en data/raw/ por cada entidad.
ARCHIVOS = {
    "espacios": "capacidad_instalada.csv",
    "recursos": "recursos.csv",
    "prestamos": "prestamos.csv",
}

# Entidades cuyo archivo puede no haber sido entregado todavía: si falta, se reporta
# como "no entregado" y la carga continúa (los registros se pueden crear desde la app).
OPCIONALES = {"recursos", "prestamos"}

# Nombres de columna aceptados para cada campo del modelo (se comparan normalizados).
COLUMNAS = {
    "espacios": {
        "nombre": ["nombre", "espacio", "sala", "aula"],
        "aforo": ["capacidad", "aforo", "capacidad_instalada"],
        "tipo": ["tipo", "tipo_espacio"],
        "estado": ["estado"],
        "ubicacion": ["ubicacion", "piso", "sede"],
    },
    "recursos": {
        "id": ["id", "codigo", "codigo_inventario", "placa", "id_recurso"],
        "tipo": ["tipo", "categoria", "tipo_recurso", "equipo"],
        "nombre": ["nombre", "descripcion", "modelo", "marca"],
        "serial": ["serial", "numero_serie", "n_serie"],
        "estado": ["estado", "estado_recurso"],
        "espacio": ["espacio", "espacio_id", "sala", "aula", "ubicacion"],
    },
    "prestamos": {
        "recurso": ["recurso", "recurso_id", "codigo", "equipo", "id_recurso"],
        "solicitante": ["solicitante", "persona", "responsable", "usuario", "camper"],
        "salida": ["salida", "fecha_salida", "fecha_prestamo", "inicio"],
        "devolucion_esperada": ["devolucion_esperada", "fecha_devolucion_esperada", "vence", "fecha_limite"],
        "devolucion_real": ["devolucion_real", "fecha_devolucion", "devuelto_en"],
        "estado": ["estado", "estado_prestamo"],
    },
}

# Variantes del dataset que significan un estado del catálogo (se comparan normalizadas).
SINONIMOS_ESTADO_RECURSO = {
    "en_reparacion": "mantenimiento",
    "reparacion": "mantenimiento",
    "en_mantenimiento": "mantenimiento",
    "averiado": "danado",
    "roto": "danado",
    "dado_de_baja": "baja",
    "en_prestamo": "prestado",
    "libre": "disponible",
    "operativo": "disponible",
}
SINONIMOS_ESTADO_PRESTAMO = {
    "en_curso": "activo",
    "vigente": "activo",
    "abierto": "activo",
    "vencido": "activo",      # vencido se calcula al leer; en BD sigue activo
    "cerrado": "devuelto",
    "finalizado": "devuelto",
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
