"""Guion de la defensa: dispara cada error de espacios y recursos y explica por qué ocurre.

Uso (desde backend/, con la API corriendo):
    python -m scripts.demo_errores                        # contra http://127.0.0.1:8000
    python -m scripts.demo_errores --url http://127.0.0.1:8000
    python -m scripts.demo_errores --solo RN-06           # solo los casos de un código

Por cada petición muestra el código que devolvió la API, su mensaje y el porqué de la
regla. Los límites se leen de GET /api/reglas, así que tras cambiar config/reglas.py
(uvicorn --reload recarga solo) basta con volver a correrlo para ver la regla nueva.

Lo que crea lo deja como estaba: cancela sus reservas, devuelve sus préstamos y
restaura los estados. Los recursos de prueba (DEMO-ERR-*) quedan en el inventario,
disponibles, para reutilizarlos en la siguiente corrida.
"""
import argparse
import json
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from urllib.parse import urlencode

SOLICITANTE = "Demo Errores"
SOLICITANTE_2 = "Demo Errores Dos"
PREFIJO_RECURSO = "DEMO-ERR-"
ESPACIO_DEMO = "Sala Demo Errores"

# Pedir(metodo, ruta, cuerpo) -> (status, json). Se inyecta para poder probar el guion sin servidor.
Pedir = Callable[[str, str, dict | None], tuple[int, object]]


def pedir_http(base: str) -> Pedir:
    def pedir(metodo: str, ruta: str, cuerpo: dict | None = None) -> tuple[int, object]:
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
        req = urllib.request.Request(
            base.rstrip("/") + ruta, data=datos, method=metodo, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.status, _json(r.read())
        except urllib.error.HTTPError as e:
            return e.code, _json(e.read())

    return pedir


def _json(crudo: bytes) -> object:
    try:
        return json.loads(crudo) if crudo else None
    except ValueError:
        return None


@dataclass
class Caso:
    esperado: str
    titulo: str
    metodo: str
    ruta: str
    cuerpo: dict | None
    porque: str
    status: int = 0
    respuesta: object = None

    @property
    def obtenido(self) -> str | None:
        return self.respuesta.get("codigo") if isinstance(self.respuesta, dict) else None

    @property
    def ok(self) -> bool:
        return self.obtenido == self.esperado


class FalloPreparacion(Exception):
    """Una petición de preparación (no la que se quiere hacer fallar) no salió bien."""


@dataclass
class Demo:
    pedir: Pedir
    solo: str | None = None
    salida: Callable[[str], None] = print
    casos: list[Caso] = field(default_factory=list)
    _deshacer: list[tuple[str, Callable[[], None]]] = field(default_factory=list)

    # ---------- Utilidades ----------

    def exigir(self, metodo: str, ruta: str, cuerpo: dict | None = None) -> dict:
        status, resp = self.pedir(metodo, ruta, cuerpo)
        if status >= 400:
            raise FalloPreparacion(f"{metodo} {ruta} → {status} {resp}")
        return resp

    def deshacer_luego(self, que: str, accion: Callable[[], None]) -> None:
        self._deshacer.append((que, accion))

    def probar(self, esperado: str, titulo: str, metodo: str, ruta: str, cuerpo: dict | None, porque: str) -> Caso | None:
        if self.solo and not esperado.startswith(self.solo):
            return None
        caso = Caso(esperado, titulo, metodo, ruta, cuerpo, porque)
        caso.status, caso.respuesta = self.pedir(metodo, ruta, cuerpo)
        self.casos.append(caso)
        self._imprimir(caso)
        return caso

    def _imprimir(self, c: Caso) -> None:
        marca = "✓" if c.ok else f"✗ se esperaba {c.esperado}"
        mensaje = c.respuesta.get("mensaje") if isinstance(c.respuesta, dict) else c.respuesta
        self.salida(f"\n── {c.esperado} · {c.titulo}")
        self.salida(f"   Petición : {c.metodo} {c.ruta}" + (f"  {json.dumps(c.cuerpo, ensure_ascii=False)}" if c.cuerpo else ""))
        self.salida(f"   Respuesta: HTTP {c.status} · código {c.obtenido or '—'}  {marca}")
        self.salida(f"   Mensaje  : {mensaje}")
        if isinstance(c.respuesta, dict) and c.respuesta.get("detalles"):
            for d in c.respuesta["detalles"]:
                self.salida(f"              · {d.get('campo')}: {d.get('mensaje')}")
        self.salida(f"   Por qué  : {c.porque}")

    # ---------- Recorrido ----------

    def ejecutar(self) -> bool:
        self.reglas = self.exigir("GET", "/api/reglas")
        r = self.reglas
        self.salida(
            f"Reglas vigentes: horario {r['hora_apertura']}:00–{r['hora_cierre']}:00 · "
            f"máx. {r['max_horas_reserva']} h por reserva · factor de aforo {r['factor_aforo']} · "
            f"máx. {r['max_prestamos_activos']} préstamos activos"
        )
        try:
            self._limpiar_restos()
            self.salida("\n================ ESPACIOS Y RESERVAS ================")
            self.errores_reservas()
            self.salida("\n================ RECURSOS Y PRÉSTAMOS ================")
            self.errores_prestamos()
        finally:
            self._restaurar()
        self._resumen()
        return all(c.ok for c in self.casos)

    def _restaurar(self) -> None:
        while self._deshacer:
            que, accion = self._deshacer.pop()
            try:
                accion()
            except Exception as e:  # la limpieza nunca debe tapar el resultado
                self.salida(f"⚠ No se pudo {que}: {e}")

    def _resumen(self) -> None:
        bien = sum(c.ok for c in self.casos)
        self.salida(f"\n================ RESUMEN: {bien}/{len(self.casos)} errores como se esperaba ================")
        for c in self.casos:
            self.salida(f"  {'✓' if c.ok else '✗'} {c.esperado:<8} HTTP {c.status}  {c.titulo}")

    def _limpiar_restos(self) -> None:
        """Si una corrida anterior se cortó, devuelve sus préstamos y cancela sus reservas."""
        for quien in (SOLICITANTE, SOLICITANTE_2):
            consulta = urlencode({"solicitante": quien, "estado": "activo"})
            for p in self.exigir("GET", f"/api/prestamos?{consulta}"):
                self.exigir("POST", f"/api/prestamos/{p['id']}/devolucion", {"estado_recurso": "disponible"})
        consulta = urlencode({"solicitante": SOLICITANTE, "estado": "activa"})
        for res in self.exigir("GET", f"/api/reservas?{consulta}"):
            self.exigir("POST", f"/api/reservas/{res['id']}/cancelar")

    # ---------- Espacios: RN-01, RN-02, RN-04, RN-05 ----------

    def _hora(self, dia: datetime, hora: float) -> str:
        return (dia + timedelta(hours=hora)).isoformat(timespec="minutes")

    def _reserva_base(self, apertura: int, duracion: int) -> tuple[dict, dict, datetime]:
        """Una reserva real de 2 personas en un espacio y día libres; contra ella chocan los casos."""
        espacios = [e for e in self.exigir("GET", "/api/espacios") if e["estado"] == "disponible" and e["aforo_permitido"] >= 2]
        if not espacios:
            espacios = [self._espacio_demo()]
        base = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=90)
        for espacio in espacios:
            for d in range(30):
                dia = base + timedelta(days=d)
                cuerpo = {
                    "espacio_id": espacio["id"], "solicitante": SOLICITANTE, "asistentes": 2,
                    "inicio": self._hora(dia, apertura), "fin": self._hora(dia, apertura + duracion),
                }
                status, resp = self.pedir("POST", "/api/reservas", cuerpo)
                if status == 201:
                    self.deshacer_luego(f"cancelar la reserva #{resp['id']}", lambda i=resp["id"]: self.pedir(
                        "POST", f"/api/reservas/{i}/cancelar", None))
                    return espacio, resp, dia
                if resp.get("codigo") != "RN-01":   # bloqueado o sin aforo: probar otro espacio
                    break
        raise FalloPreparacion("No se encontró un espacio y horario libres para la reserva base.")

    def _espacio_demo(self) -> dict:
        status, resp = self.pedir("POST", "/api/espacios", {"nombre": ESPACIO_DEMO, "tipo": "aula", "aforo": 20})
        if status != 201:
            resp = self.exigir("GET", "/api/espacios/sala-demo-errores")
        return {**resp, "aforo_permitido": int(resp["aforo"] * self.reglas["factor_aforo"])}

    def errores_reservas(self) -> None:
        r = self.reglas
        apertura, cierre, max_h = r["hora_apertura"], r["hora_cierre"], r["max_horas_reserva"]
        duracion = min(2, max_h)
        espacio, base, dia = self._reserva_base(apertura, duracion)
        eid, nombre, permitido = espacio["id"], espacio["nombre"], espacio["aforo_permitido"]
        ayer = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
        hora_base = f"{apertura}:00–{apertura + duracion}:00"
        self.salida(f"(Reserva base #{base['id']}: '{nombre}' el {dia:%Y-%m-%d} de {hora_base}, 2 personas)")

        def reserva(inicio: str, fin: str, asistentes: int = 1, espacio_id: str = eid) -> dict:
            return {"espacio_id": espacio_id, "solicitante": SOLICITANTE, "inicio": inicio, "fin": fin, "asistentes": asistentes}

        self.probar(
            "RN-01", "Reserva que se cruza con otra", "POST", "/api/reservas",
            reserva(self._hora(dia, apertura + 0.5), self._hora(dia, apertura + 1.5)),
            f"'{nombre}' ya tiene la reserva #{base['id']} de {hora_base}. RN-01 impide dos reservas activas del "
            "mismo espacio cuyos horarios se crucen; los intervalos son [inicio, fin), así que sí se puede "
            "empezar justo cuando termina la otra.",
        )
        self.probar(
            "RN-02", "Más asistentes que el aforo permitido", "POST", "/api/reservas",
            reserva(self._hora(dia, apertura), self._hora(dia, apertura + 1), permitido + 1),
            f"'{nombre}' tiene aforo {espacio['aforo']} y con FACTOR_AFORO={r['factor_aforo']} admite "
            f"{permitido} personas; se pidieron {permitido + 1}. RN-02 protege la seguridad y la capacidad real del espacio.",
        )
        self.probar(
            "RN-02", "Bajar el aforo por debajo de una reserva futura", "PATCH", f"/api/espacios/{eid}", {"aforo": 1},
            f"La reserva #{base['id']} ya tiene 2 asistentes. Si el aforo bajara a 1, esa reserva quedaría "
            "violando RN-02, así que el cambio se rechaza y el espacio no se modifica.",
        )
        self.probar(
            "RN-05", "La hora de fin es anterior a la de inicio", "POST", "/api/reservas",
            reserva(self._hora(dia, apertura + 2), self._hora(dia, apertura + 1)),
            "Un intervalo con fin ≤ inicio no tiene duración: no representa una reserva real.",
        )
        self.probar(
            "RN-05", "Reserva en una fecha que ya pasó", "POST", "/api/reservas",
            reserva(self._hora(ayer, apertura + 1), self._hora(ayer, apertura + 2)),
            "No tiene sentido reservar el pasado: RN-05 compara el inicio con la hora actual del servidor.",
        )
        if apertura > 0:
            self.probar(
                "RN-05", "Reserva antes de que abra el campus", "POST", "/api/reservas",
                reserva(self._hora(dia, apertura - 1), self._hora(dia, apertura + 0.5)),
                f"El campus abre a las {apertura}:00 (HORA_APERTURA) y cierra a las {cierre}:00 (HORA_CIERRE); "
                "la reserva empieza antes de abrir.",
            )
        if apertura + max_h + 1 <= cierre:
            self.probar(
                "RN-05", "Reserva más larga de lo permitido", "POST", "/api/reservas",
                reserva(self._hora(dia, apertura), self._hora(dia, apertura + max_h + 1)),
                f"Se pidieron {max_h + 1} horas y MAX_HORAS_RESERVA={max_h}. El límite reparte los espacios "
                "entre más personas.",
            )
        self.probar(
            "RN-05", "Reserva que termina otro día", "POST", "/api/reservas",
            reserva(self._hora(dia, cierre - 1), self._hora(dia + timedelta(days=1), apertura + 1)),
            "Una reserva empieza y termina el mismo día: el campus cierra de noche.",
        )

        self.exigir("PATCH", f"/api/espacios/{eid}", {"estado": "mantenimiento"})
        self.deshacer_luego(f"devolver '{nombre}' a disponible", lambda: self.exigir("PATCH", f"/api/espacios/{eid}", {"estado": "disponible"}))
        self.probar(
            "RN-04", "Reservar un espacio en mantenimiento", "POST", "/api/reservas",
            reserva(self._hora(dia, apertura + duracion), self._hora(dia, apertura + duracion + 1)),
            f"Se pasó '{nombre}' a mantenimiento solo para esta prueba. RN-04 no deja reservar un espacio "
            "fuera de servicio ni uno con una incidencia abierta de prioridad bloqueante "
            f"({', '.join(r['prioridades_bloqueantes'])}).",
        )
        self._restaurar_ultimo()

        self.probar(
            "ERR-404", "Reservar un espacio que no existe", "POST", "/api/reservas",
            reserva(self._hora(dia, apertura), self._hora(dia, apertura + 1), espacio_id="no-existe"),
            "El espacio 'no-existe' no está en la BD: la API responde 404 en vez de un error genérico.",
        )
        self.probar(
            "ERR-422", "Datos con formato inválido", "POST", "/api/reservas",
            reserva(self._hora(dia, apertura), self._hora(dia, apertura + 1), 0),
            "La petición no cumple el esquema (asistentes debe ser mayor que 0). Se rechaza antes de llegar "
            "a las reglas y 'detalles' indica el campo exacto.",
        )

        self.exigir("POST", f"/api/reservas/{base['id']}/cancelar")
        self.probar(
            "ERR-409", "Cancelar una reserva ya cancelada", "POST", f"/api/reservas/{base['id']}/cancelar", None,
            f"La reserva #{base['id']} se acaba de cancelar; una reserva solo se cancela una vez para que la "
            "auditoría no registre cambios falsos.",
        )

    def _restaurar_ultimo(self) -> None:
        que, accion = self._deshacer.pop()
        accion()

    # ---------- Recursos: RN-03, RN-04, RN-06, RN-07 ----------

    def _recursos_demo(self, cuantos: int) -> list[str]:
        """Recursos DEMO-ERR-* en 'disponible'. Crea los que falten y repara los que quedaron en otro estado."""
        listos, i = [], 1
        while len(listos) < cuantos:
            rid = f"{PREFIJO_RECURSO}{i:02d}"
            i += 1
            status, rec = self.pedir("GET", f"/api/recursos/{rid}", None)
            if status == 404:
                rec = self.exigir("POST", "/api/recursos", {"id": rid, "tipo": "portatil", "nombre": f"Portátil demo {rid[-2:]}"})
            if rec["estado"] == "danado":
                rec = self.exigir("PATCH", f"/api/recursos/{rid}/estado", {"estado": "mantenimiento", "motivo": "demo de errores"})
            if rec["estado"] == "mantenimiento":
                rec = self.exigir("PATCH", f"/api/recursos/{rid}/estado", {"estado": "disponible", "motivo": "demo de errores"})
            if rec["estado"] == "disponible":
                listos.append(rid)
        return listos

    def _prestar(self, rid: str, solicitante: str) -> dict:
        devolucion = (datetime.now() + timedelta(days=1)).isoformat(timespec="minutes")
        p = self.exigir("POST", "/api/prestamos", {"recurso_id": rid, "solicitante": solicitante, "devolucion_esperada": devolucion})
        self.deshacer_luego(f"devolver el préstamo #{p['id']}", lambda i=p["id"]: self.pedir(
            "POST", f"/api/prestamos/{i}/devolucion", {"estado_recurso": "disponible"}))
        return p

    def errores_prestamos(self) -> None:
        r = self.reglas
        maximo = r["max_prestamos_activos"]
        recursos = self._recursos_demo(max(maximo + 1, 2))
        r1 = recursos[0]
        manana = (datetime.now() + timedelta(days=1)).isoformat(timespec="minutes")
        hace_una_hora = (datetime.now() - timedelta(hours=1)).isoformat(timespec="minutes")

        def prestamo(rid: str, solicitante: str = SOLICITANTE, devolucion: str = manana) -> dict:
            return {"recurso_id": rid, "solicitante": solicitante, "devolucion_esperada": devolucion}

        self.probar(
            "RN-03", "Transición de estado no permitida", "PATCH", f"/api/recursos/{r1}/estado", {"estado": "danado"},
            "La máquina de estados de RN-03 solo deja pasar de 'disponible' a prestado, mantenimiento o baja. "
            "Un recurso se marca 'danado' al devolverlo así, no desde el inventario.",
        )
        self.probar(
            "RN-03", "Marcar 'prestado' a mano", "PATCH", f"/api/recursos/{r1}/estado", {"estado": "prestado"},
            "'prestado' solo cambia al registrar un préstamo o su devolución. Si se pudiera poner a mano, el "
            "inventario y la tabla de préstamos se contradirían.",
        )

        self.exigir("PATCH", f"/api/recursos/{r1}/estado", {"estado": "mantenimiento", "motivo": "demo de errores"})
        self.deshacer_luego(f"devolver {r1} a disponible", lambda: self.exigir(
            "PATCH", f"/api/recursos/{r1}/estado", {"estado": "disponible", "motivo": "demo de errores"}))
        self.probar(
            "RN-04", "Prestar un recurso en mantenimiento", "POST", "/api/prestamos", prestamo(r1),
            f"Se pasó {r1} a mantenimiento solo para esta prueba. RN-04 no presta recursos en mantenimiento, "
            "dañados o dados de baja, ni con una incidencia abierta de prioridad bloqueante.",
        )
        self._restaurar_ultimo()

        self.probar(
            "RN-06", "Devolución esperada anterior a la salida", "POST", "/api/prestamos", prestamo(r1, devolucion=hace_una_hora),
            "La salida es ahora y la devolución esperada fue hace una hora: un préstamo no puede vencer antes de empezar.",
        )

        prestamos = [self._prestar(rid, SOLICITANTE) for rid in recursos[:maximo]]
        self.probar(
            "RN-06", "Superar el límite de préstamos activos", "POST", "/api/prestamos", prestamo(recursos[maximo]),
            f"'{SOLICITANTE}' ya tiene {maximo} préstamo(s) activo(s) y MAX_PRESTAMOS_ACTIVOS={maximo}. "
            "El límite evita que una sola persona acapare el equipo. Se compara sin mayúsculas ni tildes: "
            "'ana pérez' y 'Ana Perez' cuentan como la misma persona.",
        )
        if not prestamos:  # MAX_PRESTAMOS_ACTIVOS = 0: no hay préstamo con el que seguir
            return
        self.probar(
            "RN-03", "Prestar un recurso que ya está prestado", "POST", "/api/prestamos", prestamo(r1, SOLICITANTE_2),
            f"{r1} está en 'prestado' (préstamo #{prestamos[0]['id']}). Solo un recurso 'disponible' puede pasar a "
            "'prestado', así un mismo equipo nunca está en dos manos.",
        )

        p1 = prestamos[0]
        devolucion = f"/api/prestamos/{p1['id']}/devolucion"
        self.probar(
            "RN-07", "Devolver a un estado inválido", "POST", devolucion, {"estado_recurso": "mantenimiento"},
            "Desde 'prestado' un recurso solo vuelve 'disponible' o 'danado' (RN-03). Si necesita revisión, "
            "se devuelve 'danado' y luego se pasa a mantenimiento.",
        )
        salida = datetime.fromisoformat(p1["salida"])
        self.probar(
            "RN-07", "Fecha de devolución anterior a la salida", "POST", devolucion,
            {"estado_recurso": "disponible", "fecha": (salida - timedelta(days=1)).isoformat(timespec="minutes")},
            f"El préstamo salió el {salida:%Y-%m-%d %H:%M}; no puede devolverse un día antes.",
        )
        self.exigir("POST", devolucion, {"estado_recurso": "disponible"})
        self.probar(
            "RN-07", "Devolver dos veces el mismo préstamo", "POST", devolucion, {"estado_recurso": "disponible"},
            f"El préstamo #{p1['id']} se acaba de devolver. Una segunda devolución duplicaría el movimiento y "
            "podría liberar un equipo que ya se volvió a prestar.",
        )
        self.probar(
            "ERR-404", "Devolver un préstamo que no existe", "POST", "/api/prestamos/999999999/devolucion",
            {"estado_recurso": "disponible"},
            "No hay ningún préstamo #999999999: la API responde 404 con el mismo formato {codigo, mensaje}.",
        )


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="URL base de la API")
    parser.add_argument("--solo", help="mostrar solo los casos cuyo código empiece así (RN-01, RN-0, ERR)")
    args = parser.parse_args()

    demo = Demo(pedir_http(args.url), solo=args.solo)
    try:
        todo_bien = demo.ejecutar()
    except urllib.error.URLError as e:
        print(f"✗ No se pudo conectar con {args.url} ({e.reason}). Arranca la API: uvicorn app.main:app --reload")
        sys.exit(2)
    except FalloPreparacion as e:
        print(f"✗ Falló una petición de preparación: {e}")
        sys.exit(2)
    sys.exit(0 if todo_bien else 1)


if __name__ == "__main__":
    main()
