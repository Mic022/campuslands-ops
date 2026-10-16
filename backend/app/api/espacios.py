"""Rutas de espacios, reservas y recomendación de espacios."""
from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.auth.dependencias import autorizar
from app.config.catalogos import EstadoEspacio, EstadoReserva, TipoEspacio
from app.config.equipamiento import equipamiento
from app.config.permisos import ROL_ADMIN
from app.db import get_session
from app.models import Espacio, Reserva, Usuario
from app.rules.espacios import aforo_permitido
from app.schemas.comunes import a_hora_local
from app.schemas.espacios import EspacioActualizar, EspacioCrear, ReservaCrear
from app.services import espacios as servicio
from app.services import recomendador

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
    return [_con_calculados(e) for e in espacios]


def _con_calculados(e: Espacio) -> dict:
    return {**e.model_dump(), "aforo_permitido": aforo_permitido(e.aforo), "equipamiento": equipamiento(e.id)}


@router.get("/recomendaciones")
def recomendar_espacios(
    asistentes: int = Query(ge=1, le=10_000),
    inicio: datetime = Query(),
    fin: datetime = Query(),
    con_equipos: bool | None = None,
    solicitante: str | None = Query(None, max_length=120),
    db: Session = Depends(get_session),
    usuario: Usuario | None = Depends(autorizar),
):
    """Espacios que sirven para esa necesidad, del que menos capacidad desperdicia al que más. No usa IA.

    Es el respaldo del asistente cuando la IA no está disponible. No reserva nada.
    """
    if usuario is not None and usuario.rol != ROL_ADMIN:
        solicitante = usuario.nombre
    necesidad = recomendador.Necesidad(asistentes, a_hora_local(inicio), a_hora_local(fin), con_equipos, solicitante)
    return recomendador.recomendar(db, necesidad).como_dict()


@router.get("/espacios/{espacio_id}")
def obtener_espacio(espacio_id: str, db: Session = Depends(get_session)):
    return _con_calculados(servicio.obtener_espacio(db, espacio_id))


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
