"""Usuario de la petición en curso, para que la auditoría registre quién hizo cada cambio."""
from contextvars import ContextVar

actor_actual: ContextVar[str | None] = ContextVar("actor_actual", default=None)
