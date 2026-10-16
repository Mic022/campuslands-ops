# backend/app/services/incidencias.py
"""
Servicio de incidencias: triaje con IA, confirmación con RN-04 y ciclo de vida.

La IA solo propone. Al confirmar, las reglas deciden las consecuencias:
una incidencia con prioridad en PRIORIDADES_BLOQUEANTES sobre un recurso lo pasa a
mantenimiento (si la máquina de estados lo permite), y RN-04 (rules/bloqueos.py)
bloquea reservas y préstamos mientras siga abierta.
"""
from datetime import timedelta

from sqlmodel import Session, func, select

from app.ai.triaje import clasificar_incidencia
from app.ai.proveedor import ErrorProveedor
from app.config import reglas as cfg
from app.config.catalogos import (
    TRANSICIONES_INCIDENCIA, TRANSICIONES_RECURSO, EstadoIncidencia, EstadoRecurso, EstadoReserva, OrigenTriaje,
)
from app.models import Espacio, Incidencia, Recurso, Reserva, ahora
from app.repositories.auditoria import auditar
from app.rules.base import NoEncontradoError, ResultadoRegla, ReglaNegocioError
from app.schemas.incidencias import IncidenciaActualizar, IncidenciaCrear
from app.services.transaccion import escritura


# ---------- Consultas ----------

def listar_incidencias(
    db: Session, estado: str | None = None, espacio_id: str | None = None, recurso_id: str | None = None
) -> list[Incidencia]:
    consulta = select(Incidencia)
    if estado:
        consulta = consulta.where(Incidencia.estado == estado)
    if espacio_id:
        consulta = consulta.where(Incidencia.espacio_id == espacio_id)
    if recurso_id:
        consulta = consulta.where(Incidencia.recurso_id == recurso_id)
    return list(db.exec(consulta.order_by(Incidencia.creada_en.desc(), Incidencia.id.desc())))


def obtener_incidencia(db: Session, incidencia_id: int) -> Incidencia:
    incidencia = db.get(Incidencia, incidencia_id)
    if incidencia is None:
        raise NoEncontradoError(f"No existe la incidencia #{incidencia_id}.")
    return incidencia


def _espacio_y_recurso(db: Session, espacio_id: str | None, recurso_id: str | None) -> tuple[Espacio | None, Recurso | None]:
    """Verifica que existan. Si el recurso está fijo en un espacio y no se indicó espacio, lo toma."""
    recurso = None
    if recurso_id:
        recurso = db.get(Recurso, recurso_id)
        if recurso is None:
            raise NoEncontradoError(f"No existe el recurso '{recurso_id}'.")
        if not espacio_id:
            espacio_id = recurso.espacio_id
    espacio = None
    if espacio_id:
        espacio = db.get(Espacio, espacio_id)
        if espacio is None:
            raise NoEncontradoError(f"No existe el espacio '{espacio_id}'.")
    return espacio, recurso


# ---------- Triaje ----------

def contexto_para_ia(db: Session, espacio: Espacio | None, recurso: Recurso | None) -> str:
    """Datos reales del sistema para que la IA evalúe la gravedad."""
    lineas = []
    if espacio:
        hoy = ahora().replace(hour=0, minute=0, second=0)
        reservas_hoy = db.exec(
            select(func.count()).select_from(Reserva).where(
                Reserva.espacio_id == espacio.id,
                Reserva.estado == EstadoReserva.activa.value,
                Reserva.inicio < hoy + timedelta(days=1),
                Reserva.fin > hoy,
            )
        ).one()
        lineas.append(
            f"- Espacio: {espacio.nombre} ({espacio.tipo}), aforo {espacio.aforo}, estado {espacio.estado}, "
            f"{reservas_hoy} reservas activas hoy"
        )
    if recurso:
        lineas.append(f"- Recurso: {recurso.nombre or recurso.tipo} ({recurso.tipo}), estado {recurso.estado}")
    abiertas = []
    if espacio or recurso:
        consulta = select(Incidencia).where(Incidencia.estado != EstadoIncidencia.resuelta.value)
        if espacio and recurso:
            consulta = consulta.where((Incidencia.espacio_id == espacio.id) | (Incidencia.recurso_id == recurso.id))
        elif espacio:
            consulta = consulta.where(Incidencia.espacio_id == espacio.id)
        else:
            consulta = consulta.where(Incidencia.recurso_id == recurso.id)
        abiertas = list(db.exec(consulta.limit(5)))
    if abiertas:
        resumen = "; ".join(f"#{i.id} {i.prioridad or 'sin triaje'}: {i.titulo}" for i in abiertas)
        lineas.append(f"- Incidencias abiertas relacionadas: {resumen}")
    elif espacio or recurso:
        lineas.append("- Incidencias abiertas relacionadas: ninguna")
    return "\n".join(lineas) or "Sin espacio ni recurso asociados."


def ejecutar_triaje(db: Session, descripcion: str, espacio_id: str | None, recurso_id: str | None) -> dict:
    """Propuesta de la IA con contexto real. Lanza ErrorProveedor (→ 503) si no hay clasificación válida."""
    espacio, recurso = _espacio_y_recurso(db, espacio_id, recurso_id)
    resultado = clasificar_incidencia(descripcion, contexto_para_ia(db, espacio, recurso), db=db)
    if resultado is None:
        raise ErrorProveedor("no se obtuvo una clasificación válida")
    return {**resultado.model_dump(mode="json"), "requiere_revision": resultado.confianza < cfg.UMBRAL_CONFIANZA_IA}


# ---------- Confirmación (RN-04) ----------

def _origen(datos: IncidenciaCrear) -> str:
    """'ia' si la persona confirmó tal cual la propuesta; 'manual' si la ajustó o no usó la IA."""
    p = datos.propuesta_ia
    if p and (p.categoria, p.prioridad, p.area_responsable) == (datos.categoria, datos.prioridad, datos.area_responsable):
        return OrigenTriaje.ia.value
    return OrigenTriaje.manual.value


def crear_incidencia(db: Session, datos: IncidenciaCrear, actor: str = "sistema") -> Incidencia:
    with escritura(db):
        espacio, recurso = _espacio_y_recurso(db, datos.espacio_id, datos.recurso_id)
        incidencia = Incidencia(
            titulo=datos.titulo,
            descripcion=datos.descripcion,
            categoria=datos.categoria.value,
            prioridad=datos.prioridad.value,
            area_responsable=datos.area_responsable.value,
            espacio_id=espacio.id if espacio else None,
            recurso_id=recurso.id if recurso else None,
            origen_triaje=_origen(datos),
            confianza_ia=datos.propuesta_ia.confianza if datos.propuesta_ia else None,
            justificacion_ia=datos.propuesta_ia.justificacion if datos.propuesta_ia else None,
        )
        db.add(incidencia)
        db.flush()
        auditar(db, "incidencia", incidencia.id, "crear", None, incidencia.estado, actor,
                f"{incidencia.prioridad} · triaje {incidencia.origen_triaje}")

        # Recurso con incidencia bloqueante → mantenimiento, solo si la máquina de estados lo permite.
        # Si está prestado (o ya fuera de servicio) no se toca: RN-04 lo bloquea por la incidencia abierta.
        if recurso and incidencia.prioridad in cfg.PRIORIDADES_BLOQUEANTES:
            destino = EstadoRecurso.mantenimiento
            if destino in TRANSICIONES_RECURSO[EstadoRecurso(recurso.estado)]:
                anterior = recurso.estado
                recurso.estado = destino.value
                db.add(recurso)
                auditar(db, "recurso", recurso.id, "cambiar_estado", anterior, destino.value, actor,
                        f"RN-04: incidencia #{incidencia.id} de prioridad {incidencia.prioridad}")
    db.refresh(incidencia)
    return incidencia


# ---------- Ciclo de vida ----------

def cambiar_estado_incidencia(db: Session, incidencia_id: int, datos: IncidenciaActualizar, actor: str = "sistema") -> Incidencia:
    with escritura(db):
        incidencia = obtener_incidencia(db, incidencia_id)
        actual = EstadoIncidencia(incidencia.estado)
        if datos.estado == actual:
            raise ReglaNegocioError(ResultadoRegla(False, "RN-08", f"La incidencia #{incidencia_id} ya está '{actual.value}'."))
        if datos.estado not in TRANSICIONES_INCIDENCIA[actual]:
            permitidos = ", ".join(sorted(e.value for e in TRANSICIONES_INCIDENCIA[actual])) or "ninguno"
            raise ReglaNegocioError(ResultadoRegla(
                False, "RN-08",
                f"Una incidencia '{actual.value}' no puede pasar a '{datos.estado.value}' (permitidos: {permitidos}).",
            ))
        incidencia.estado = datos.estado.value
        if datos.estado == EstadoIncidencia.resuelta:
            incidencia.resuelta_en = ahora()
        db.add(incidencia)
        accion = "resolver" if datos.estado == EstadoIncidencia.resuelta else "cambiar_estado"
        auditar(db, "incidencia", incidencia_id, accion, actual.value, incidencia.estado, actor, datos.observacion)
    db.refresh(incidencia)
    return incidencia
