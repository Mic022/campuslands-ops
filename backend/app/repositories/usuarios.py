"""Acceso a datos de usuarios, sesiones y tokens de recuperación (consultas parametrizadas vía ORM)."""
from datetime import datetime

from sqlalchemy import update
from sqlmodel import Session, func, or_, select

from app.config import permisos
from app.ingest.normalizar import clave
from app.models import Sesion, TokenRecuperacion, Usuario


def por_usuario(db: Session, usuario: str) -> Usuario | None:
    return db.get(Usuario, usuario.strip().lower())


def por_identificador(db: Session, identificador: str) -> Usuario | None:
    """Busca por correo (si trae @) o por nombre de usuario; ambos se guardan en minúsculas."""
    ident = identificador.strip().lower()
    if "@" in ident:
        return db.exec(select(Usuario).where(Usuario.email == ident)).first()
    return db.get(Usuario, ident)


def por_email(db: Session, email: str) -> Usuario | None:
    return db.exec(select(Usuario).where(Usuario.email == email.strip().lower())).first()


def existe_email(db: Session, email: str) -> bool:
    return por_email(db, email) is not None


def existe_nombre(db: Session, nombre: str, excepto: str | None = None) -> bool:
    """El nombre identifica al solicitante de reservas y préstamos: no puede repetirse (sin tildes ni mayúsculas)."""
    objetivo = clave(nombre)
    return any(clave(u.nombre) == objetivo for u in db.exec(select(Usuario)) if u.usuario != excepto)


def listar(db: Session, buscar: str | None = None, rol: str | None = None, activo: bool | None = None) -> list[Usuario]:
    consulta = select(Usuario)
    if buscar:
        patron = f"%{buscar.strip().lower()}%"
        consulta = consulta.where(or_(
            func.lower(Usuario.nombre).like(patron),
            Usuario.usuario.like(patron),
            Usuario.email.like(patron),
        ))
    if rol:
        consulta = consulta.where(Usuario.rol == rol)
    if activo is not None:
        consulta = consulta.where(Usuario.activo == activo)
    return list(db.exec(consulta.order_by(Usuario.rol, Usuario.nombre)))


def contar_admins_activos(db: Session) -> int:
    return db.exec(
        select(func.count()).select_from(Usuario).where(
            Usuario.rol == permisos.ROL_ADMIN, Usuario.activo == True  # noqa: E712
        )
    ).one()


# ---------- Sesiones ----------

def sesion_por_huella(db: Session, token_hash: str) -> Sesion | None:
    return db.exec(select(Sesion).where(Sesion.token_hash == token_hash)).first()


def revocar_sesiones(db: Session, usuario: str, cuando: datetime) -> None:
    db.exec(
        update(Sesion).where(Sesion.usuario == usuario, Sesion.revocada_en.is_(None)).values(revocada_en=cuando)
    )


# ---------- Recuperación ----------

def token_recuperacion(db: Session, token_hash: str) -> TokenRecuperacion | None:
    return db.exec(select(TokenRecuperacion).where(TokenRecuperacion.token_hash == token_hash)).first()


def invalidar_tokens_recuperacion(db: Session, usuario: str, cuando: datetime) -> None:
    db.exec(
        update(TokenRecuperacion)
        .where(TokenRecuperacion.usuario == usuario, TokenRecuperacion.usado_en.is_(None))
        .values(usado_en=cuando)
    )
