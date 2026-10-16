"""Borra la base de datos y la reconstruye desde los datos oficiales.

Uso (desde backend/):  python -m scripts.reset_db
"""
from pathlib import Path

from sqlmodel import Session

from app.config import settings
from app.db import crear_tablas, engine
from app.ingest import pipeline
from app.services.auth import sembrar_usuarios


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
        claves_generadas = sembrar_usuarios(db)
    ruta_reporte = reporte.guardar(settings.DATA_REPORTS)

    for archivo in reporte.archivos:
        if "error" in archivo:
            print(f"  ! {archivo['archivo']}: {archivo['error']}")
        elif "aviso" in archivo:
            print(f"  - {archivo['archivo']}: {archivo['aviso']}")
    for r in reporte.a_dict()["resumen"]:
        print(f"  {r['entidad']}: {r['leidos']} leídos, {r['cargados']} cargados, {r['en_cuarentena']} en cuarentena")
    print(f"Reporte: {ruta_reporte}")

    print(f"Usuarios: {settings.ADMIN_USUARIO} (admin), {', '.join(settings.USUARIOS_DEMO)} (usuario)")
    for usuario, clave in claves_generadas.items():
        print(f"  ! clave generada para '{usuario}': {clave}   (defínela en .env para que no cambie)")


if __name__ == "__main__":
    main()
