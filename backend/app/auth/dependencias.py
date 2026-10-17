"""Dependencia global que aplica config/permisos.py a todas las rutas.

La sesión llega en una cookie HttpOnly (el JavaScript del navegador no puede leerla) y se
valida contra la tabla `sesiones`. En los métodos que escriben se exige además la cabecera
X-CSRF-Token con el token sincronizador de esa sesión.
"""
from fastapi import Depends, Request
from sqlmodel import Session

from app.auth.contexto import actor_actual
from app.auth.seguridad import iguales
from app.config import permisos, settings
from app.db import get_session
from app.ingest.normalizar import clave
from app.models import Reserva, Sesion, Usuario
from app.rules.base import NoAutenticadoError, PermisoError

METODOS_SEGUROS = {"GET", "HEAD", "OPTIONS"}
CABECERA_CSRF = "X-CSRF-Token"


async def autorizar(request: Request, db: Session = Depends(get_session)) -> Usuario | None:
    """Devuelve el usuario autenticado (o None en rutas públicas). Lanza 401/403 según la tabla de permisos.

    Es async a propósito: así el usuario queda en el contexto de la petición y la auditoría lo ve.
    """
    from app.services.auth import sesion_desde_token

    ruta = request.scope.get("route")
    operacion = (request.method, ruta.path if ruta else request.url.path)
    if operacion in permisos.PUBLICAS:
        return None

    usuario, sesion = sesion_desde_token(db, request.cookies.get(settings.COOKIE_SESION))
    if request.method not in METODOS_SEGUROS and not iguales(request.headers.get(CABECERA_CSRF), sesion.csrf_token):
        raise PermisoError(
            "La solicitud no trae un token de seguridad válido. Recarga la página e inténtalo de nuevo.", "AUTH-CSRF"
        )
    request.state.usuario = usuario
    request.state.sesion = sesion
    actor_actual.set(usuario.nombre)

    if usuario.rol == permisos.ROL_ADMIN:
        return usuario
    if operacion in permisos.SOLO_ADMIN or operacion[1].startswith(permisos.PREFIJO_ADMIN):
        raise PermisoError("Esta acción es solo para administradores.")
    if operacion in permisos.A_SU_NOMBRE:
        try:
            cuerpo = await request.json()
        except ValueError:
            cuerpo = None          # cuerpo inválido: lo rechaza la validación (422)
        solicitante = cuerpo.get("solicitante") if isinstance(cuerpo, dict) else None
        if isinstance(solicitante, str) and clave(solicitante) != clave(usuario.nombre):
            raise PermisoError(f"Solo puedes registrar a tu nombre ({usuario.nombre}).")
    if operacion in permisos.SOLO_PROPIAS:
        reserva = db.get(Reserva, int(request.path_params["reserva_id"]))
        if reserva and clave(reserva.solicitante) != clave(usuario.nombre):
            raise PermisoError("Solo puedes cancelar tus propias reservas.")
    return usuario


def sesion_actual(request: Request) -> Sesion:
    """Sesión que `autorizar` validó en esta petición (rutas no públicas)."""
    sesion = getattr(request.state, "sesion", None)
    if sesion is None:
        raise NoAutenticadoError("Inicia sesión para continuar.")
    return sesion
