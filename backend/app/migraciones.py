"""Migraciones de esquema compatibles con bases ya cargadas.

`SQLModel.metadata.create_all` crea las tablas nuevas (sesiones, tokens_recuperacion) pero no
altera las existentes. Aquí se agregan a `usuarios` las columnas nuevas, sin borrar ni reescribir
datos. Cada paso es idempotente: se ejecuta en cada arranque desde `crear_tablas()`.
"""
import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

log = logging.getLogger("campus-ops")

# (tabla, columna, definición SQL). Solo columnas opcionales: las filas existentes quedan en NULL
# o con el valor por defecto indicado.
COLUMNAS_NUEVAS = [
    ("usuarios", "email", "VARCHAR"),
    ("usuarios", "intentos_fallidos", "INTEGER DEFAULT 0"),
    ("usuarios", "bloqueado_hasta", "DATETIME"),
    ("usuarios", "ultimo_acceso", "DATETIME"),
    ("usuarios", "creado_en", "DATETIME"),
]

# SQLite admite varios NULL en un índice único: las cuentas sin correo no chocan entre sí.
INDICES_NUEVOS = [
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email)",
]


def migrar(engine: Engine) -> list[str]:
    """Aplica las migraciones pendientes y devuelve los cambios hechos."""
    aplicadas: list[str] = []
    inspector = inspect(engine)
    tablas = set(inspector.get_table_names())
    with engine.begin() as con:
        for tabla, columna, definicion in COLUMNAS_NUEVAS:
            if tabla not in tablas:
                continue
            if columna not in {c["name"] for c in inspector.get_columns(tabla)}:
                con.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {columna} {definicion}"))
                aplicadas.append(f"{tabla}.{columna}")
        if "usuarios" in tablas:
            for sentencia in INDICES_NUEVOS:
                con.execute(text(sentencia))
    for cambio in aplicadas:
        log.info("Migración aplicada: columna %s", cambio)
    return aplicadas
