"""Rutas de datos: resumen del campus, reporte de carga y auditoría."""
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, func, select

from app.config import settings
from app.db import get_session
from app.models import Espacio, Incidencia, Prestamo, Recurso, Reserva
from app.repositories import auditoria
from app.rules.base import NoEncontradoError

router = APIRouter(prefix="/api", tags=["datos"])


def _conteo(db: Session, columna, *filtros) -> dict[str, int]:
    consulta = select(columna, func.count()).group_by(columna)
    for f in filtros:
        consulta = consulta.where(f)
    return {str(valor): total for valor, total in db.exec(consulta)}


@router.get("/resumen")
def resumen(db: Session = Depends(get_session)):
    """Cifras para el panel del campus, calculadas desde la BD."""
    hoy = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    manana = hoy + timedelta(days=1)
    return {
        "espacios_por_tipo": _conteo(db, Espacio.tipo),
        "espacios_por_estado": _conteo(db, Espacio.estado),
        "aforo_total": db.exec(select(func.coalesce(func.sum(Espacio.aforo), 0))).one(),
        "recursos_por_estado": _conteo(db, Recurso.estado),
        "reservas_activas_hoy": db.exec(
            select(func.count()).select_from(Reserva).where(
                Reserva.estado == "activa", Reserva.inicio < manana, Reserva.fin > hoy
            )
        ).one(),
        "prestamos_activos": db.exec(
            select(func.count()).select_from(Prestamo).where(Prestamo.estado == "activo")
        ).one(),
        "incidencias_abiertas_por_prioridad": _conteo(
            db, Incidencia.prioridad, Incidencia.estado != "resuelta"
        ),
    }


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
