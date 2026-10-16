"""Orquestación de salas y reservas: reglas, transacciones y autorización."""
import hashlib
import json
import secrets
import threading
from datetime import date, datetime, time

from sqlmodel import Session, select

from app.config import salas as catalogo
from app.config import settings
from app.config.catalogos import EstadoEspacio, EstadoReserva, Ocupacion
from app.models import Reserva, Sala
from app.rules import reservas as reglas
from app.rules.base import NoEncontradoError, PermisoError, ReglaNegocioError, ResultadoRegla

# Serializa "comprobar solape + insertar" para que dos peticiones simultáneas
# no puedan reservar el mismo hueco. Suficiente con un único proceso de uvicorn;
# con varios procesos sobre PostgreSQL usar una restricción EXCLUDE sobre el rango.
_candado_reservas = threading.Lock()


def _exigir(resultado: ResultadoRegla) -> None:
    if not resultado.ok:
        raise ReglaNegocioError(resultado)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def es_admin(token: str | None) -> bool:
    return bool(settings.ADMIN_TOKEN) and bool(token) and secrets.compare_digest(token, settings.ADMIN_TOKEN)


def exigir_admin(token: str | None) -> None:
    if not settings.ADMIN_TOKEN:
        raise PermisoError("Las funciones de operador están deshabilitadas: define ADMIN_TOKEN en .env.")
    if not es_admin(token):
        raise PermisoError("Token de operador inválido.")


# ---------- Catálogo ----------

def sembrar_salas(session: Session) -> None:
    """Crea las salas del catálogo que falten y sincroniza sus datos fijos.

    Conserva el estado de mantenimiento, que es un dato operativo.
    """
    for datos in catalogo.SALAS_NIVEL6:
        sala = session.get(Sala, datos["id"]) or Sala(id=datos["id"], nombre="", tipo="", descripcion="",
                                                       capacidad=0, color="")
        sala.nombre = datos["nombre"]
        sala.tipo = datos["tipo"]
        sala.descripcion = datos["descripcion"]
        sala.capacidad = datos["capacidad"]
        sala.color = datos["color"]
        sala.equipamiento = json.dumps(datos["equipamiento"], ensure_ascii=False)
        session.add(sala)
    session.commit()


def _sala(session: Session, sala_id: str) -> Sala:
    sala = session.get(Sala, sala_id)
    if not sala:
        raise NoEncontradoError(f"La sala '{sala_id}' no existe.")
    return sala


def sala_dict(sala: Sala) -> dict:
    return {
        "id": sala.id,
        "nombre": sala.nombre,
        "tipo": sala.tipo,
        "descripcion": sala.descripcion,
        "capacidad": sala.capacidad,
        "aforo_maximo": int(sala.capacidad * reglas.cfg.FACTOR_AFORO),
        "equipamiento": json.loads(sala.equipamiento),
        "color": sala.color,
        "estado": sala.estado.value,
        "motivo_bloqueo": sala.motivo_bloqueo,
    }


def reserva_dict(r: Reserva, privada: bool, ahora: datetime | None = None) -> dict:
    ahora = ahora or datetime.now()
    estado = r.estado.value
    if r.estado == EstadoReserva.activa and datetime.combine(r.fecha, r.hora_fin) <= ahora:
        estado = EstadoReserva.finalizada.value
    datos = {
        "id": r.id,
        "sala_id": r.sala_id,
        "fecha": r.fecha.isoformat(),
        "hora_inicio": f"{r.hora_inicio:%H:%M}",
        "hora_fin": f"{r.hora_fin:%H:%M}",
        "asistentes": r.asistentes,
        "estado": estado,
    }
    if privada:
        datos.update(
            solicitante=r.solicitante,
            motivo=r.motivo,
            creada_en=r.creada_en.isoformat(timespec="seconds"),
            cancelada_en=r.cancelada_en.isoformat(timespec="seconds") if r.cancelada_en else None,
        )
    return datos


# ---------- Estado del nivel ----------

def estado_nivel(session: Session, fecha: date, hora: time, ahora: datetime | None = None) -> dict:
    """Ocupación de las diez salas en el instante (fecha, hora) consultado."""
    salas = session.exec(select(Sala).order_by(Sala.nombre)).all()
    futuras = session.exec(
        select(Reserva)
        .where(Reserva.estado == EstadoReserva.activa, Reserva.fecha >= fecha)
        .order_by(Reserva.fecha, Reserva.hora_inicio)
    ).all()

    resultado = []
    for sala in salas:
        propias = [r for r in futuras if r.sala_id == sala.id]
        del_dia = [r for r in propias if r.fecha == fecha]
        actual = next((r for r in del_dia if r.hora_inicio <= hora < r.hora_fin), None)
        proxima = next(
            (r for r in propias if r.fecha > fecha or r.hora_inicio > hora), None
        )
        if sala.estado != EstadoEspacio.disponible:
            ocupacion = Ocupacion.mantenimiento
        elif actual:
            ocupacion = Ocupacion.reservada
        else:
            ocupacion = Ocupacion.disponible
        resultado.append({
            **sala_dict(sala),
            "ocupacion": ocupacion.value,
            "reserva_actual": reserva_dict(actual, False, ahora) if actual else None,
            "proxima_reserva": reserva_dict(proxima, False, ahora) if proxima else None,
            "reservas_dia": [reserva_dict(r, False, ahora) for r in del_dia],
        })

    def contar(o: Ocupacion) -> int:
        return sum(1 for s in resultado if s["ocupacion"] == o.value)

    return {
        "torre": catalogo.TORRE,
        "nivel": catalogo.NIVEL,
        "area_m2": catalogo.AREA_M2,
        "consulta": {"fecha": fecha.isoformat(), "hora": f"{hora:%H:%M}"},
        "resumen": {
            "total": len(resultado),
            "disponibles": contar(Ocupacion.disponible),
            "reservadas": contar(Ocupacion.reservada),
            "mantenimiento": contar(Ocupacion.mantenimiento),
        },
        "salas": resultado,
    }


# ---------- Reservas ----------

def reservas_de_sala(session: Session, sala_id: str, desde: date | None, hasta: date | None,
                     admin: bool) -> list[dict]:
    _sala(session, sala_id)
    consulta = select(Reserva).where(Reserva.sala_id == sala_id)
    if not admin:
        consulta = consulta.where(Reserva.estado == EstadoReserva.activa)
    if desde:
        consulta = consulta.where(Reserva.fecha >= desde)
    if hasta:
        consulta = consulta.where(Reserva.fecha <= hasta)
    filas = session.exec(consulta.order_by(Reserva.fecha, Reserva.hora_inicio)).all()
    return [reserva_dict(r, admin) for r in filas]


def crear_reserva(session: Session, sala_id: str, solicitante: str, fecha: date, hora_inicio: time,
                  hora_fin: time, asistentes: int, motivo: str,
                  ahora: datetime | None = None) -> tuple[Reserva, str]:
    ahora = ahora or datetime.now()
    hora_inicio = hora_inicio.replace(second=0, microsecond=0, tzinfo=None)
    hora_fin = hora_fin.replace(second=0, microsecond=0, tzinfo=None)

    with _candado_reservas:
        sala = _sala(session, sala_id)
        _exigir(reglas.validar_sala_operativa(sala.estado, sala.nombre))
        _exigir(reglas.validar_horario(fecha, hora_inicio, hora_fin, ahora))
        _exigir(reglas.validar_aforo(asistentes, sala.capacidad))

        confirmadas = session.exec(
            select(Reserva).where(
                Reserva.sala_id == sala_id,
                Reserva.fecha == fecha,
                Reserva.estado == EstadoReserva.activa,
            )
        ).all()
        _exigir(reglas.validar_sin_solape(hora_inicio, hora_fin,
                                          [(r.hora_inicio, r.hora_fin) for r in confirmadas]))

        token = secrets.token_urlsafe(18)
        reserva = Reserva(
            sala_id=sala_id, solicitante=solicitante, fecha=fecha, hora_inicio=hora_inicio,
            hora_fin=hora_fin, asistentes=asistentes, motivo=motivo, token_hash=_hash(token),
        )
        session.add(reserva)
        session.commit()
        session.refresh(reserva)
    return reserva, token


def reservas_por_tokens(session: Session, tokens: list[str]) -> list[dict]:
    hashes = {_hash(t) for t in tokens if t}
    if not hashes:
        return []
    filas = session.exec(
        select(Reserva).where(Reserva.token_hash.in_(hashes))  # type: ignore[attr-defined]
        .order_by(Reserva.fecha.desc(), Reserva.hora_inicio.desc())  # type: ignore[attr-defined]
    ).all()
    return [reserva_dict(r, True) for r in filas]


def todas_las_reservas(session: Session) -> list[dict]:
    filas = session.exec(
        select(Reserva).order_by(Reserva.fecha.desc(), Reserva.hora_inicio.desc())  # type: ignore[attr-defined]
    ).all()
    return [reserva_dict(r, True) for r in filas]


def cancelar_reserva(session: Session, reserva_id: int, token: str | None, token_admin: str | None,
                     ahora: datetime | None = None) -> Reserva:
    ahora = ahora or datetime.now()
    reserva = session.get(Reserva, reserva_id)
    if not reserva:
        raise NoEncontradoError(f"La reserva {reserva_id} no existe.")

    propietario = bool(token) and secrets.compare_digest(_hash(token), reserva.token_hash)
    if not (propietario or es_admin(token_admin)):
        raise PermisoError("Solo quien creó la reserva o un operador puede cancelarla.")
    if reserva.estado != EstadoReserva.activa:
        _exigir(ResultadoRegla(False, "RES-08", "La reserva ya estaba cancelada."))
    if datetime.combine(reserva.fecha, reserva.hora_fin) <= ahora:
        _exigir(ResultadoRegla(False, "RES-08", "La reserva ya finalizó y no se puede cancelar."))

    reserva.estado = EstadoReserva.cancelada
    reserva.cancelada_en = ahora
    session.add(reserva)
    session.commit()
    session.refresh(reserva)
    return reserva


def cambiar_mantenimiento(session: Session, sala_id: str, activo: bool, motivo: str | None) -> Sala:
    sala = _sala(session, sala_id)
    sala.estado = EstadoEspacio.mantenimiento if activo else EstadoEspacio.disponible
    sala.motivo_bloqueo = (motivo or "Mantenimiento programado") if activo else None
    sala.actualizada_en = datetime.now()
    session.add(sala)
    session.commit()
    session.refresh(sala)
    return sala
