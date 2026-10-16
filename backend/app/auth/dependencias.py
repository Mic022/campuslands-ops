"""Dependencia global que aplica config/permisos.py a todas las rutas."""
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.auth.contexto import actor_actual
from app.auth.seguridad import leer_token
from app.config import permisos
from app.db import get_session
from app.ingest.normalizar import clave
from app.models import Reserva, Usuario
from app.rules.base import NoAutenticadoError, PermisoError

_bearer = HTTPBearer(auto_error=False)   # muestra el botón "Authorize" en /docs


async def autorizar(
    request: Request,
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_session),
) -> Usuario | None:
    """Devuelve el usuario autenticado (o None en rutas públicas). Lanza 401/403 según la tabla de permisos.

    Es async a propósito: así el usuario queda en el contexto de la petición y la auditoría lo ve.
    """
    ruta = request.scope.get("route")
    operacion = (request.method, ruta.path if ruta else request.url.path)
    if operacion in permisos.PUBLICAS:
        return None

    if credenciales is None:
        raise NoAutenticadoError("Inicia sesión para continuar.")
    datos = leer_token(credenciales.credentials)
    usuario = db.get(Usuario, datos["sub"]) if datos else None
    if usuario is None or not usuario.activo:
        raise NoAutenticadoError("La sesión no es válida o venció. Inicia sesión de nuevo.")
    actor_actual.set(usuario.nombre)

    if usuario.rol == permisos.ROL_ADMIN:
        return usuario
    if operacion in permisos.SOLO_ADMIN:
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
