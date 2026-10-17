"""Inicio y cierre de sesión, sesión actual, registro y recuperación de contraseña.

La sesión viaja en una cookie HttpOnly; el cuerpo de la respuesta nunca incluye el token de
sesión, solo el token CSRF que el frontend debe reenviar en X-CSRF-Token al escribir.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, Request, Response
from sqlmodel import Session

from app.auth import correo
from app.auth.dependencias import autorizar, sesion_actual
from app.auth.seguridad import politica
from app.config import settings
from app.db import get_session
from app.models import Sesion, Usuario
from app.schemas.auth import (
    Credenciales,
    RecuperarEntrada,
    RegistroEntrada,
    RestablecerEntrada,
    SesionSalida,
    UsuarioPublico,
)
from app.services import auth as servicio

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _publico(u: Usuario) -> UsuarioPublico:
    return UsuarioPublico(usuario=u.usuario, nombre=u.nombre, email=u.email, rol=u.rol)


def _sesion(u: Usuario, s: Sesion) -> SesionSalida:
    return SesionSalida(usuario=_publico(u), csrf_token=s.csrf_token, expira_en=s.expira_en)


def _poner_cookie(response: Response, token: str, expira_en: datetime, recordar: bool) -> None:
    response.set_cookie(
        settings.COOKIE_SESION,
        token,
        # Sin "recordar" es una cookie de sesión del navegador: se borra al cerrarlo.
        max_age=int((expira_en - datetime.now()).total_seconds()) if recordar else None,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


def _borrar_cookie(response: Response) -> None:
    response.delete_cookie(
        settings.COOKIE_SESION, path="/", httponly=True,
        secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
    )


@router.get("/politica")
def politica_de_acceso():
    """Requisitos de contraseña y opciones de acceso, para que la UI los muestre sin duplicarlos."""
    return {
        "clave": politica(),
        "registro_publico": settings.REGISTRO_PUBLICO,
        "recuperacion_disponible": correo.configurado(),
        "recordar_dias": settings.SESION_RECORDAR_DIAS,
    }


@router.post("/login", response_model=SesionSalida)
def login(datos: Credenciales, request: Request, response: Response, db: Session = Depends(get_session)):
    usuario, token, sesion = servicio.iniciar_sesion(db, datos.usuario, datos.clave, datos.recordar, _ip(request))
    _poner_cookie(response, token, sesion.expira_en, datos.recordar)
    return _sesion(usuario, sesion)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_session)):
    """Revoca la sesión en el servidor y borra la cookie. Idempotente: no falla sin sesión."""
    servicio.cerrar_sesion(db, request.cookies.get(settings.COOKIE_SESION), _ip(request))
    _borrar_cookie(response)
    response.status_code = 204
    return None


@router.get("/yo", response_model=SesionSalida)
def yo(usuario: Usuario = Depends(autorizar), sesion: Sesion = Depends(sesion_actual)):
    """Usuario de la sesión actual (el rol sale de la BD) y el token CSRF para escribir."""
    return _sesion(usuario, sesion)


@router.post("/registro", status_code=201, response_model=UsuarioPublico)
def registro(datos: RegistroEntrada, request: Request, db: Session = Depends(get_session)):
    return _publico(servicio.registrar(db, datos, _ip(request)))


@router.post("/recuperar", status_code=202)
def recuperar(datos: RecuperarEntrada, request: Request, db: Session = Depends(get_session)):
    servicio.solicitar_recuperacion(db, datos.email, _ip(request))
    return {
        "mensaje": "Si existe una cuenta activa con ese correo, recibirás un enlace para restablecer la contraseña.",
    }


@router.post("/restablecer")
def restablecer(datos: RestablecerEntrada, db: Session = Depends(get_session)):
    servicio.restablecer(db, datos.token, datos.clave, datos.confirmacion)
    return {"mensaje": "Tu contraseña se actualizó. Inicia sesión con la nueva contraseña."}
