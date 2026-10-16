"""Rutas de espacios (lectura). P2 agrega aquí la creación y edición."""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import Espacio
from app.rules.base import NoEncontradoError

router = APIRouter(prefix="/api/espacios", tags=["espacios"])


@router.get("")
def listar(db: Session = Depends(get_session)) -> list[Espacio]:
    return list(db.exec(select(Espacio).order_by(Espacio.tipo, Espacio.aforo.desc(), Espacio.nombre)))


@router.get("/{espacio_id}")
def obtener(espacio_id: str, db: Session = Depends(get_session)) -> Espacio:
    espacio = db.get(Espacio, espacio_id)
    if not espacio:
        raise NoEncontradoError(f"No existe el espacio '{espacio_id}'")
    return espacio
