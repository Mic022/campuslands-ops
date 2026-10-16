"""Borra la base de datos y la reconstruye desde los datos oficiales.

Las cuentas de usuario (registradas o creadas por un administrador) se conservan; las sesiones
y los enlaces de recuperación se descartan, así que todos deben volver a iniciar sesión.

Uso (desde backend/):  python -m scripts.reset_db [--borrar-usuarios]
"""
import sys
from pathlib import Path

from sqlmodel import Session, select

from app.config import settings
from app.db import crear_tablas, engine
from app.ingest import pipeline
from app.models import Usuario
from app.services.auth import sembrar_usuarios


def _respaldar_cuentas() -> list[dict]:
    crear_tablas()  # migra una base anterior para poder leer sus cuentas con el modelo actual
    with Session(engine) as db:
        return [u.model_dump() for u in db.exec(select(Usuario))]


def main() -> None:
    cuentas = [] if "--borrar-usuarios" in sys.argv else _respaldar_cuentas()
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
        for cuenta in cuentas:
            db.add(Usuario(**cuenta))
        db.commit()
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

    if cuentas:
        print(f"Cuentas conservadas: {len(cuentas)}")
    if settings.SEMBRAR_USUARIOS_DEMO:
        print(f"Usuarios de prueba: {settings.ADMIN_USUARIO} (admin), {', '.join(settings.USUARIOS_DEMO)} (usuario)")
    for usuario, clave in claves_generadas.items():
        print(f"  ! clave generada para '{usuario}': {clave}   (defínela en .env para que no cambie)")


if __name__ == "__main__":
    main()
