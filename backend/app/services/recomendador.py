"""Optimización de espacios: dado qué se necesita, qué espacio conviene y por qué.

No usa IA. Evalúa cada espacio con las mismas reglas que una reserva real
(RN-04 operable, RN-05 horario, RN-02 aforo, RN-01 sin solapamiento) más el
equipamiento pedido, y ordena los que pasan por el que menos capacidad desperdicia.
Así un salón de 40 no se gasta en un grupo de 6 si hay uno de 8 libre.

La recomendación no reserva: la reserva la crea la persona con POST /api/reservas,
que vuelve a validar todo dentro de la transacción.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.config import reglas as cfg
from app.config.equipamiento import equipamiento, tiene_equipos
from app.models import Espacio, ahora
from app.rules import espacios as reglas
from app.rules.base import ResultadoRegla
from app.rules.bloqueos import validar_espacio_operable
from app.services.espacios import _reservas_activas_que_cruzan, incidencias_abiertas_del_espacio

MAX_RECOMENDACIONES = 3


@dataclass
class Necesidad:
    asistentes: int
    inicio: datetime
    fin: datetime
    con_equipos: bool | None = None     # None: le da igual
    solicitante: str | None = None


@dataclass
class Evaluacion:
    espacio: Espacio
    ok: bool
    codigo: str = ""
    motivo: str = ""
    sobrantes: int = 0

    def como_dict(self, necesidad: Necesidad) -> dict:
        e = self.espacio
        datos = {
            "espacio_id": e.id,
            "nombre": e.nombre,
            "tipo": e.tipo,
            "aforo": e.aforo,
            "aforo_permitido": reglas.aforo_permitido(e.aforo),
            "equipamiento": equipamiento(e.id),
            "motivo": self.motivo,
        }
        if self.ok:
            datos["inicio"] = necesidad.inicio.isoformat(timespec="minutes")
            datos["fin"] = necesidad.fin.isoformat(timespec="minutes")
            datos["reserva"] = {
                "espacio_id": e.id,
                "solicitante": necesidad.solicitante,
                "inicio": datos["inicio"],
                "fin": datos["fin"],
                "asistentes": necesidad.asistentes,
            }
        else:
            datos["codigo"] = self.codigo
        return datos


@dataclass
class Recomendacion:
    necesidad: Necesidad
    recomendados: list[Evaluacion] = field(default_factory=list)
    descartados: list[Evaluacion] = field(default_factory=list)
    alternativas: list[tuple[Necesidad, Evaluacion]] = field(default_factory=list)
    error: ResultadoRegla | None = None     # la necesidad en sí no es válida (p. ej. horario)

    def como_dict(self) -> dict:
        n = self.necesidad
        return {
            "necesidad": {
                "asistentes": n.asistentes,
                "inicio": n.inicio.isoformat(timespec="minutes"),
                "fin": n.fin.isoformat(timespec="minutes"),
                "con_equipos": n.con_equipos,
                "solicitante": n.solicitante,
            },
            "error": {"codigo": self.error.codigo, "mensaje": self.error.mensaje} if self.error else None,
            "recomendados": [ev.como_dict(n) for ev in self.recomendados],
            "descartados": [ev.como_dict(n) for ev in self.descartados],
            "alternativas": [ev.como_dict(alt) for alt, ev in self.alternativas],
        }


def _texto_equipamiento(espacio_id: str) -> str:
    return "con computadores" if tiene_equipos(espacio_id) else "sin computadores, con TV"


def evaluar(db: Session, espacio: Espacio, n: Necesidad) -> Evaluacion:
    """Aplica a un espacio las reglas de una reserva, en el mismo orden que crear_reserva."""
    operable = validar_espacio_operable(espacio.nombre, espacio.estado, incidencias_abiertas_del_espacio(db, espacio.id))
    if not operable.ok:
        return Evaluacion(espacio, False, operable.codigo, operable.mensaje)

    if n.con_equipos is not None and tiene_equipos(espacio.id) != n.con_equipos:
        pedido = "con computadores" if n.con_equipos else "sin computadores"
        return Evaluacion(espacio, False, "EQUIPOS", f"Se pidió un espacio {pedido} y este está {_texto_equipamiento(espacio.id)}.")

    aforo = reglas.validar_aforo(n.asistentes, espacio.aforo)
    if not aforo.ok:
        return Evaluacion(espacio, False, aforo.codigo, aforo.mensaje)

    libre = reglas.validar_sin_solapamiento(n.inicio, n.fin, _reservas_activas_que_cruzan(db, espacio.id, n.inicio, n.fin))
    if not libre.ok:
        return Evaluacion(espacio, False, libre.codigo, libre.mensaje)

    permitido = reglas.aforo_permitido(espacio.aforo)
    sobrantes = permitido - n.asistentes
    motivo = (
        f"Admite {permitido} personas para {n.asistentes} (sobran {sobrantes}), "
        f"{_texto_equipamiento(espacio.id)} y libre de {n.inicio:%H:%M} a {n.fin:%H:%M}."
    )
    return Evaluacion(espacio, True, motivo=motivo, sobrantes=sobrantes)


def _orden(ev: Evaluacion) -> tuple:
    # Primero el que menos capacidad desperdicia; a igualdad, el de nombre alfabético (orden estable).
    return (ev.sobrantes, ev.espacio.nombre)


def recomendar(db: Session, n: Necesidad, buscar_alternativas: bool = True) -> Recomendacion:
    rec = Recomendacion(n)
    horario = reglas.validar_horario(n.inicio, n.fin, ahora())
    if not horario.ok:
        rec.error = horario
        return rec

    espacios = list(db.exec(select(Espacio).order_by(Espacio.nombre)))
    evaluaciones = [evaluar(db, e, n) for e in espacios]
    validos = sorted((ev for ev in evaluaciones if ev.ok), key=_orden)
    rec.recomendados = validos[:MAX_RECOMENDACIONES]
    rec.descartados = [ev for ev in evaluaciones if not ev.ok]

    if not rec.recomendados and buscar_alternativas:
        rec.alternativas = _alternativas_mismo_dia(db, espacios, n)
    return rec


def _alternativas_mismo_dia(db: Session, espacios: list[Espacio], n: Necesidad) -> list[tuple[Necesidad, Evaluacion]]:
    """Si nada sirve a esa hora, los horarios del mismo día más cercanos al pedido (cada 30 min, misma duración)."""
    duracion = n.fin - n.inicio
    dia = n.inicio.replace(hour=0, minute=0, second=0, microsecond=0)
    candidato = dia + timedelta(hours=cfg.HORA_APERTURA)
    ultimo_inicio = dia + timedelta(hours=cfg.HORA_CIERRE) - duracion
    momento_actual = ahora()
    candidatos = []
    while candidato <= ultimo_inicio:
        if candidato != n.inicio and candidato >= momento_actual:
            candidatos.append(candidato)
        candidato += timedelta(minutes=30)
    candidatos.sort(key=lambda c: (abs(c - n.inicio), c))

    encontrados: list[tuple[Necesidad, Evaluacion]] = []
    for inicio in candidatos:
        otra = Necesidad(n.asistentes, inicio, inicio + duracion, n.con_equipos, n.solicitante)
        validos = sorted((ev for ev in (evaluar(db, e, otra) for e in espacios) if ev.ok), key=_orden)
        if validos:
            encontrados.append((otra, validos[0]))
            if len(encontrados) == MAX_RECOMENDACIONES:
                break
    encontrados.sort(key=lambda par: par[0].inicio)
    return encontrados
