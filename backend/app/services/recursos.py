"""Casos de uso de recursos, préstamos y devoluciones: valida reglas, persiste y audita en una sola transacción."""
from sqlalchemy import func
from sqlmodel import Session, select

from app.config.catalogos import EstadoIncidencia, EstadoPrestamo, EstadoRecurso
from app.ingest.normalizar import clave
from app.models import Espacio, Incidencia, Prestamo, Recurso, ahora
from app.repositories.auditoria import auditar
from app.rules import recursos as reglas
from app.rules.base import NoEncontradoError, ResultadoRegla, ReglaNegocioError
from app.rules.bloqueos import validar_recurso_operable
from app.schemas.recursos import CambioEstadoRecurso, DevolucionCrear, PrestamoCrear, RecursoActualizar, RecursoCrear
from app.services.transaccion import escritura

# Estos estados solo se tocan con préstamos y devoluciones, para que el
# inventario y la tabla de préstamos nunca se contradigan.
_SOLO_POR_PRESTAMO = {EstadoRecurso.prestado.value}


def _exigir(resultado: ResultadoRegla) -> None:
    if not resultado.ok:
        raise ReglaNegocioError(resultado)


# ---------- Recursos ----------

def listar_recursos(
    db: Session, tipo: str | None = None, estado: str | None = None, espacio_id: str | None = None
) -> list[Recurso]:
    consulta = select(Recurso)
    if tipo:
        consulta = consulta.where(func.lower(Recurso.tipo) == tipo.strip().lower())
    if estado:
        consulta = consulta.where(Recurso.estado == estado)
    if espacio_id:
        consulta = consulta.where(Recurso.espacio_id == espacio_id)
    return list(db.exec(consulta.order_by(Recurso.tipo, Recurso.id)))


def obtener_recurso(db: Session, recurso_id: str) -> Recurso:
    recurso = db.get(Recurso, recurso_id)
    if recurso is None:
        raise NoEncontradoError(f"No existe el recurso '{recurso_id}'.")
    return recurso


def _validar_referencias(db: Session, serial: str | None, espacio_id: str | None, excluir: str | None = None) -> None:
    if serial:
        consulta = select(Recurso).where(Recurso.serial == serial)
        if excluir:
            consulta = consulta.where(Recurso.id != excluir)
        if db.exec(consulta).first() is not None:
            _exigir(ResultadoRegla(False, "ERR-409", f"Ya existe un recurso con el serial '{serial}'."))
    if espacio_id and db.get(Espacio, espacio_id) is None:
        raise NoEncontradoError(f"No existe el espacio '{espacio_id}'.")


def crear_recurso(db: Session, datos: RecursoCrear, actor: str = "sistema") -> Recurso:
    with escritura(db):
        if db.get(Recurso, datos.id) is not None:
            _exigir(ResultadoRegla(False, "ERR-409", f"Ya existe un recurso con el id '{datos.id}'."))
        _validar_referencias(db, datos.serial, datos.espacio_id)
        recurso = Recurso(**datos.model_dump(), estado=EstadoRecurso.disponible.value)
        db.add(recurso)
        auditar(db, "recurso", recurso.id, "crear", None, recurso.estado, actor)
    db.refresh(recurso)
    return recurso


def actualizar_recurso(db: Session, recurso_id: str, datos: RecursoActualizar, actor: str = "sistema") -> Recurso:
    with escritura(db):
        recurso = obtener_recurso(db, recurso_id)
        cambios = datos.model_dump(exclude_unset=True, exclude_none=True)
        _validar_referencias(db, cambios.get("serial"), cambios.get("espacio_id"), excluir=recurso_id)
        for campo, valor in cambios.items():
            setattr(recurso, campo, valor)
        db.add(recurso)
        detalle = ", ".join(f"{k}={v}" for k, v in cambios.items()) or "sin cambios"
        auditar(db, "recurso", recurso_id, "editar", recurso.estado, recurso.estado, actor, detalle)
    db.refresh(recurso)
    return recurso


def cambiar_estado(db: Session, recurso_id: str, datos: CambioEstadoRecurso, actor: str = "sistema") -> Recurso:
    """Cambio manual de estado (mantenimiento, baja, reparado...). RN-03."""
    with escritura(db):
        recurso = obtener_recurso(db, recurso_id)
        nuevo = datos.estado.value
        if recurso.estado in _SOLO_POR_PRESTAMO or nuevo in _SOLO_POR_PRESTAMO:
            _exigir(ResultadoRegla(
                False, "RN-03",
                "El estado 'prestado' solo cambia al registrar un préstamo o su devolución.",
            ))
        _exigir(reglas.validar_transicion(recurso.estado, nuevo))
        anterior = recurso.estado
        recurso.estado = nuevo
        db.add(recurso)
        auditar(db, "recurso", recurso_id, "cambiar_estado", anterior, nuevo, actor, datos.motivo)
    db.refresh(recurso)
    return recurso


# ---------- Préstamos ----------

def incidencias_abiertas_del_recurso(db: Session, recurso_id: str) -> list[Incidencia]:
    return list(db.exec(
        select(Incidencia).where(
            Incidencia.recurso_id == recurso_id,
            Incidencia.estado != EstadoIncidencia.resuelta.value,
        )
    ))


def _clave_solicitante(solicitante: str) -> str:
    """'  Ana PÉREZ ' y 'ana perez' son la misma persona.

    Se compara en Python: lower() de SQLite no entiende tildes ni la Ñ.
    """
    return clave(" ".join(solicitante.split()))


def _prestamos_de(db: Session, solicitante: str, consulta) -> list[Prestamo]:
    objetivo = _clave_solicitante(solicitante)
    return [p for p in db.exec(consulta) if _clave_solicitante(p.solicitante) == objetivo]


def contar_prestamos_activos(db: Session, solicitante: str) -> int:
    activos = select(Prestamo).where(Prestamo.estado == EstadoPrestamo.activo.value)
    return len(_prestamos_de(db, solicitante, activos))


def listar_prestamos(
    db: Session,
    solicitante: str | None = None,
    estado: str | None = None,
    recurso_id: str | None = None,
    vencidos: bool = False,
) -> list[Prestamo]:
    consulta = select(Prestamo)
    if estado:
        consulta = consulta.where(Prestamo.estado == estado)
    if recurso_id:
        consulta = consulta.where(Prestamo.recurso_id == recurso_id)
    if vencidos:
        consulta = consulta.where(
            Prestamo.estado == EstadoPrestamo.activo.value, Prestamo.devolucion_esperada < ahora()
        )
    consulta = consulta.order_by(Prestamo.salida.desc())
    if solicitante:
        return _prestamos_de(db, solicitante, consulta)
    return list(db.exec(consulta))


def crear_prestamo(db: Session, datos: PrestamoCrear) -> Prestamo:
    with escritura(db):
        recurso = obtener_recurso(db, datos.recurso_id)
        salida = datos.salida or ahora()
        # RN-04: fuera de servicio o con incidencia bloqueante abierta, no se presta.
        _exigir(validar_recurso_operable(
            recurso.nombre or recurso.id, recurso.estado, incidencias_abiertas_del_recurso(db, recurso.id)
        ))
        # RN-03: solo un recurso 'disponible' puede pasar a 'prestado'.
        transicion = reglas.validar_transicion(recurso.estado, EstadoRecurso.prestado.value)
        if not transicion.ok:
            _exigir(ResultadoRegla(
                False, "RN-03", f"El recurso '{recurso.id}' está en '{recurso.estado}' y no se puede prestar.",
            ))
        _exigir(reglas.validar_limite_prestamos(contar_prestamos_activos(db, datos.solicitante)))
        _exigir(reglas.validar_fechas_prestamo(salida, datos.devolucion_esperada))

        # Se guarda como lo escribió (sin espacios sobrantes); RN-06 compara sin mayúsculas.
        solicitante = " ".join(datos.solicitante.split())
        prestamo = Prestamo(
            recurso_id=recurso.id,
            solicitante=solicitante,
            salida=salida,
            devolucion_esperada=datos.devolucion_esperada,
        )
        db.add(prestamo)
        anterior = recurso.estado
        recurso.estado = EstadoRecurso.prestado.value
        db.add(recurso)
        db.flush()
        auditar(db, "prestamo", prestamo.id, "crear", None, prestamo.estado, solicitante, f"recurso {recurso.id}")
        auditar(db, "recurso", recurso.id, "cambiar_estado", anterior, recurso.estado, solicitante, f"préstamo #{prestamo.id}")
    db.refresh(prestamo)
    return prestamo


def devolver(db: Session, prestamo_id: int, datos: DevolucionCrear, actor: str = "sistema") -> Prestamo:
    with escritura(db):
        prestamo = db.get(Prestamo, prestamo_id)
        if prestamo is None:
            raise NoEncontradoError(f"No existe el préstamo #{prestamo_id}.")
        recurso = obtener_recurso(db, prestamo.recurso_id)
        fecha = datos.fecha or ahora()
        estado_final = datos.estado_recurso.value
        _exigir(reglas.validar_devolucion(prestamo.estado, prestamo.salida, fecha, recurso.estado, estado_final))

        prestamo.estado = EstadoPrestamo.devuelto.value
        prestamo.devolucion_real = fecha
        anterior = recurso.estado
        recurso.estado = estado_final
        db.add(prestamo)
        db.add(recurso)

        tarde = " (con retraso)" if fecha > prestamo.devolucion_esperada else ""
        detalle = f"devuelto{tarde}" + (f": {datos.observacion}" if datos.observacion else "")
        auditar(db, "prestamo", prestamo_id, "devolver", EstadoPrestamo.activo.value, prestamo.estado, actor, detalle)
        auditar(db, "recurso", recurso.id, "cambiar_estado", anterior, estado_final, actor, f"devolución préstamo #{prestamo_id}")
    db.refresh(prestamo)
    return prestamo
