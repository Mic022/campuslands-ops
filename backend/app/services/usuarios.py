"""Gestión administrativa de cuentas: listar, crear, cambiar rol, activar/desactivar y desbloquear.

Salvaguardas: un administrador no puede quitarse el rol ni desactivarse a sí mismo, y nunca
puede quedar la plataforma sin al menos un administrador activo.
"""
from sqlmodel import Session

from app.auth.limitador import limitador
from app.config.permisos import ROL_ADMIN
from app.models import Usuario, ahora
from app.repositories import usuarios as repo
from app.repositories.auditoria import auditar
from app.rules.base import NoEncontradoError, ReglaNegocioError, ResultadoRegla
from app.schemas.auth import UsuarioActualizarAdmin, UsuarioAdminVista, UsuarioCrearAdmin
from app.services import auth


def vista(u: Usuario) -> UsuarioAdminVista:
    return UsuarioAdminVista(
        usuario=u.usuario,
        nombre=u.nombre,
        email=u.email,
        rol=u.rol,
        activo=u.activo,
        bloqueado=bool(u.bloqueado_hasta and u.bloqueado_hasta > ahora()),
        ultimo_acceso=u.ultimo_acceso,
        creado_en=u.creado_en,
    )


def obtener(db: Session, usuario: str) -> Usuario:
    encontrado = repo.por_usuario(db, usuario)
    if encontrado is None:
        raise NoEncontradoError(f"No existe el usuario '{usuario}'.")
    return encontrado


def crear(db: Session, datos: UsuarioCrearAdmin, admin: Usuario) -> Usuario:
    auth.exigir_clave_valida(datos.clave, None, datos.usuario, datos.email or "")
    return auth.crear_usuario(db, datos.nombre, datos.usuario, datos.email, datos.clave, datos.rol,
                              actor=admin.nombre, origen="alta administrativa")


def _rechazar(mensaje: str) -> None:
    raise ReglaNegocioError(ResultadoRegla(False, "ADMIN-409", mensaje))


def actualizar(db: Session, usuario: str, datos: UsuarioActualizarAdmin, admin: Usuario) -> Usuario:
    u = obtener(db, usuario)
    cambios = datos.model_dump(exclude_unset=True, exclude_none=True)
    momento = ahora()

    deja_de_ser_admin_activo = u.rol == ROL_ADMIN and u.activo and (
        cambios.get("rol", u.rol) != ROL_ADMIN or cambios.get("activo") is False
    )
    if deja_de_ser_admin_activo and u.usuario == admin.usuario:
        _rechazar("No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.")
    if deja_de_ser_admin_activo and repo.contar_admins_activos(db) <= 1:
        _rechazar("Debe quedar al menos un administrador activo.")

    if "nombre" in cambios and cambios["nombre"] != u.nombre:
        if repo.existe_nombre(db, cambios["nombre"], excepto=u.usuario):
            _rechazar("Ya existe otra cuenta con ese nombre.")
        auditar(db, "usuario", u.usuario, "editar", u.nombre, cambios["nombre"], admin.nombre, "nombre")
        u.nombre = cambios["nombre"]
    if "rol" in cambios and cambios["rol"] != u.rol:
        auditar(db, "usuario", u.usuario, "cambiar_rol", u.rol, cambios["rol"], admin.nombre)
        u.rol = cambios["rol"]
        repo.revocar_sesiones(db, u.usuario, momento)  # el nuevo rol rige desde el próximo inicio de sesión
    if "activo" in cambios and cambios["activo"] != u.activo:
        accion = "activar" if cambios["activo"] else "desactivar"
        auditar(db, "usuario", u.usuario, accion, str(u.activo), str(cambios["activo"]), admin.nombre)
        u.activo = cambios["activo"]
        if not u.activo:
            repo.revocar_sesiones(db, u.usuario, momento)

    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def desbloquear(db: Session, usuario: str, admin: Usuario) -> Usuario:
    u = obtener(db, usuario)
    u.bloqueado_hasta = None
    u.intentos_fallidos = 0
    limitador.limpiar(f"login:id:{u.usuario}")
    if u.email:
        limitador.limpiar(f"login:id:{u.email}")
    db.add(u)
    auditar(db, "usuario", u.usuario, "desbloquear", None, None, admin.nombre)
    db.commit()
    db.refresh(u)
    return u
