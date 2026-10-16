"""Administración de cuentas. Todo el prefijo /api/admin/ es solo para el rol admin (config/permisos.py)."""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.auth.dependencias import autorizar
from app.db import get_session
from app.models import Usuario
from app.repositories import usuarios as repo
from app.schemas.auth import Rol, UsuarioActualizarAdmin, UsuarioAdminVista, UsuarioCrearAdmin
from app.services import usuarios as servicio

router = APIRouter(prefix="/api/admin", tags=["administración"])


@router.get("/usuarios", response_model=list[UsuarioAdminVista])
def listar_usuarios(
    buscar: str | None = Query(None, max_length=120),
    rol: Rol | None = None,
    activo: bool | None = None,
    db: Session = Depends(get_session),
):
    return [servicio.vista(u) for u in repo.listar(db, buscar, rol, activo)]


@router.post("/usuarios", status_code=201, response_model=UsuarioAdminVista)
def crear_usuario(datos: UsuarioCrearAdmin, admin: Usuario = Depends(autorizar), db: Session = Depends(get_session)):
    return servicio.vista(servicio.crear(db, datos, admin))


@router.patch("/usuarios/{usuario}", response_model=UsuarioAdminVista)
def actualizar_usuario(
    usuario: str, datos: UsuarioActualizarAdmin, admin: Usuario = Depends(autorizar), db: Session = Depends(get_session)
):
    return servicio.vista(servicio.actualizar(db, usuario, datos, admin))


@router.post("/usuarios/{usuario}/desbloquear", response_model=UsuarioAdminVista)
def desbloquear_usuario(usuario: str, admin: Usuario = Depends(autorizar), db: Session = Depends(get_session)):
    return servicio.vista(servicio.desbloquear(db, usuario, admin))
