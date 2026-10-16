"""Rutas de espacios y reservas."""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.config.catalogos import EstadoEspacio, EstadoReserva, TipoEspacio
from app.db import get_session
from app.models import Espacio, Reserva
from app.rules.espacios import aforo_permitido
from app.schemas.espacios import EspacioActualizar, EspacioCrear, ReservaCrear
from app.services import espacios as servicio

router = APIRouter(prefix="/api", tags=["espacios"])


# ---------- Espacios ----------

@router.get("/espacios")
def listar_espacios(
    tipo: TipoEspacio | None = None,
    estado: EstadoEspacio | None = None,
    aforo_min: int | None = Query(None, ge=1),
    db: Session = Depends(get_session),
):
    espacios = servicio.listar_espacios(
        db, tipo and tipo.value, estado and estado.value, aforo_min
    )
    # aforo_permitido refleja el FACTOR_AFORO vigente, para que la UI no lo calcule.
    return [{**e.model_dump(), "aforo_permitido": aforo_permitido(e.aforo)} for e in espacios]


@router.get("/espacios/{espacio_id}")
def obtener_espacio(espacio_id: str, db: Session = Depends(get_session)):
    e = servicio.obtener_espacio(db, espacio_id)
    return {**e.model_dump(), "aforo_permitido": aforo_permitido(e.aforo)}


@router.post("/espacios", status_code=201, response_model=Espacio)
def crear_espacio(datos: EspacioCrear, db: Session = Depends(get_session)):
    return servicio.crear_espacio(db, datos)


@router.patch("/espacios/{espacio_id}", response_model=Espacio)
def actualizar_espacio(espacio_id: str, datos: EspacioActualizar, db: Session = Depends(get_session)):
    return servicio.actualizar_espacio(db, espacio_id, datos)


@router.get("/espacios/{espacio_id}/reservas", response_model=list[Reserva])
def agenda_del_espacio(
    espacio_id: str,
    fecha: date | None = None,
    db: Session = Depends(get_session),
):
    """Reservas activas de un espacio (opcionalmente de un día): sirve para pintar la disponibilidad."""
    servicio.obtener_espacio(db, espacio_id)
    return servicio.listar_reservas(db, espacio_id, fecha, EstadoReserva.activa.value)


# ---------- Reservas ----------

@router.get("/reservas", response_model=list[Reserva])
def listar_reservas(
    espacio_id: str | None = None,
    fecha: date | None = None,
    estado: EstadoReserva | None = None,
    solicitante: str | None = None,
    db: Session = Depends(get_session),
):
    return servicio.listar_reservas(db, espacio_id, fecha, estado and estado.value, solicitante)


@router.post("/reservas", status_code=201, response_model=Reserva)
def crear_reserva(datos: ReservaCrear, db: Session = Depends(get_session)):
    return servicio.crear_reserva(db, datos)


@router.post("/reservas/{reserva_id}/cancelar", response_model=Reserva)
def cancelar_reserva(reserva_id: int, db: Session = Depends(get_session)):
    return servicio.cancelar_reserva(db, reserva_id)
