"""Asistente: la IA interpreta, el recomendador y las reglas deciden, la persona confirma.

Flujo de una respuesta:
  1. app/ai/asistente.py convierte la conversación en una IntencionAsistente.
  2. Reservar / consultar → services/recomendador.py evalúa cada espacio con RN-01, RN-02,
     RN-04, RN-05 y el equipamiento, y propone los que menos capacidad desperdician.
  3. Reportar → triaje de incidencias (services/incidencias.py) y un borrador para confirmar.

Nada se guarda aquí: la UI crea la reserva con POST /api/reservas o la incidencia con
POST /api/incidencias cuando la persona confirma. Los textos sobre disponibilidad los
arma este módulo con los resultados de las reglas, nunca la IA.
"""
from datetime import date, datetime, time, timedelta

from sqlmodel import Session, select

from app.ai.asistente import Accion, IntencionAsistente, interpretar
from app.ai.proveedor import ErrorProveedor
from app.config import reglas as cfg
from app.config.equipamiento import equipamiento, tiene_equipos
from app.config.permisos import ROL_ADMIN
from app.models import Espacio, Recurso, Usuario, ahora
from app.rules import espacios as reglas
from app.rules.bloqueos import validar_espacio_operable
from app.services import incidencias as servicio_incidencias
from app.services import recomendador
from app.services.espacios import incidencias_abiertas_del_espacio

MAX_RECURSOS_EN_PROMPT = 80


def _hora(texto: str | None) -> time | None:
    return time.fromisoformat(texto) if texto else None


def _es_admin(usuario: Usuario | None) -> bool:
    return usuario is None or usuario.rol == ROL_ADMIN


def _resolver_solicitante(intencion: IntencionAsistente, usuario: Usuario | None) -> tuple[str | None, str | None]:
    """(solicitante, nota). Un usuario sin rol admin solo reserva a su nombre (config/permisos.py)."""
    if not _es_admin(usuario):
        nota = None
        if intencion.solicitante and intencion.solicitante.strip().lower() != usuario.nombre.lower():
            nota = f"Solo puedes reservar a tu nombre, así que la reserva quedará a nombre de {usuario.nombre}."
        return usuario.nombre, nota
    return (intencion.solicitante.strip() if intencion.solicitante else None), None


def _necesidad(intencion: IntencionAsistente, solicitante: str | None) -> tuple[recomendador.Necesidad | None, list[str]]:
    faltan = []
    if not intencion.asistentes:
        faltan.append("cuántas personas")
    if not intencion.fecha:
        faltan.append("qué día")
    inicio_h = _hora(intencion.hora_inicio)
    if not inicio_h:
        faltan.append("a qué hora empieza")
    fin_h = _hora(intencion.hora_fin)
    if not fin_h and not intencion.duracion_horas:
        faltan.append("a qué hora termina o cuánto dura")
    if faltan:
        return None, faltan

    dia = date.fromisoformat(intencion.fecha)
    inicio = datetime.combine(dia, inicio_h)
    fin = datetime.combine(dia, fin_h) if fin_h else inicio + timedelta(hours=intencion.duracion_horas)
    return recomendador.Necesidad(intencion.asistentes, inicio, fin, intencion.con_equipos, solicitante), []


def _texto_necesidad(n: recomendador.Necesidad) -> str:
    equipos = {True: " con computadores", False: " sin computadores (con TV)", None: ""}[n.con_equipos]
    return f"{n.asistentes} personas{equipos} el {n.inicio:%Y-%m-%d} de {n.inicio:%H:%M} a {n.fin:%H:%M}"


def _resumen_descartes(rec: recomendador.Recomendacion) -> str:
    motivos = {
        "RN-01": "ya reservados a esa hora",
        "RN-02": "sin capacidad suficiente",
        "RN-04": "fuera de servicio o con una incidencia abierta",
        "EQUIPOS": "sin el equipamiento pedido",
    }
    conteo: dict[str, int] = {}
    for ev in rec.descartados:
        conteo[ev.codigo] = conteo.get(ev.codigo, 0) + 1
    return "; ".join(f"{c} {motivos.get(cod, cod)}" for cod, c in conteo.items())


def _mensaje_reserva(rec: recomendador.Recomendacion, solicitado: dict | None) -> str:
    n = rec.necesidad
    if rec.error:
        return f"No puedo buscar ese horario: {rec.error.mensaje} ({rec.error.codigo})"
    partes = []
    if solicitado:
        if solicitado.get("reserva"):
            partes.append(f"{solicitado['nombre']} está libre y cumple lo que pides.")
        else:
            partes.append(f"{solicitado['nombre']} no sirve: {solicitado['motivo']} ({solicitado['codigo']})")
    if rec.recomendados:
        mejor = rec.recomendados[0]
        partes.append(
            f"Para {_texto_necesidad(n)} el más adecuado es {mejor.espacio.nombre}: {mejor.motivo}"
        )
        if len(rec.recomendados) > 1:
            otros = ", ".join(ev.espacio.nombre for ev in rec.recomendados[1:])
            partes.append(f"También sirven: {otros}.")
        if not n.solicitante:
            partes.append("¿A nombre de quién hago la reserva?")
        else:
            partes.append(f"Confirma para reservar a nombre de {n.solicitante}.")
    else:
        partes.append(f"Ningún espacio sirve para {_texto_necesidad(n)}.")
        if rec.descartados:
            partes.append(f"Descartados: {_resumen_descartes(rec)}.")
        if rec.alternativas:
            horas = ", ".join(f"{alt.inicio:%H:%M} en {ev.espacio.nombre}" for alt, ev in rec.alternativas)
            partes.append(f"Ese día hay lugar a otras horas: {horas}.")
    return " ".join(partes)


def _espacios_que_sirven(db: Session, espacios: list[Espacio], intencion: IntencionAsistente) -> list[dict]:
    """Consulta sin horario: espacios operables con capacidad y equipamiento, del más ajustado al más grande."""
    encontrados = []
    for e in espacios:
        if not validar_espacio_operable(e.nombre, e.estado, incidencias_abiertas_del_espacio(db, e.id)).ok:
            continue
        if intencion.con_equipos is not None and tiene_equipos(e.id) != intencion.con_equipos:
            continue
        permitido = reglas.aforo_permitido(e.aforo)
        if intencion.asistentes and permitido < intencion.asistentes:
            continue
        encontrados.append({
            "espacio_id": e.id, "nombre": e.nombre, "tipo": e.tipo, "aforo": e.aforo,
            "aforo_permitido": permitido, "equipamiento": equipamiento(e.id),
        })
    encontrados.sort(key=lambda x: (x["aforo_permitido"], x["nombre"]))
    return encontrados


def _titulo_incidencia(descripcion: str) -> str:
    titulo = " ".join(descripcion.split())
    return titulo if len(titulo) <= 80 else titulo[:77].rstrip() + "…"


def _reportar(db: Session, intencion: IntencionAsistente, ids_espacios: set, ids_recursos: set) -> tuple[str, dict | None, list[str]]:
    descripcion = (intencion.descripcion_falla or "").strip()
    if len(descripcion) < 10:
        return "Cuéntame qué falla y dónde (por ejemplo: 'el TV de Cosmos no enciende').", None, ["qué falla y dónde"]
    descripcion = descripcion[: cfg.MAX_LARGO_DESCRIPCION]
    espacio_id = intencion.espacio_id if intencion.espacio_id in ids_espacios else None
    recurso_id = intencion.recurso_id if intencion.recurso_id in ids_recursos else None
    borrador = {
        "titulo": _titulo_incidencia(descripcion),
        "descripcion": descripcion,
        "espacio_id": espacio_id,
        "recurso_id": recurso_id,
        "propuesta_ia": None,
        "requiere_revision": True,
    }
    try:
        propuesta = servicio_incidencias.ejecutar_triaje(db, descripcion, espacio_id, recurso_id)
    except ErrorProveedor:
        return ("Preparé el reporte, pero la IA no pudo clasificarlo: elige la categoría y la prioridad antes de enviarlo.",
                borrador, [])
    requiere_revision = propuesta.pop("requiere_revision")
    borrador.update(propuesta_ia=propuesta, requiere_revision=requiere_revision, **{
        k: propuesta[k] for k in ("categoria", "prioridad", "area_responsable")
    })
    lugar = espacio_id or recurso_id or "sin lugar identificado"
    aviso = " La confianza es baja: revísalo antes de enviar." if requiere_revision else ""
    return (f"Preparé el reporte ({lugar}): prioridad {propuesta['prioridad']}, área {propuesta['area_responsable']}. "
            f"Confírmalo para registrarlo.{aviso}", borrador, [])


def conversar(db: Session, mensajes: list[dict], usuario: Usuario | None) -> dict:
    espacios = list(db.exec(select(Espacio).order_by(Espacio.nombre)))
    recursos = list(db.exec(select(Recurso).order_by(Recurso.id).limit(MAX_RECURSOS_EN_PROMPT)))
    intencion = interpretar(db, mensajes, espacios, recursos, ahora())

    respuesta: dict = {
        "accion": intencion.accion.value,
        "intencion": intencion.model_dump(mode="json"),
        "mensaje": intencion.respuesta,
        "faltan": [],
        "recomendacion": None,
        "solicitado": None,
        "espacios": None,
        "incidencia": None,
    }

    if intencion.accion == Accion.reportar:
        mensaje, borrador, faltan = _reportar(db, intencion, {e.id for e in espacios}, {r.id for r in recursos})
        respuesta.update(mensaje=mensaje, incidencia=borrador, faltan=faltan)
        return respuesta

    if intencion.accion not in (Accion.reservar, Accion.consultar):
        return respuesta

    solicitante, nota = _resolver_solicitante(intencion, usuario)
    necesidad, faltan = _necesidad(intencion, solicitante)

    if necesidad is None:
        # Sin horario completo no se puede saber qué está libre: se muestran los que cumplen
        # capacidad y equipamiento, y se piden los datos que faltan para reservar.
        sirven = _espacios_que_sirven(db, espacios, intencion)
        respuesta.update(espacios=sirven, faltan=faltan)
        if intencion.accion == Accion.consultar:
            nombres = ", ".join(e["nombre"] for e in sirven[:5]) or "ninguno"
            respuesta["mensaje"] = (f"Espacios que cumplen, del más ajustado al más grande: {nombres}. "
                                    "Dime día y hora para ver cuáles están libres.")
        else:
            respuesta["mensaje"] = f"Para recomendarte el mejor espacio me falta saber: {', '.join(faltan)}."
        return respuesta

    rec = recomendador.recomendar(db, necesidad)
    solicitado = None
    pedido = next((e for e in espacios if e.id == intencion.espacio_id), None)
    if pedido and not rec.error:
        solicitado = recomendador.evaluar(db, pedido, necesidad).como_dict(necesidad)
    respuesta.update(recomendacion=rec.como_dict(), solicitado=solicitado)
    mensaje = _mensaje_reserva(rec, solicitado)
    if nota:
        mensaje += f" {nota}"
    if not solicitante and rec.recomendados:
        respuesta["faltan"] = ["a nombre de quién"]
    respuesta["mensaje"] = mensaje
    return respuesta
