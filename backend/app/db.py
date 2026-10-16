"""Conexión a SQLite y sesiones."""
from collections.abc import Iterator

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _activar_foreign_keys(dbapi_conn, _):
    # En SQLite las claves foráneas vienen apagadas por defecto.
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()


def crear_tablas() -> None:
    import app.models  # noqa: F401  registra los modelos en el metadata

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
