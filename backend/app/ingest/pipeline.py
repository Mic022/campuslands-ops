"""Pipeline de ingesta: leer → normalizar → validar → cargar → reportar.

Los archivos de data/raw/ nunca se modifican. Los registros inválidos van a
cuarentena con su motivo; los válidos se cargan en una sola transacción.

Reglas de reconciliación entre préstamos y recursos (quedan en el reporte y en auditoría):
  R1. Préstamo activo sobre un recurso "disponible" → el préstamo manda: el recurso pasa a "prestado".
  R2. Préstamo activo sobre un recurso en mantenimiento, dañado o de baja → el préstamo va a cuarentena.
  R3. Varios préstamos activos del mismo recurso → se conserva el de salida más antigua; el resto a cuarentena.
  R4. Recurso "prestado" sin ningún préstamo activo → el recurso pasa a "disponible".
"""
from datetime import datetime
from pathlib import Path

from sqlmodel import Session

from app.config import settings
from app.config.catalogos import EstadoEspacio, EstadoPrestamo, EstadoRecurso, TipoEspacio
from app.ingest import mapeo
from app.ingest.lector import ErrorLectura, leer_archivo
from app.ingest.normalizar import ValorInvalido, a_entero_positivo, a_enum, a_fecha, clave, texto
from app.ingest.reporte import ReporteCarga
from app.models import Espacio, Prestamo, Recurso
from app.repositories.auditoria import auditar

ESTADOS_SIN_PRESTAMO = {EstadoRecurso.mantenimiento.value, EstadoRecurso.danado.value, EstadoRecurso.baja.value}


def ejecutar(db: Session, carpeta: Path = settings.DATA_RAW) -> ReporteCarga:
    reporte = ReporteCarga()

    espacios: dict[str, Espacio] = {}
    filas = _leer(carpeta, "espacios", reporte)
    if filas is not None:
        espacios = cargar_espacios(db, filas, reporte)

    recursos: dict[str, Recurso] = {}
    filas = _leer(carpeta, "recursos", reporte)
    if filas is not None:
        recursos = cargar_recursos(db, filas, reporte, espacios)
        db.flush()

    con_prestamo_activo: set[str] = set()
    filas = _leer(carpeta, "prestamos", reporte)
    if filas is not None:
        con_prestamo_activo = cargar_prestamos(db, filas, reporte, recursos)
    if recursos:
        reconciliar_recursos_sin_prestamo(db, reporte, recursos, con_prestamo_activo)

    db.commit()
    return reporte


def _leer(carpeta: Path, entidad: str, reporte: ReporteCarga) -> list[dict] | None:
    ruta = carpeta / mapeo.ARCHIVOS[entidad]
    if entidad in mapeo.OPCIONALES and not ruta.exists():
        reporte.archivos.append({"archivo": ruta.name, "entidad": entidad, "aviso": "no entregado"})
        return None
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


# ---------- Espacios ----------

def cargar_espacios(db: Session, filas: list[dict], reporte: ReporteCarga) -> dict[str, Espacio]:
    rep = reporte.entidad("espacios")
    cargados: dict[str, Espacio] = {}
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
        espacio = Espacio(id=id_espacio, nombre=nombre, tipo=tipo, aforo=aforo, estado=estado, ubicacion=ubicacion)
        db.add(espacio)
        cargados[id_espacio] = espacio
        auditar(db, "espacio", id_espacio, "ingesta", None, estado, detalle=f"fila {n}")
        rep.cargados += 1
    return cargados


# ---------- Recursos ----------

def _resolver_espacio(valor, espacios: dict[str, Espacio]) -> str | None:
    """'Cosmos', 'cosmos' o 'Salón Cosmos' → 'cosmos'. Lanza ValorInvalido si no existe."""
    if not valor or not str(valor).strip():
        return None
    candidato = mapeo.slug(str(valor))
    if candidato in espacios:
        return candidato
    por_nombre = {clave(e.nombre): e.id for e in espacios.values()}
    if clave(valor) in por_nombre:
        return por_nombre[clave(valor)]
    raise ValorInvalido(f"espacio: '{valor}' no existe")


def cargar_recursos(db: Session, filas: list[dict], reporte: ReporteCarga, espacios: dict[str, Espacio]) -> dict[str, Recurso]:
    rep = reporte.entidad("recursos")
    cargados: dict[str, Recurso] = {}       # clave normalizada del id → recurso
    vistos: dict[str, int] = {}
    seriales: dict[str, int] = {}

    for n, fila in enumerate(filas, start=1):
        rep.leidos += 1
        id_crudo = mapeo.campo(fila, "recursos", "id")
        try:
            id_recurso = texto(id_crudo, "id", max_largo=40)
            k = clave(id_recurso)
            if k in vistos:
                raise ValorInvalido(f"id: duplicado de la fila {vistos[k]}")

            tipo = texto(mapeo.campo(fila, "recursos", "tipo"), "tipo", max_largo=60)
            nombre = texto(mapeo.campo(fila, "recursos", "nombre"), "nombre", obligatorio=False, max_largo=120)

            serial = texto(mapeo.campo(fila, "recursos", "serial"), "serial", obligatorio=False, max_largo=80)
            if serial and clave(serial) in seriales:
                raise ValorInvalido(f"serial: duplicado de la fila {seriales[clave(serial)]}")

            estado_crudo = mapeo.campo(fila, "recursos", "estado")
            estado = (
                a_enum(estado_crudo, EstadoRecurso, "estado", mapeo.SINONIMOS_ESTADO_RECURSO).value
                if estado_crudo else EstadoRecurso.disponible.value
            )
            espacio_id = _resolver_espacio(mapeo.campo(fila, "recursos", "espacio"), espacios)
        except ValorInvalido as e:
            rep.rechazar(n, id_crudo, str(e), fila)
            continue

        vistos[k] = n
        if serial:
            seriales[clave(serial)] = n
        recurso = Recurso(id=id_recurso, tipo=tipo, nombre=nombre, serial=serial, estado=estado, espacio_id=espacio_id)
        db.add(recurso)
        cargados[k] = recurso
        auditar(db, "recurso", id_recurso, "ingesta", None, estado, detalle=f"fila {n}")
        rep.cargados += 1
    return cargados


# ---------- Préstamos ----------

def cargar_prestamos(db: Session, filas: list[dict], reporte: ReporteCarga, recursos: dict[str, Recurso]) -> set[str]:
    """Carga los préstamos y devuelve los ids de recursos que quedaron con un préstamo activo."""
    rep = reporte.entidad("prestamos")
    rep_recursos = reporte.entidad("recursos")
    validos: list[tuple[int, dict, Recurso, dict]] = []

    # 1. Validación registro por registro.
    for n, fila in enumerate(filas, start=1):
        rep.leidos += 1
        recurso_crudo = mapeo.campo(fila, "prestamos", "recurso")
        try:
            ref = texto(recurso_crudo, "recurso", max_largo=40)
            recurso = recursos.get(clave(ref))
            if recurso is None:
                raise ValorInvalido(f"recurso: '{ref}' no existe")
            solicitante = texto(mapeo.campo(fila, "prestamos", "solicitante"), "solicitante", max_largo=120)
            salida = a_fecha(mapeo.campo(fila, "prestamos", "salida"), "salida")
            esperada = a_fecha(mapeo.campo(fila, "prestamos", "devolucion_esperada"), "devolucion_esperada")
            if esperada <= salida:
                raise ValorInvalido("devolucion_esperada: debe ser posterior a la salida")
            real = a_fecha(mapeo.campo(fila, "prestamos", "devolucion_real"), "devolucion_real", obligatorio=False)
            if real and real < salida:
                raise ValorInvalido("devolucion_real: es anterior a la salida")

            estado_crudo = mapeo.campo(fila, "prestamos", "estado")
            if estado_crudo:
                estado = a_enum(estado_crudo, EstadoPrestamo, "estado", mapeo.SINONIMOS_ESTADO_PRESTAMO).value
            else:
                estado = EstadoPrestamo.devuelto.value if real else EstadoPrestamo.activo.value
            if estado == EstadoPrestamo.devuelto.value and not real:
                raise ValorInvalido("estado: 'devuelto' sin fecha de devolución real")
            if estado == EstadoPrestamo.activo.value and real:
                raise ValorInvalido("estado: 'activo' pero tiene fecha de devolución real")
        except ValorInvalido as e:
            rep.rechazar(n, recurso_crudo, str(e), fila)
            continue
        datos = {"solicitante": solicitante, "salida": salida, "devolucion_esperada": esperada,
                 "devolucion_real": real, "estado": estado}
        validos.append((n, fila, recurso, datos))

    # 2. Entre registros: un recurso solo puede tener un préstamo activo (R3, conserva el más antiguo).
    activo_por_recurso: dict[str, tuple[int, datetime]] = {}
    for n, _, recurso, datos in sorted(validos, key=lambda v: v[3]["salida"]):
        if datos["estado"] == EstadoPrestamo.activo.value and recurso.id not in activo_por_recurso:
            activo_por_recurso[recurso.id] = (n, datos["salida"])

    for n, fila, recurso, datos in validos:
        if datos["estado"] == EstadoPrestamo.activo.value:
            fila_ganadora = activo_por_recurso[recurso.id][0]
            if n != fila_ganadora:
                rep.rechazar(n, recurso.id, f"recurso: ya tiene un préstamo activo más antiguo (fila {fila_ganadora})", fila)
                continue
            # R2: no se presta lo que está fuera de servicio.
            if recurso.estado in ESTADOS_SIN_PRESTAMO:
                rep.rechazar(n, recurso.id, f"recurso: está en '{recurso.estado}' y no puede tener un préstamo activo", fila)
                del activo_por_recurso[recurso.id]
                continue
            # R1: el préstamo activo manda.
            if recurso.estado == EstadoRecurso.disponible.value:
                recurso.estado = EstadoRecurso.prestado.value
                rep_recursos.corregir(n, recurso.id, f"R1: tenía un préstamo activo (fila {n} de préstamos); 'disponible' → 'prestado'")
                auditar(db, "recurso", recurso.id, "reconciliar", EstadoRecurso.disponible.value,
                        EstadoRecurso.prestado.value, detalle=f"R1: préstamo activo fila {n}")

        prestamo = Prestamo(recurso_id=recurso.id, **datos)
        db.add(prestamo)
        db.flush()
        auditar(db, "prestamo", prestamo.id, "ingesta", None, datos["estado"], detalle=f"fila {n}")
        rep.cargados += 1

    return set(activo_por_recurso)


def reconciliar_recursos_sin_prestamo(
    db: Session, reporte: ReporteCarga, recursos: dict[str, Recurso], con_prestamo_activo: set[str]
) -> None:
    """R4: un recurso 'prestado' sin préstamo activo vuelve a 'disponible'."""
    rep = reporte.entidad("recursos")
    for recurso in recursos.values():
        if recurso.estado == EstadoRecurso.prestado.value and recurso.id not in con_prestamo_activo:
            recurso.estado = EstadoRecurso.disponible.value
            rep.corregir(0, recurso.id, "R4: figuraba 'prestado' sin préstamo activo; 'prestado' → 'disponible'")
            auditar(db, "recurso", recurso.id, "reconciliar", EstadoRecurso.prestado.value,
                    EstadoRecurso.disponible.value, detalle="R4: sin préstamo activo")
