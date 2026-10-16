# backend/app/api/incidencias.py
"""
Endpoints de incidencias: triaje con IA, confirmación y ciclo de vida.

Los errores no se capturan aquí: ReglaNegocioError (409), NoEncontradoError (404) y
ErrorProveedor (503) los convierte main.py en {codigo, mensaje}.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.config.catalogos import EstadoIncidencia
from app.db import get_session
from app.models import Incidencia
from app.schemas.incidencias import IncidenciaActualizar, IncidenciaCrear, SolicitudTriaje, TriajeRespuesta
from app.services import incidencias as servicio

router = APIRouter(prefix="/api/incidencias", tags=["incidencias"])


@router.get("", response_model=list[Incidencia])
def listar(
    estado: EstadoIncidencia | None = None,
    espacio_id: str | None = None,
    recurso_id: str | None = None,
    db: Session = Depends(get_session),
):
    return servicio.listar_incidencias(db, estado and estado.value, espacio_id, recurso_id)


@router.get("/{incidencia_id}", response_model=Incidencia)
def obtener(incidencia_id: int, db: Session = Depends(get_session)):
    return servicio.obtener_incidencia(db, incidencia_id)


@router.post("/triaje", response_model=TriajeRespuesta)
def triaje(payload: SolicitudTriaje, db: Session = Depends(get_session)):
    """Propuesta de la IA (no guarda la incidencia). 503 si la IA no está disponible → triaje manual."""
    return servicio.ejecutar_triaje(db, payload.descripcion, payload.espacio_id, payload.recurso_id)


@router.post("", status_code=201, response_model=Incidencia)
def crear(payload: IncidenciaCrear, db: Session = Depends(get_session)):
    """Guarda la incidencia confirmada por la persona y aplica sus consecuencias (RN-04)."""
    return servicio.crear_incidencia(db, payload)


@router.patch("/{incidencia_id}", response_model=Incidencia)
def cambiar_estado(incidencia_id: int, payload: IncidenciaActualizar, db: Session = Depends(get_session)):
    """abierta → en_proceso → resuelta. Resolver no devuelve el recurso a 'disponible' automáticamente."""
    return servicio.cambiar_estado_incidencia(db, incidencia_id, payload)
