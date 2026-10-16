"""Rutas de recursos, préstamos y devoluciones."""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.config.catalogos import EstadoPrestamo, EstadoRecurso
from app.db import get_session
from app.models import Prestamo, Recurso
from app.schemas.recursos import CambioEstadoRecurso, DevolucionCrear, PrestamoCrear, RecursoActualizar, RecursoCrear
from app.services import recursos as servicio

router = APIRouter(prefix="/api", tags=["recursos"])


# ---------- Recursos ----------

@router.get("/recursos", response_model=list[Recurso])
def listar_recursos(
    tipo: str | None = None,
    estado: EstadoRecurso | None = None,
    espacio_id: str | None = None,
    db: Session = Depends(get_session),
):
    return servicio.listar_recursos(db, tipo, estado and estado.value, espacio_id)


@router.get("/recursos/{recurso_id}", response_model=Recurso)
def obtener_recurso(recurso_id: str, db: Session = Depends(get_session)):
    return servicio.obtener_recurso(db, recurso_id)


@router.post("/recursos", status_code=201, response_model=Recurso)
def crear_recurso(datos: RecursoCrear, db: Session = Depends(get_session)):
    return servicio.crear_recurso(db, datos)


@router.patch("/recursos/{recurso_id}", response_model=Recurso)
def actualizar_recurso(recurso_id: str, datos: RecursoActualizar, db: Session = Depends(get_session)):
    return servicio.actualizar_recurso(db, recurso_id, datos)


@router.patch("/recursos/{recurso_id}/estado", response_model=Recurso)
def cambiar_estado(recurso_id: str, datos: CambioEstadoRecurso, db: Session = Depends(get_session)):
    return servicio.cambiar_estado(db, recurso_id, datos)


# ---------- Préstamos ----------

@router.get("/prestamos", response_model=list[Prestamo])
def listar_prestamos(
    solicitante: str | None = None,
    estado: EstadoPrestamo | None = None,
    recurso_id: str | None = None,
    vencidos: bool = False,
    db: Session = Depends(get_session),
):
    return servicio.listar_prestamos(db, solicitante, estado and estado.value, recurso_id, vencidos)


@router.post("/prestamos", status_code=201, response_model=Prestamo)
def crear_prestamo(datos: PrestamoCrear, db: Session = Depends(get_session)):
    return servicio.crear_prestamo(db, datos)


@router.post("/prestamos/{prestamo_id}/devolucion", response_model=Prestamo)
def devolver(prestamo_id: int, datos: DevolucionCrear | None = None, db: Session = Depends(get_session)):
    return servicio.devolver(db, prestamo_id, datos or DevolucionCrear())
