"""Borra la base de datos y la reconstruye desde los datos oficiales.

Uso (desde backend/):  python -m scripts.reset_db
"""
from pathlib import Path

from app.config import settings
from app.db import crear_tablas, engine


def main() -> None:
    engine.dispose()
    if settings.DATABASE_URL.startswith("sqlite:///"):
        ruta = Path(settings.DATABASE_URL.removeprefix("sqlite:///"))
        if ruta.exists():
            ruta.unlink()
            print(f"BD eliminada: {ruta}")
    crear_tablas()
    print("Tablas creadas.")
    # Pendiente: ejecutar la ingesta del dataset oficial y generar el reporte de cuarentena.


if __name__ == "__main__":
    main()
