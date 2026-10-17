"""Tablas de la base de datos.

Los estados se guardan como texto con los valores de config/catalogos.py;
los esquemas de entrada validan que estén dentro del catálogo. Así, agregar
un valor en la modificación en vivo no exige migrar la BD.
"""
from datetime import datetime

from sqlmodel import Field, SQLModel


def ahora() -> datetime:
    return datetime.now().replace(microsecond=0)


class Espacio(SQLModel, table=True):
    __tablename__ = "espacios"

    id: str = Field(primary_key=True)                  # slug del nombre: "auditorio", "cosmos"
    nombre: str = Field(unique=True)
    tipo: str                                          # TipoEspacio
    aforo: int
    estado: str = "disponible"                         # EstadoEspacio
    ubicacion: str | None = None


class Recurso(SQLModel, table=True):
    __tablename__ = "recursos"

    id: str = Field(primary_key=True)
    tipo: str                                          # portátil, videobeam, ...
    nombre: str | None = None
    serial: str | None = Field(default=None, unique=True)
    estado: str = "disponible"                         # EstadoRecurso
    espacio_id: str | None = Field(default=None, foreign_key="espacios.id")


class Reserva(SQLModel, table=True):
    __tablename__ = "reservas"

    id: int | None = Field(default=None, primary_key=True)
    espacio_id: str = Field(foreign_key="espacios.id", index=True)
    solicitante: str
    inicio: datetime
    fin: datetime
    asistentes: int
    estado: str = "activa"                             # EstadoReserva
    creada_en: datetime = Field(default_factory=ahora)


class Prestamo(SQLModel, table=True):
    __tablename__ = "prestamos"

    id: int | None = Field(default=None, primary_key=True)
    recurso_id: str = Field(foreign_key="recursos.id", index=True)
    solicitante: str = Field(index=True)
    salida: datetime
    devolucion_esperada: datetime
    devolucion_real: datetime | None = None
    estado: str = "activo"                             # EstadoPrestamo


class Incidencia(SQLModel, table=True):
    __tablename__ = "incidencias"

    id: int | None = Field(default=None, primary_key=True)
    titulo: str
    descripcion: str
    categoria: str | None = None                       # Categoria (None mientras está pendiente de triaje)
    prioridad: str | None = None                       # Prioridad
    area_responsable: str | None = None                # Area
    estado: str = "abierta"                            # EstadoIncidencia
    espacio_id: str | None = Field(default=None, foreign_key="espacios.id", index=True)
    recurso_id: str | None = Field(default=None, foreign_key="recursos.id", index=True)
    origen_triaje: str = "pendiente"                   # OrigenTriaje
    confianza_ia: float | None = None
    justificacion_ia: str | None = None
    creada_en: datetime = Field(default_factory=ahora)
    resuelta_en: datetime | None = None


class Auditoria(SQLModel, table=True):
    __tablename__ = "auditoria"

    id: int | None = Field(default=None, primary_key=True)
    entidad: str = Field(index=True)                   # "espacio", "recurso", "reserva", ...
    entidad_id: str = Field(index=True)
    accion: str                                        # "crear", "cambiar_estado", "ingesta", ...
    estado_anterior: str | None = None
    estado_nuevo: str | None = None
    actor: str = "sistema"
    detalle: str | None = None
    fecha: datetime = Field(default_factory=ahora)


class LlamadaIA(SQLModel, table=True):
    __tablename__ = "llamadas_ia"

    id: int | None = Field(default=None, primary_key=True)
    tipo: str                                          # "triaje", ...
    modelo: str | None = None
    latencia_ms: int | None = None
    valida: bool
    error: str | None = None
    fecha: datetime = Field(default_factory=ahora)


class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    usuario: str = Field(primary_key=True)             # nombre de inicio de sesión (minúsculas)
    nombre: str                                        # con el que figura como solicitante y en la auditoría
    rol: str                                           # config/permisos.py: admin | usuario
    clave_hash: str                                    # Argon2id (o PBKDF2 heredado); nunca la clave en claro
    activo: bool = True
    # Columnas agregadas por app/migraciones.py en bases existentes (por eso todas admiten NULL).
    email: str | None = Field(default=None, unique=True, index=True)   # minúsculas; para recuperar la clave
    intentos_fallidos: int | None = 0
    bloqueado_hasta: datetime | None = None
    ultimo_acceso: datetime | None = None
    creado_en: datetime | None = Field(default_factory=ahora)


class Sesion(SQLModel, table=True):
    """Sesión del servidor. La cookie lleva un token aleatorio; aquí solo se guarda su SHA-256."""

    __tablename__ = "sesiones"

    id: int | None = Field(default=None, primary_key=True)
    token_hash: str = Field(unique=True, index=True)
    csrf_token: str                                    # token sincronizador para métodos que escriben
    usuario: str = Field(foreign_key="usuarios.usuario", index=True)
    recordar: bool = False
    creada_en: datetime = Field(default_factory=ahora)
    ultima_actividad: datetime = Field(default_factory=ahora)
    expira_en: datetime
    revocada_en: datetime | None = None
    ip: str | None = None


class TokenRecuperacion(SQLModel, table=True):
    """Enlace de recuperación de contraseña: un solo uso y con caducidad. Solo se guarda el hash."""

    __tablename__ = "tokens_recuperacion"

    id: int | None = Field(default=None, primary_key=True)
    token_hash: str = Field(unique=True, index=True)
    usuario: str = Field(foreign_key="usuarios.usuario", index=True)
    creado_en: datetime = Field(default_factory=ahora)
    expira_en: datetime
    usado_en: datetime | None = None
