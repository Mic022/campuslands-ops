"""Limitación de intentos en memoria (ventana deslizante) contra fuerza bruta.

Cuenta fallos por identificador escrito (exista o no la cuenta, para no revelar cuáles
existen) y por IP. Complementa el bloqueo persistente de la cuenta en la tabla usuarios.
En un despliegue con varias instancias se reemplazaría por Redis.
"""
import threading
import time
from collections import defaultdict, deque


class Limitador:
    def __init__(self) -> None:
        self._eventos: dict[str, deque[float]] = defaultdict(deque)
        self._candado = threading.Lock()

    def _purgar(self, clave: str, ventana_s: float, ahora: float) -> deque[float]:
        cola = self._eventos[clave]
        while cola and cola[0] <= ahora - ventana_s:
            cola.popleft()
        return cola

    def excedido(self, clave: str, maximo: int, ventana_s: float) -> float:
        """Segundos que faltan para poder reintentar (0 si no está limitado)."""
        with self._candado:
            ahora = time.monotonic()
            cola = self._purgar(clave, ventana_s, ahora)
            if len(cola) < maximo:
                return 0.0
            return max(0.0, cola[0] + ventana_s - ahora)

    def registrar(self, clave: str) -> None:
        with self._candado:
            self._eventos[clave].append(time.monotonic())

    def limpiar(self, clave: str) -> None:
        with self._candado:
            self._eventos.pop(clave, None)

    def reiniciar(self) -> None:
        with self._candado:
            self._eventos.clear()


limitador = Limitador()
