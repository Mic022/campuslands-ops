"""Borra la base de datos y la reconstruye desde los datos oficiales.

Uso (desde backend/):  python -m scripts.reset_db
"""
from pathlib import Path

from sqlmodel import Session

from app.config import settings
from app.db import crear_tablas, engine
from app.services.reservas import sembrar_salas


def main() -> None:
    engine.dispose()
    if settings.DATABASE_URL.startswith("sqlite:///"):
        ruta = Path(settings.DATABASE_URL.removeprefix("sqlite:///"))
        if ruta.exists():
            ruta.unlink()
            print(f"BD eliminada: {ruta}")
    crear_tablas()
    print("Tablas creadas.")
    with Session(engine) as session:
        sembrar_salas(session)
    print("Salas del Nivel 6 de Torre Zenith cargadas (10).")
    # Pendiente: ejecutar la ingesta del dataset oficial y generar el reporte de cuarentena.


if __name__ == "__main__":
    main()
