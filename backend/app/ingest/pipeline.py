"""Pipeline de ingesta: leer → normalizar → validar → cargar → reportar.

Los archivos de data/raw/ nunca se modifican. Los registros inválidos van a
cuarentena con su motivo; los válidos se cargan en una sola transacción.
"""
from pathlib import Path

from sqlmodel import Session

from app.config import settings
from app.config.catalogos import EstadoEspacio, TipoEspacio
from app.ingest import mapeo
from app.ingest.lector import ErrorLectura, leer_archivo
from app.ingest.normalizar import ValorInvalido, a_entero_positivo, a_enum, texto
from app.ingest.reporte import ReporteCarga
from app.models import Espacio
from app.repositories.auditoria import auditar


def ejecutar(db: Session, carpeta: Path = settings.DATA_RAW) -> ReporteCarga:
    reporte = ReporteCarga()

    filas = _leer(carpeta, "espacios", reporte)
    if filas is not None:
        cargar_espacios(db, filas, reporte)

    db.commit()
    return reporte


def _leer(carpeta: Path, entidad: str, reporte: ReporteCarga) -> list[dict] | None:
    ruta = carpeta / mapeo.ARCHIVOS[entidad]
    try:
        registros, meta = leer_archivo(ruta)
    except ErrorLectura as e:
        reporte.archivos.append({"archivo": ruta.name, "entidad": entidad, "error": str(e)})
        return None
    if not isinstance(registros, list):
        reporte.archivos.append({"archivo": ruta.name, "entidad": entidad, "error": "se esperaba una lista de registros"})
        return None
    reporte.archivos.append({**meta, "entidad": entidad})
    return registros


def cargar_espacios(db: Session, filas: list[dict], reporte: ReporteCarga) -> None:
    rep = reporte.entidad("espacios")
    vistos: dict[str, int] = {}

    for n, fila in enumerate(filas, start=1):
        rep.leidos += 1
        nombre_crudo = mapeo.campo(fila, "espacios", "nombre")
        try:
            nombre = texto(nombre_crudo, "nombre", max_largo=80)
            id_espacio = mapeo.slug(nombre)
            if not id_espacio:
                raise ValorInvalido(f"nombre: '{nombre}' no genera un identificador válido")
            if id_espacio in vistos:
                raise ValorInvalido(f"nombre: duplicado de la fila {vistos[id_espacio]}")

            aforo = a_entero_positivo(mapeo.campo(fila, "espacios", "aforo"), "aforo")

            tipo_crudo = mapeo.campo(fila, "espacios", "tipo")
            if tipo_crudo:
                tipo = a_enum(tipo_crudo, TipoEspacio, "tipo").value
            else:
                tipo = mapeo.tipo_por_aforo(aforo)

            estado_crudo = mapeo.campo(fila, "espacios", "estado")
            estado = a_enum(estado_crudo, EstadoEspacio, "estado").value if estado_crudo else EstadoEspacio.disponible.value

            ubicacion = texto(mapeo.campo(fila, "espacios", "ubicacion"), "ubicacion", obligatorio=False)
        except ValorInvalido as e:
            rep.rechazar(n, nombre_crudo, str(e), fila)
            continue

        vistos[id_espacio] = n
        db.add(Espacio(id=id_espacio, nombre=nombre, tipo=tipo, aforo=aforo, estado=estado, ubicacion=ubicacion))
        auditar(db, "espacio", id_espacio, "ingesta", None, estado, detalle=f"fila {n}")
        rep.cargados += 1
