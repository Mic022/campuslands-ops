"""Rutas de recursos (lectura). P2 agrega aquí la creación, préstamo y devolución."""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import Recurso
from app.rules.base import NoEncontradoError

router = APIRouter(prefix="/api/recursos", tags=["recursos"])


@router.get("")
def listar(estado: str | None = None, db: Session = Depends(get_session)) -> list[Recurso]:
    consulta = select(Recurso).order_by(Recurso.tipo, Recurso.id)
    if estado:
        consulta = consulta.where(Recurso.estado == estado)
    return list(db.exec(consulta))


@router.get("/{recurso_id}")
def obtener(recurso_id: str, db: Session = Depends(get_session)) -> Recurso:
    recurso = db.get(Recurso, recurso_id)
    if not recurso:
        raise NoEncontradoError(f"No existe el recurso '{recurso_id}'")
    return recurso
