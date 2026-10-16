"""Borra la base de datos y la reconstruye desde los datos oficiales.

Uso (desde backend/):  python -m scripts.reset_db
"""
from pathlib import Path

from sqlmodel import Session

from app.config import settings
from app.db import crear_tablas, engine
from app.ingest import pipeline


def main() -> None:
    engine.dispose()
    if settings.DATABASE_URL.startswith("sqlite:///"):
        ruta = Path(settings.DATABASE_URL.removeprefix("sqlite:///"))
        if ruta.exists():
            ruta.unlink()
            print(f"BD eliminada: {ruta}")
    crear_tablas()
    print("Tablas creadas.")

    with Session(engine) as db:
        reporte = pipeline.ejecutar(db)
    ruta_reporte = reporte.guardar(settings.DATA_REPORTS)

    for archivo in reporte.archivos:
        if "error" in archivo:
            print(f"  ! {archivo['archivo']}: {archivo['error']}")
    for r in reporte.a_dict()["resumen"]:
        print(f"  {r['entidad']}: {r['leidos']} leídos, {r['cargados']} cargados, {r['en_cuarentena']} en cuarentena")
    print(f"Reporte: {ruta_reporte}")


if __name__ == "__main__":
    main()
