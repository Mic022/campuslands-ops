"""Asistente de reservas y reportes con IA.

La IA interpreta el mensaje; qué espacio conviene lo deciden las reglas. No se guarda
nada: la UI confirma con POST /api/reservas o POST /api/incidencias. Si la IA no está
disponible responde 503 (main.py) y la UI usa GET /api/recomendaciones, que no usa IA.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth.dependencias import autorizar
from app.db import get_session
from app.models import Usuario
from app.schemas.asistente import MAX_MENSAJES, SolicitudAsistente
from app.services import asistente as servicio

router = APIRouter(prefix="/api", tags=["asistente"])


@router.post("/asistente")
def conversar(
    datos: SolicitudAsistente,
    db: Session = Depends(get_session),
    usuario: Usuario | None = Depends(autorizar),
):
    mensajes = [m.model_dump() for m in datos.mensajes[-MAX_MENSAJES:]]
    return servicio.conversar(db, mensajes, usuario)
