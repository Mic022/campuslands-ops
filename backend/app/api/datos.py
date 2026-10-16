"""Rutas de datos: reporte de carga y auditoría."""
import json

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.config import settings
from app.db import get_session
from app.repositories import auditoria
from app.rules.base import NoEncontradoError

router = APIRouter(prefix="/api", tags=["datos"])


@router.get("/datos/reporte")
def reporte_carga():
    ruta = settings.DATA_REPORTS / "reporte_carga.json"
    if not ruta.exists():
        raise NoEncontradoError("Aún no hay reporte de carga. Ejecuta: python -m scripts.reset_db")
    return json.loads(ruta.read_text(encoding="utf-8"))


@router.get("/auditoria")
def historial(
    entidad: str | None = None,
    id: str | None = None,
    limite: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_session),
):
    return auditoria.historial(db, entidad, id, limite)
