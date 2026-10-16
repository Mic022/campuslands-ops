"""Registro de auditoría: todo cambio de estado deja rastro.

No hace commit: se llama dentro de la transacción del servicio que hace el cambio.
"""
from sqlmodel import Session, select

from app.models import Auditoria


def auditar(
    db: Session,
    entidad: str,
    entidad_id,
    accion: str,
    estado_anterior: str | None = None,
    estado_nuevo: str | None = None,
    actor: str = "sistema",
    detalle: str | None = None,
) -> Auditoria:
    registro = Auditoria(
        entidad=entidad,
        entidad_id=str(entidad_id),
        accion=accion,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        actor=actor,
        detalle=detalle,
    )
    db.add(registro)
    return registro


def historial(db: Session, entidad: str | None = None, entidad_id: str | None = None, limite: int = 200) -> list[Auditoria]:
    consulta = select(Auditoria)
    if entidad:
        consulta = consulta.where(Auditoria.entidad == entidad)
    if entidad_id:
        consulta = consulta.where(Auditoria.entidad_id == entidad_id)
    consulta = consulta.order_by(Auditoria.fecha.desc(), Auditoria.id.desc()).limit(limite)
    return list(db.exec(consulta))
