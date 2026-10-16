"""Inicio de sesión y usuario actual."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.auth.dependencias import autorizar
from app.auth.seguridad import crear_token
from app.config import settings
from app.db import get_session
from app.models import Usuario
from app.rules.base import NoAutenticadoError
from app.services import auth as servicio

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credenciales(BaseModel):
    usuario: str = Field(min_length=1, max_length=60)
    clave: str = Field(min_length=1, max_length=200)


def _publico(u: Usuario) -> dict:
    return {"usuario": u.usuario, "nombre": u.nombre, "rol": u.rol}


@router.post("/login")
def login(datos: Credenciales, db: Session = Depends(get_session)):
    usuario = servicio.autenticar(db, datos.usuario, datos.clave)
    return {
        "token": crear_token(usuario.usuario, usuario.rol),
        "tipo": "bearer",
        "expira_en_horas": settings.TOKEN_HORAS,
        "usuario": _publico(usuario),
    }


@router.get("/yo")
def yo(usuario: Usuario | None = Depends(autorizar)):
    if usuario is None:
        raise NoAutenticadoError("Inicia sesión para continuar.")
    return _publico(usuario)
