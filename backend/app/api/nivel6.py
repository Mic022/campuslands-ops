"""Rutas del Nivel 6 de Torre Zenith: salas, ocupación y reservas."""
from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Header
from sqlmodel import Session, select

from app.db import get_session
from app.models import Sala
from app.schemas.reservas import CambioMantenimiento, ReservaCrear, TokensReserva
from app.services import reservas as svc

router = APIRouter(prefix="/api", tags=["nivel6"])


@router.get("/nivel6")
def get_nivel6(fecha: date | None = None, hora: time | None = None,
               session: Session = Depends(get_session)):
    """Ocupación de las diez salas. Sin parámetros, consulta el instante actual del servidor."""
    ahora = datetime.now()
    return svc.estado_nivel(session, fecha or ahora.date(), (hora or ahora.time()).replace(tzinfo=None))


@router.get("/salas")
def get_salas(session: Session = Depends(get_session)):
    return [svc.sala_dict(s) for s in session.exec(select(Sala).order_by(Sala.nombre)).all()]


@router.get("/salas/{sala_id}/reservas")
def get_reservas_sala(sala_id: str, desde: date | None = None, hasta: date | None = None,
                      x_admin_token: str | None = Header(default=None),
                      session: Session = Depends(get_session)):
    """Agenda pública de la sala; con token de operador incluye datos personales y canceladas."""
    return svc.reservas_de_sala(session, sala_id, desde, hasta, svc.es_admin(x_admin_token))


@router.post("/reservas", status_code=201)
def post_reserva(datos: ReservaCrear, session: Session = Depends(get_session)):
    reserva, token = svc.crear_reserva(
        session, datos.sala_id, datos.solicitante, datos.fecha, datos.hora_inicio,
        datos.hora_fin, datos.asistentes, datos.motivo,
    )
    sala = session.get(Sala, reserva.sala_id)
    return {
        "reserva": svc.reserva_dict(reserva, True),
        "sala_nombre": sala.nombre if sala else reserva.sala_id,
        "token": token,
    }


@router.post("/reservas/mias")
def post_mis_reservas(datos: TokensReserva, session: Session = Depends(get_session)):
    """Historial del usuario: las reservas cuyos tokens conserva su navegador."""
    return svc.reservas_por_tokens(session, datos.tokens)


@router.get("/reservas")
def get_reservas(x_admin_token: str | None = Header(default=None),
                 session: Session = Depends(get_session)):
    svc.exigir_admin(x_admin_token)
    return svc.todas_las_reservas(session)


@router.delete("/reservas/{reserva_id}")
def delete_reserva(reserva_id: int,
                   x_reserva_token: str | None = Header(default=None),
                   x_admin_token: str | None = Header(default=None),
                   session: Session = Depends(get_session)):
    reserva = svc.cancelar_reserva(session, reserva_id, x_reserva_token, x_admin_token)
    return svc.reserva_dict(reserva, True)


@router.put("/salas/{sala_id}/mantenimiento")
def put_mantenimiento(sala_id: str, datos: CambioMantenimiento,
                      x_admin_token: str | None = Header(default=None),
                      session: Session = Depends(get_session)):
    svc.exigir_admin(x_admin_token)
    return svc.sala_dict(svc.cambiar_mantenimiento(session, sala_id, datos.activo, datos.motivo))


@router.get("/admin/verificar")
def get_verificar_admin(x_admin_token: str | None = Header(default=None)):
    svc.exigir_admin(x_admin_token)
    return {"admin": True}
