"""Arranque de la API y manejadores globales de errores."""
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth.dependencias import CABECERA_CSRF, METODOS_SEGUROS

from app.ai.proveedor import ErrorProveedor
from app.auth.dependencias import autorizar
from app.config import catalogos, settings
from app.config import reglas as cfg
from app.db import crear_tablas, engine
from app.rules.base import (
    DemasiadosIntentosError,
    NoAutenticadoError,
    NoEncontradoError,
    PermisoError,
    ReglaNegocioError,
)

log = logging.getLogger("campus-ops")


@asynccontextmanager
async def lifespan(_: FastAPI):
    from sqlmodel import Session

    from app.services.auth import sembrar_usuarios

    crear_tablas()
    with Session(engine) as db:
        for usuario, clave in sembrar_usuarios(db).items():
            log.warning("Usuario '%s' creado con clave generada: %s (define las claves en .env)", usuario, clave)
    yield


# autorizar aplica config/permisos.py a todas las rutas (públicas, cualquier usuario o solo admin).
app = FastAPI(
    title="Campus Ops — Sistema Central de Gestión Operativa",
    lifespan=lifespan,
    dependencies=[Depends(autorizar)],
    # En producción no se publica la documentación interactiva de la API.
    docs_url=None if settings.ES_PRODUCCION else "/docs",
    redoc_url=None if settings.ES_PRODUCCION else "/redoc",
    openapi_url=None if settings.ES_PRODUCCION else "/openapi.json",
)

# CORS restrictivo: solo el frontend configurado, con credenciales (cookie de sesión).
ORIGENES_PERMITIDOS = {settings.CORS_ORIGIN.rstrip("/"), settings.APP_URL}
if not settings.ES_PRODUCCION:
    # Vite en desarrollo puede abrirse como localhost o como 127.0.0.1.
    ORIGENES_PERMITIDOS |= {"http://localhost:5173", "http://127.0.0.1:5173"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ORIGENES_PERMITIDOS),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Content-Type", CABECERA_CSRF],
)


@app.middleware("http")
async def _seguridad_http(request: Request, call_next):
    """Rechaza escrituras desde otros orígenes (CSRF, también en login) y añade cabeceras de seguridad."""
    origen = request.headers.get("origin")
    if (
        request.method not in METODOS_SEGUROS
        and origen
        and origen.rstrip("/") not in ORIGENES_PERMITIDOS | {f"{request.url.scheme}://{request.url.netloc}"}
    ):
        return JSONResponse(status_code=403, content={"codigo": "AUTH-ORIGEN", "mensaje": "Origen no permitido."})
    respuesta = await call_next(request)
    respuesta.headers.setdefault("X-Content-Type-Options", "nosniff")
    respuesta.headers.setdefault("X-Frame-Options", "DENY")
    respuesta.headers.setdefault("Referrer-Policy", "same-origin")
    if request.url.path.startswith(("/api/auth", "/api/admin")):
        respuesta.headers["Cache-Control"] = "no-store"
    return respuesta


# ---------- Manejadores de errores: nunca stack traces al cliente ----------

@app.exception_handler(ReglaNegocioError)
async def _regla(request: Request, exc: ReglaNegocioError):
    r = exc.resultado
    return JSONResponse(status_code=409, content={"codigo": r.codigo, "mensaje": r.mensaje})


@app.exception_handler(NoAutenticadoError)
async def _no_autenticado(request: Request, exc: NoAutenticadoError):
    return JSONResponse(status_code=401, content={"codigo": exc.codigo, "mensaje": str(exc)})


@app.exception_handler(PermisoError)
async def _sin_permiso(request: Request, exc: PermisoError):
    return JSONResponse(status_code=403, content={"codigo": exc.codigo, "mensaje": str(exc)})


@app.exception_handler(DemasiadosIntentosError)
async def _demasiados_intentos(request: Request, exc: DemasiadosIntentosError):
    return JSONResponse(
        status_code=429,
        content={"codigo": exc.codigo, "mensaje": str(exc)},
        headers={"Retry-After": str(exc.reintentar_en_s)},
    )


@app.exception_handler(NoEncontradoError)
async def _no_encontrado(request: Request, exc: NoEncontradoError):
    return JSONResponse(status_code=404, content={"codigo": "ERR-404", "mensaje": str(exc)})


# Mensajes legibles para los formatos de los formularios de acceso (el resto usa el de Pydantic).
MENSAJES_FORMATO = {
    "email": "El correo electrónico no tiene un formato válido.",
    "usuario": "Usa de 3 a 32 caracteres: letras, números, punto, guion o guion bajo.",
}


def _mensaje_validacion(campo: str, error: dict) -> str:
    if error["type"] == "string_pattern_mismatch" and campo in MENSAJES_FORMATO:
        return MENSAJES_FORMATO[campo]
    if error["type"] == "extra_forbidden":
        return "Campo no permitido."
    return error["msg"]


@app.exception_handler(RequestValidationError)
async def _validacion(request: Request, exc: RequestValidationError):
    detalles = []
    for e in exc.errors():
        campo = ".".join(str(p) for p in e["loc"][1:])
        detalles.append({"campo": campo, "mensaje": _mensaje_validacion(campo, e)})
    return JSONResponse(
        status_code=422,
        content={"codigo": "ERR-422", "mensaje": "Datos inválidos", "detalles": detalles},
    )


@app.exception_handler(ErrorProveedor)
async def _ia_caida(request: Request, exc: ErrorProveedor):
    return JSONResponse(
        status_code=503,
        content={"codigo": "IA-503", "mensaje": f"IA no disponible: {exc}. Usa el triaje manual."},
    )


@app.exception_handler(Exception)
async def _inesperado(request: Request, exc: Exception):
    log.exception("Error no controlado")
    return JSONResponse(
        status_code=500,
        content={"codigo": "ERR-500", "mensaje": "Ocurrió un error inesperado. Intenta de nuevo."},
    )


# ---------- Rutas base ----------

@app.get("/api/health")
def health():
    return {"estado": "ok"}


@app.get("/api/catalogos")
def get_catalogos():
    return catalogos.como_dict()


@app.get("/api/reglas")
def get_reglas():
    """Parámetros de negocio vigentes, para que la UI los muestre sin duplicarlos."""
    return {
        "hora_apertura": cfg.HORA_APERTURA,
        "hora_cierre": cfg.HORA_CIERRE,
        "max_horas_reserva": cfg.MAX_HORAS_RESERVA,
        "factor_aforo": cfg.FACTOR_AFORO,
        "max_prestamos_activos": cfg.MAX_PRESTAMOS_ACTIVOS,
        "prioridades_bloqueantes": sorted(cfg.PRIORIDADES_BLOQUEANTES),
        "umbral_confianza_ia": cfg.UMBRAL_CONFIANZA_IA,
        "max_largo_descripcion": cfg.MAX_LARGO_DESCRIPCION,
    }


# Los routers de cada módulo se registran aquí (una línea por módulo):
from app.api import admin, auth, datos, espacios, incidencias, recursos  # noqa: E402

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(datos.router)
app.include_router(espacios.router)
app.include_router(recursos.router)
app.include_router(incidencias.router)
