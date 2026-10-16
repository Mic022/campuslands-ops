"""Qué tiene cada espacio: computadores para trabajar o solo TV.

El dataset de capacidad no trae el equipamiento; lo informó el equipo del campus.
Los espacios de esta lista no tienen computadores pero sí TV. Todo lo demás tiene equipos.
Se compara contra el ID del espacio (slug del nombre): 'sala-verde' cubre 'sala-verde-1',
'sala-verde-2', etc.
"""

SIN_EQUIPOS = (
    "auditorio",
    "cosmos",
    "blanca",
    "sala-blanca",
    "pecera",
    "sala-verde",
    "sala-amarilla",
)

CON_EQUIPOS = "computadores"
SOLO_TV = "tv"


def tiene_equipos(espacio_id: str) -> bool:
    return not any(espacio_id == p or espacio_id.startswith(f"{p}-") for p in SIN_EQUIPOS)


def equipamiento(espacio_id: str) -> str:
    """'computadores' o 'tv' (todos los espacios sin computadores tienen TV)."""
    return CON_EQUIPOS if tiene_equipos(espacio_id) else SOLO_TV
