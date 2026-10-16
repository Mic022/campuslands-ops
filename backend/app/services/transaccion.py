"""Serializa las operaciones que validan y luego escriben.

Una reserva o un préstamo leen el estado actual (reservas del día, estado del
recurso), validan las reglas y luego escriben. Si dos peticiones llegan a la vez
(doble clic, dos usuarios), ambas podrían validar contra el mismo estado y pasar.
El candado hace que "validar + escribir + commit" ocurra de a una petición a la vez
dentro del proceso; SQLite, además, solo admite un escritor simultáneo.
"""
import threading
from collections.abc import Iterator
from contextlib import contextmanager

from sqlmodel import Session

_candado = threading.Lock()


@contextmanager
def escritura(db: Session) -> Iterator[Session]:
    """Ejecuta el bloque en exclusión mutua y hace commit al final o rollback si falla."""
    with _candado:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
