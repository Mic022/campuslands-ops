"""Crea una cuenta de administrador desde la consola del servidor.

Es el procedimiento protegido para dar de alta el primer administrador (por ejemplo en
producción, donde no se crean usuarios de prueba). La clave se pide sin mostrarla en pantalla
y no queda en el historial de la terminal.

Uso (desde backend/):  python -m scripts.crear_admin
"""
import getpass

from sqlmodel import Session

from app.config.permisos import ROL_ADMIN
from app.db import crear_tablas, engine
from app.rules.base import ReglaNegocioError
from app.schemas.auth import UsuarioCrearAdmin
from app.services import auth


def main() -> None:
    crear_tablas()
    nombre = input("Nombre completo: ").strip()
    usuario = input("Usuario (3-32: letras, números, . _ -): ").strip().lower()
    email = input("Correo (opcional, para recuperar la contraseña): ").strip().lower() or None
    clave = getpass.getpass("Contraseña: ")
    if clave != getpass.getpass("Repite la contraseña: "):
        raise SystemExit("Las contraseñas no coinciden.")

    datos = UsuarioCrearAdmin(nombre=nombre, usuario=usuario, email=email, clave=clave, rol=ROL_ADMIN)
    try:
        auth.exigir_clave_valida(datos.clave, None, datos.usuario, datos.email or "")
        with Session(engine) as db:
            auth.crear_usuario(db, datos.nombre, datos.usuario, datos.email, datos.clave, ROL_ADMIN,
                               actor="consola", origen="scripts.crear_admin")
    except ReglaNegocioError as e:
        raise SystemExit(f"No se creó la cuenta: {e.resultado.mensaje}")
    print(f"Administrador '{datos.usuario}' creado.")


if __name__ == "__main__":
    main()
