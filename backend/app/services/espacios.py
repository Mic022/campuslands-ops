"""Casos de uso de espacios y reservas: valida reglas, persiste y audita en una sola transacción."""
from datetime import date, datetime, time, timedelta

from sqlmodel import Session, select

from app.config.catalogos import EstadoIncidencia, EstadoReserva
from app.ingest.mapeo import slug
from app.models import Espacio, Incidencia, Reserva, ahora
from app.repositories.auditoria import auditar
from app.rules import espacios as reglas
from app.rules.base import NoEncontradoError, ResultadoRegla, ReglaNegocioError
from app.rules.bloqueos import validar_espacio_operable
from app.schemas.espacios import EspacioActualizar, EspacioCrear, ReservaCrear
from app.services.transaccion import escritura


def _exigir(resultado: ResultadoRegla) -> None:
    if not resultado.ok:
        raise ReglaNegocioError(resultado)


# ---------- Espacios ----------

def listar_espacios(
    db: Session, tipo: str | None = None, estado: str | None = None, aforo_min: int | None = None
) -> list[Espacio]:
    consulta = select(Espacio)
    if tipo:
        consulta = consulta.where(Espacio.tipo == tipo)
    if estado:
        consulta = consulta.where(Espacio.estado == estado)
    if aforo_min:
        consulta = consulta.where(Espacio.aforo >= aforo_min)
    return list(db.exec(consulta.order_by(Espacio.nombre)))


def obtener_espacio(db: Session, espacio_id: str) -> Espacio:
    espacio = db.get(Espacio, espacio_id)
    if espacio is None:
        raise NoEncontradoError(f"No existe el espacio '{espacio_id}'.")
    return espacio


def crear_espacio(db: Session, datos: EspacioCrear, actor: str = "sistema") -> Espacio:
    with escritura(db):
        espacio_id = slug(datos.nombre)
        if not espacio_id:
            _exigir(ResultadoRegla(False, "ERR-409", f"El nombre '{datos.nombre}' no genera un identificador válido."))
        _exigir(_nombre_libre(db, espacio_id, datos.nombre))
        espacio = Espacio(id=espacio_id, **datos.model_dump(mode="json"))
        db.add(espacio)
        auditar(db, "espacio", espacio_id, "crear", None, espacio.estado, actor)
    db.refresh(espacio)
    return espacio


def actualizar_espacio(db: Session, espacio_id: str, datos: EspacioActualizar, actor: str = "sistema") -> Espacio:
    with escritura(db):
        espacio = obtener_espacio(db, espacio_id)
        cambios = datos.model_dump(mode="json", exclude_unset=True, exclude_none=True)

        if "nombre" in cambios and cambios["nombre"] != espacio.nombre:
            _exigir(_nombre_libre(db, None, cambios["nombre"], excluir=espacio_id))
        if "aforo" in cambios and cambios["aforo"] < espacio.aforo:
            # Bajar el aforo no puede dejar reservas futuras por encima del nuevo límite (RN-02).
            _exigir(_aforo_cubre_reservas_futuras(db, espacio_id, cambios["aforo"]))

        estado_anterior = espacio.estado
        for campo, valor in cambios.items():
            setattr(espacio, campo, valor)
        db.add(espacio)

        detalle = ", ".join(f"{k}={v}" for k, v in cambios.items()) or "sin cambios"
        if espacio.estado != estado_anterior:
            auditar(db, "espacio", espacio_id, "cambiar_estado", estado_anterior, espacio.estado, actor, detalle)
        else:
            auditar(db, "espacio", espacio_id, "editar", estado_anterior, espacio.estado, actor, detalle)
    db.refresh(espacio)
    return espacio


def _nombre_libre(db: Session, espacio_id: str | None, nombre: str, excluir: str | None = None) -> ResultadoRegla:
    if espacio_id and db.get(Espacio, espacio_id) is not None:
        return ResultadoRegla(False, "ERR-409", f"Ya existe un espacio con el identificador '{espacio_id}'.")
    consulta = select(Espacio).where(Espacio.nombre == nombre)
    if excluir:
        consulta = consulta.where(Espacio.id != excluir)
    if db.exec(consulta).first() is not None:
        return ResultadoRegla(False, "ERR-409", f"Ya existe un espacio llamado '{nombre}'.")
    return ResultadoRegla(True)


def _aforo_cubre_reservas_futuras(db: Session, espacio_id: str, nuevo_aforo: int) -> ResultadoRegla:
    futuras = db.exec(
        select(Reserva).where(
            Reserva.espacio_id == espacio_id,
            Reserva.estado == EstadoReserva.activa.value,
            Reserva.fin > ahora(),
        )
    )
    for r in futuras:
        resultado = reglas.validar_aforo(r.asistentes, nuevo_aforo)
        if not resultado.ok:
            return ResultadoRegla(
                False, "RN-02",
                f"No se puede bajar el aforo a {nuevo_aforo}: la reserva #{r.id} tiene {r.asistentes} asistentes.",
            )
    return ResultadoRegla(True)


# ---------- Reservas ----------

def listar_reservas(
    db: Session,
    espacio_id: str | None = None,
    fecha: date | None = None,
    estado: str | None = None,
    solicitante: str | None = None,
) -> list[Reserva]:
    consulta = select(Reserva)
    if espacio_id:
        consulta = consulta.where(Reserva.espacio_id == espacio_id)
    if fecha:
        desde = datetime.combine(fecha, time.min)
        consulta = consulta.where(Reserva.inicio >= desde, Reserva.inicio < desde + timedelta(days=1))
    if estado:
        consulta = consulta.where(Reserva.estado == estado)
    if solicitante:
        consulta = consulta.where(Reserva.solicitante == solicitante)
    return list(db.exec(consulta.order_by(Reserva.inicio)))


def _reservas_activas_que_cruzan(db: Session, espacio_id: str, inicio: datetime, fin: datetime) -> list[Reserva]:
    """Candidatas a solapamiento; la decisión final la toma la regla pura RN-01."""
    return list(
        db.exec(
            select(Reserva).where(
                Reserva.espacio_id == espacio_id,
                Reserva.estado == EstadoReserva.activa.value,
                Reserva.inicio < fin,
                Reserva.fin > inicio,
            )
        )
    )


def incidencias_abiertas_del_espacio(db: Session, espacio_id: str) -> list[Incidencia]:
    return list(db.exec(
        select(Incidencia).where(
            Incidencia.espacio_id == espacio_id,
            Incidencia.estado != EstadoIncidencia.resuelta.value,
        )
    ))


def _verificar_bloqueo_espacio(db: Session, espacio: Espacio) -> None:
    """RN-04: no se reserva un espacio fuera de servicio o con una incidencia bloqueante abierta."""
    _exigir(validar_espacio_operable(
        espacio.nombre, espacio.estado, incidencias_abiertas_del_espacio(db, espacio.id)
    ))


def crear_reserva(db: Session, datos: ReservaCrear) -> Reserva:
    with escritura(db):
        espacio = obtener_espacio(db, datos.espacio_id)
        _verificar_bloqueo_espacio(db, espacio)
        _exigir(reglas.validar_horario(datos.inicio, datos.fin, ahora()))
        _exigir(reglas.validar_aforo(datos.asistentes, espacio.aforo))
        _exigir(reglas.validar_sin_solapamiento(
            datos.inicio, datos.fin, _reservas_activas_que_cruzan(db, espacio.id, datos.inicio, datos.fin)
        ))

        reserva = Reserva(**datos.model_dump())
        db.add(reserva)
        db.flush()  # asigna el id para la auditoría
        auditar(
            db, "reserva", reserva.id, "crear", None, reserva.estado, datos.solicitante,
            f"{espacio.id} {datos.inicio:%Y-%m-%d %H:%M}-{datos.fin:%H:%M}, {datos.asistentes} personas",
        )
    db.refresh(reserva)
    return reserva


def cancelar_reserva(db: Session, reserva_id: int, actor: str = "sistema") -> Reserva:
    with escritura(db):
        reserva = db.get(Reserva, reserva_id)
        if reserva is None:
            raise NoEncontradoError(f"No existe la reserva #{reserva_id}.")
        if reserva.estado != EstadoReserva.activa.value:
            _exigir(ResultadoRegla(False, "ERR-409", f"La reserva #{reserva_id} ya está {reserva.estado}."))
        reserva.estado = EstadoReserva.cancelada.value
        db.add(reserva)
        auditar(db, "reserva", reserva_id, "cancelar", EstadoReserva.activa.value, reserva.estado, actor)
    db.refresh(reserva)
    return reserva
